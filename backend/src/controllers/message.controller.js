import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketIds, io } from "../lib/socket.js";
import { filterAbusiveWords } from "../lib/profanity.js";
import { sendWebPush } from "../lib/push.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const myId = loggedInUserId.toString();

    const conversationMessages = await Message.find({
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    })
      .select("senderId receiverId text image createdAt")
      .sort({ createdAt: -1 });

    const participantIds = [];
    const latestMessageByUser = new Map();
    const seen = new Set();

    for (const message of conversationMessages) {
      const senderId = message.senderId.toString();
      const receiverId = message.receiverId.toString();
      const otherUserId = senderId === myId ? receiverId : senderId;

      if (!seen.has(otherUserId)) {
        seen.add(otherUserId);
        participantIds.push(otherUserId);
        latestMessageByUser.set(otherUserId, {
          latestMessage: message.text || (message.image ? "📷 Photo" : "Message"),
          latestMessageAt: message.createdAt,
          latestMessageSenderId: senderId,
        });
      }
    }

    if (participantIds.length === 0) {
      return res.status(200).json([]);
    }

    // Count unread messages from each sender
    const unreadCountByUser = new Map();
    const unreadMessages = await Message.find({
      receiverId: loggedInUserId,
      status: { $ne: "read" },
    }).select("senderId");

    for (const message of unreadMessages) {
      const senderId = message.senderId.toString();
      unreadCountByUser.set(senderId, (unreadCountByUser.get(senderId) || 0) + 1);
    }

    const participants = await User.find({ _id: { $in: participantIds } }).select("-password");
    const participantMap = new Map(participants.map((user) => [user._id.toString(), user]));
    const orderedParticipants = participantIds
      .map((id) => {
        const user = participantMap.get(id);
        if (!user) return null;

        const latestMeta = latestMessageByUser.get(id);
        return {
          ...user.toObject(),
          latestMessage: latestMeta?.latestMessage || "",
          latestMessageAt: latestMeta?.latestMessageAt || null,
          latestMessageSenderId: latestMeta?.latestMessageSenderId || null,
          unreadCount: unreadCountByUser.get(id) || 0,
        };
      })
      .filter(Boolean);

    res.status(200).json(orderedParticipants);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllUsersForNewChat = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getAllUsersForNewChat: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Filter abusive words
    const filteredText = text ? filterAbusiveWords(text) : text;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: filteredText,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketIds = getReceiverSocketIds(receiverId.toString());
    
    // If receiver is online, immediately mark as delivered
    if (receiverSocketIds.length > 0) {
      newMessage.status = "delivered";
      newMessage.deliveredAt = new Date();
      await newMessage.save();

      const messageData = {
        _id: newMessage._id,
        senderId: senderId.toString(),
        senderName: req.user.fullName,
        receiverId: receiverId.toString(),
        message: filteredText || "",
        text: filteredText || "",
        image: imageUrl || null,
        timestamp: newMessage.createdAt,
        createdAt: newMessage.createdAt,
        status: newMessage.status,
        deliveredAt: newMessage.deliveredAt,
        readAt: newMessage.readAt,
        isEdited: newMessage.isEdited,
      };

      receiverSocketIds.forEach((socketId) => {
        io.to(socketId).emit("receive_message", messageData);
      });
      
      // Notify sender that message was delivered
      const senderSocketIds = getReceiverSocketIds(senderId.toString());
      senderSocketIds.forEach((socketId) => {
        io.to(socketId).emit("messageStatusUpdated", {
          messageId: newMessage._id,
          status: "delivered",
          deliveredAt: newMessage.deliveredAt,
        });
      });
    } else {
      const receiver = await User.findById(receiverId).select("pushSubscriptions");
      const senderName = req.user.fullName || "New message";
      const body =
        filteredText?.trim() || (imageUrl ? "Sent you an image" : "Sent you a message");

      console.log("[PUSH] Receiver offline, checking for", receiverId, "push subscriptions");

      if (receiver?.pushSubscriptions?.length) {
        console.log("[PUSH] Found", receiver.pushSubscriptions.length, "subscriptions for offline receiver");
        const invalidEndpoints = [];

        await Promise.all(
          receiver.pushSubscriptions.map(async (subscription) => {
            try {
              await sendWebPush(subscription, {
                title: senderName,
                body,
                icon: "/CX.png",
                badge: "/CX.png",
                data: {
                  senderId: senderId.toString(),
                  senderName,
                  receiverId: receiverId.toString(),
                  messageId: newMessage._id.toString(),
                  url: "/",
                },
              });
            } catch (pushError) {
              const statusCode = pushError?.statusCode;
              if (statusCode === 404 || statusCode === 410) {
                invalidEndpoints.push(subscription.endpoint);
              }
            }
          })
        );

        if (invalidEndpoints.length > 0) {
          await User.findByIdAndUpdate(receiverId, {
            $pull: {
              pushSubscriptions: {
                endpoint: { $in: invalidEndpoints },
              },
            },
          });
        }
      } else {
        console.log("[PUSH] Receiver", receiverId, "has no push subscriptions");
      }
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const filteredText = text ? filterAbusiveWords(text) : text;
    message.text = filteredText;
    message.isEdited = true;
    await message.save();

    const receiverSocketIds = getReceiverSocketIds(message.receiverId.toString());
    receiverSocketIds.forEach((socketId) => {
      io.to(socketId).emit("messageEdited", message);
    });

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in editMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    await Message.findByIdAndDelete(messageId);

    const receiverSocketIds = getReceiverSocketIds(message.receiverId.toString());
    receiverSocketIds.forEach((socketId) => {
      io.to(socketId).emit("messageDeleted", { messageId });
    });

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.log("Error in deleteMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    if (!["sent", "delivered", "read"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Only the receiver can update message status to delivered/read
    if (message.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    message.status = status;
    if (status === "delivered" && !message.deliveredAt) {
      message.deliveredAt = new Date();
    }
    if (status === "read" && !message.readAt) {
      message.readAt = new Date();
    }

    await message.save();

    const senderSocketIds = getReceiverSocketIds(message.senderId.toString());
    senderSocketIds.forEach((socketId) => {
      io.to(socketId).emit("messageStatusUpdated", {
        messageId: message._id,
        status: message.status,
        deliveredAt: message.deliveredAt,
        readAt: message.readAt,
      });
    });

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in updateMessageStatus controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessagesAsDelivered = async (req, res) => {
  try {
    const { senderId } = req.params;
    const receiverId = req.user._id;

    const messages = await Message.updateMany(
      {
        senderId,
        receiverId,
        status: "sent",
      },
      {
        status: "delivered",
        deliveredAt: new Date(),
      }
    );

    // Notify the sender about delivery status
    const senderSocketIds = getReceiverSocketIds(senderId.toString());
    senderSocketIds.forEach((socketId) => {
      io.to(socketId).emit("messagesDelivered", {
        senderId,
        receiverId,
      });
    });

    res.status(200).json({ message: "Messages marked as delivered" });
  } catch (error) {
    console.log("Error in markMessagesAsDelivered controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

