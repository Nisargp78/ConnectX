import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

const userSocketMap = {};

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
        const senderSocketId = getReceiverSocketId(message.senderId.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageStatusUpdated", {
            messageId: message._id,
            status: "delivered",
            deliveredAt: new Date(),
          });
        }
      });
    }
  } catch (error) {
    console.log("Error marking messages as delivered on connect:", error.message);
  }
}

io.on("connection", (socket) => {

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    updateLastActive(userId);
    markMessagesAsDeliveredOnConnect(userId);
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", async () => {
    console.log(`User disconnected: ${userId}`);
    delete userSocketMap[userId];
    const onlineUserIds = Object.keys(userSocketMap);
    io.emit("getOnlineUsers", onlineUserIds);
    await updateLastActive(userId);
  });
});

export { io, app, server };
