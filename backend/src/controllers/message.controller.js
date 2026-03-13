import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketIds, io } from "../lib/socket.js";
import { filterAbusiveWords } from "../lib/profanity.js";
import { sendWebPush } from "../lib/push.js";

const DOC_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "txt",
  "csv",
  "odt",
  "ods",
  "odp",
]);

const sanitizeDownloadName = (filename = "download") => {
  const base = String(filename)
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  return base || "download";
};

const getExtensionFromName = (filename = "") => {
  const lastPart = String(filename).split(".").pop();
  return lastPart ? lastPart.toLowerCase() : "";
};

const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "m4v",
  "flv",
  "wmv",
]);

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
  "tiff",
  "avif",
]);

const buildLatestMessagePreview = (message) => {
  if (message?.text) return message.text;

  if (message?.file?.type === "video") return "📹 Video";

  if (message?.file?.type === "document") {
    const fileName = message.file?.name || "Document";
    if (fileName.toLowerCase().endsWith(".zip")) {
      return "📁 Folder";
    }
    return "📄 " + fileName;
  }

  if (message?.image || message?.file) return "📷 Photo";

  return "Message";
};

// Build Cloudinary URL as .../upload/fl_attachment:fileName/v123/public_id
const buildCloudinaryAttachmentUrl = (inputUrl, safeFilename, forcedResourceType) => {
  try {
    const parsedUrl = new URL(inputUrl);
    const segments = parsedUrl.pathname.split("/").filter(Boolean);

    const uploadIdx = segments.findIndex((s) => s === "upload");
    if (uploadIdx < 2) return null;

    const cloudName = segments[0];
    const currentResourceType = segments[1] || "image";
    const deliveryType = segments[2] || "upload";
    if (deliveryType !== "upload") return null;

    const afterUpload = segments.slice(uploadIdx + 1);
    const versionIdx = afterUpload.findIndex((s) => /^v\d+$/.test(s));
    let versionPart = versionIdx >= 0 ? afterUpload[versionIdx] : null;
    let publicIdParts = versionIdx >= 0 ? afterUpload.slice(versionIdx + 1) : [];

    // If no version segment is present, strip transformation-like segments.
    if (!versionPart) {
      const firstLikelyPublicIdIdx = afterUpload.findIndex(
        (segment) => !segment.includes(",") && !segment.includes(":")
      );

      if (firstLikelyPublicIdIdx >= 0) {
        publicIdParts = afterUpload.slice(firstLikelyPublicIdIdx);
      }
    }

    if (!publicIdParts.length) return null;

    const resourceType = forcedResourceType || currentResourceType;
    const attachmentPart = `fl_attachment:${encodeURIComponent(safeFilename)}`;
    const rebuiltPath = ["", cloudName, resourceType, "upload", attachmentPart];

    if (versionPart) rebuiltPath.push(versionPart);
    rebuiltPath.push(...publicIdParts);

    parsedUrl.pathname = rebuiltPath.join("/");
    return parsedUrl.toString();
  } catch {
    return null;
  }
};

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const myId = loggedInUserId.toString();

    const conversationMessages = await Message.find({
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    })
      .select("senderId receiverId text image file createdAt")
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
          latestMessage: buildLatestMessagePreview(message),
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
    const { text, image, file, fileName, fileSize } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Filter abusive words
    const filteredText = text ? filterAbusiveWords(text) : text;

    let imageUrl;
    let fileData;

    // Handle legacy image field (backward compat)
    if (image && !file) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Handle new multi-media file upload
    if (file) {
      const fileExt = getExtensionFromName(fileName || "");
      const uploadResourceType = DOC_EXTENSIONS.has(fileExt)
        ? "raw"
        : VIDEO_EXTENSIONS.has(fileExt)
          ? "video"
          : IMAGE_EXTENSIONS.has(fileExt)
            ? "image"
            : "auto";

      const uploadResponse = await cloudinary.uploader.upload(file, {
        resource_type: uploadResourceType,
      });

      const url = uploadResponse.secure_url;
      const detectedFormat = uploadResponse.format || "";
      const resourceType = uploadResponse.resource_type || "";

      // Determine file type — check documents FIRST since Cloudinary
      // classifies PDFs as resource_type "image" (it can rasterize them)
      let fileType = "document";
      const docFormats = Array.from(DOC_EXTENSIONS);
      const videoFormats = Array.from(VIDEO_EXTENSIONS);
      const imageFormats = Array.from(IMAGE_EXTENSIONS);

      // Also extract extension from original filename for extra safety
      const formatLower = detectedFormat.toLowerCase();

      if (docFormats.includes(formatLower) || docFormats.includes(fileExt)) {
        fileType = "document";
      } else if (resourceType === "video" || videoFormats.includes(formatLower) || videoFormats.includes(fileExt)) {
        fileType = "video";
      } else if (resourceType === "image" || imageFormats.includes(formatLower) || imageFormats.includes(fileExt)) {
        fileType = "image";
        imageUrl = url; // Also set imageUrl for backward compat
      }
      // else: stays "document" (unknown formats default to document)

      fileData = {
        url,
        name: fileName || uploadResponse.original_filename || "file",
        size: fileSize || uploadResponse.bytes || 0,
        type: fileType,
      };
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: filteredText,
      image: imageUrl,
      file: fileData,
    });

    await newMessage.save();

    // Build description for push notifications / sidebar
    const messagePreview = buildLatestMessagePreview({
      text: filteredText,
      image: imageUrl,
      file: fileData,
    });

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
        file: fileData || null,
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
      const body = messagePreview;

      if (receiver?.pushSubscriptions?.length) {
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

export const downloadFile = async (req, res) => {
  try {
    const { url, filename } = req.query;

    if (!url) {
      return res.status(400).json({ error: "File URL is required" });
    }

    // Only allow Cloudinary URLs for security
    if (!url.includes("res.cloudinary.com")) {
      return res.status(403).json({ error: "Only Cloudinary file downloads are supported" });
    }

    const safeName = sanitizeDownloadName(filename || "download");
    const fileExt = getExtensionFromName(safeName);
    const shouldTryRaw = DOC_EXTENSIONS.has(fileExt);

    const primaryUrl = buildCloudinaryAttachmentUrl(url, safeName);
    const rawUrl = shouldTryRaw
      ? buildCloudinaryAttachmentUrl(url, safeName, "raw")
      : null;

    const candidateUrls = [primaryUrl, rawUrl, url].filter(Boolean);

    let response = null;
    for (const candidateUrl of candidateUrls) {
      const candidateResponse = await fetch(candidateUrl);
      if (candidateResponse.ok) {
        response = candidateResponse;
        break;
      }
    }

    if (!response) {
      return res.status(502).json({ error: "Failed to fetch file from storage" });
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const contentLength = response.headers.get("content-length");

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    if (!response.body) {
      const fileBuffer = Buffer.from(await response.arrayBuffer());
      res.end(fileBuffer);
      return;
    }

    // Stream the response body to the client
    const reader = response.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    };
    await pump();
  } catch (error) {
    console.log("Error in downloadFile controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

