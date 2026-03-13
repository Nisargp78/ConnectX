import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";

export const GLOBAL_BROADCAST_ROOM = "global_broadcast";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  const socketIds = getReceiverSocketIds(userId);
  return socketIds[0];
}

export function getReceiverSocketIds(userId) {
  const normalizedUserId = userId?.toString();
  if (!normalizedUserId) return [];

  return Array.from(onlineUsers.get(normalizedUserId) || []);
}

const onlineUsers = new Map();
const socketToUserMap = new Map();

async function updateLastActive(userId) {
  if (!userId) return;
  await User.findByIdAndUpdate(userId, {
    lastActive: new Date,
  });
}

async function markMessagesAsDeliveredOnConnect(userId) {
  try {
    // Find all messages sent to this user that are still in "sent" status
    const undeliveredMessages = await Message.find({
      receiverId: userId,
      status: "sent",
    });

    if (undeliveredMessages.length > 0) {
      // Mark them as delivered
      await Message.updateMany(
        {
          receiverId: userId,
          status: "sent",
        },
        {
          status: "delivered",
          deliveredAt: new Date(),
        }
      );

      // Notify each sender that their messages were delivered
      undeliveredMessages.forEach((message) => {
        const senderSocketIds = getReceiverSocketIds(message.senderId.toString());
        senderSocketIds.forEach((socketId) => {
          io.to(socketId).emit("messageStatusUpdated", {
            messageId: message._id,
            status: "delivered",
            deliveredAt: new Date(),
          });
        });
      });
    }
  } catch (error) {
    console.log("Error marking messages as delivered on connect:", error.message);
  }
}

io.on("connection", (socket) => {

  const userId = socket.handshake.query.userId;
  if (userId) {
    const normalizedUserId = userId.toString();
    const existingSocketIds = onlineUsers.get(normalizedUserId) || new Set();
    existingSocketIds.add(socket.id);

    onlineUsers.set(normalizedUserId, existingSocketIds);
    socketToUserMap.set(socket.id, normalizedUserId);

    updateLastActive(userId);
    markMessagesAsDeliveredOnConnect(userId);
    socket.join(GLOBAL_BROADCAST_ROOM);
  }

  io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));

  socket.on("user_typing", ({ receiverId }) => {
    const receiverSocketIds = getReceiverSocketIds(receiverId);
    receiverSocketIds.forEach((socketId) => {
      io.to(socketId).emit("user_typing", {
        userId,
      });
    });
  });

  socket.on("user_stopped_typing", ({ receiverId }) => {
    const receiverSocketIds = getReceiverSocketIds(receiverId);
    receiverSocketIds.forEach((socketId) => {
      io.to(socketId).emit("user_stopped_typing", {
        userId,
      });
    });
  });

  socket.on("disconnect", async () => {
    const disconnectedUserId = socketToUserMap.get(socket.id);


    if (disconnectedUserId) {
      const socketIds = onlineUsers.get(disconnectedUserId);
      if (socketIds) {
        socketIds.delete(socket.id);

        if (socketIds.size === 0) {
          onlineUsers.delete(disconnectedUserId);
        } else {
          onlineUsers.set(disconnectedUserId, socketIds);
        }
      }

      socketToUserMap.delete(socket.id);
    }

    const onlineUserIds = Array.from(onlineUsers.keys());
    io.emit("getOnlineUsers", onlineUserIds);

    if (disconnectedUserId && !onlineUsers.has(disconnectedUserId)) {
      await updateLastActive(disconnectedUserId);
    }
  });
});

export const emitBroadcastMessage = (payload) => {
  io.to(GLOBAL_BROADCAST_ROOM).emit("broadcast_message", payload);
};

export { io, app, server };
