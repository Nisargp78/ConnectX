import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";

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

async function joinUserGroups(socket, userId) {
  try {
    const groups = await Group.find({ members: userId }).select("_id").lean();
    groups.forEach((group) => {
      socket.join(group._id.toString());
    });
  } catch (error) {
    console.log("Error joining user groups:", error.message);
  }
}

const canUserAccessGroup = async (userId, groupId) => {
  try {
    if (!userId || !groupId) return false;
    const group = await Group.findOne({ _id: groupId, members: userId }).select("_id").lean();
    return Boolean(group);
  } catch {
    return false;
  }
};

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
    joinUserGroups(socket, userId);
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

  socket.on("join_group", async ({ groupId }) => {
    if (!groupId || !userId) return;

    const hasAccess = await canUserAccessGroup(userId, groupId);
    if (!hasAccess) return;

    socket.join(groupId.toString());
  });

  const emitGroupMessage = async (payload) => {
    const groupId = payload?.groupId?.toString?.() || payload?.groupId;
    if (!groupId || !userId) return;

    const hasAccess = await canUserAccessGroup(userId, groupId);
    if (!hasAccess) return;

    io.to(groupId).emit("group_message", payload);
  };

  socket.on("send_group_message", emitGroupMessage);
  socket.on("group_message", emitGroupMessage);

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

export const emitGroupMessageToRoom = (groupId, payload) => {
  io.to(groupId.toString()).emit("group_message", payload);
};

export const emitGroupMemberAdded = (userIds, payload) => {
  userIds.forEach((userId) => {
    const socketIds = getReceiverSocketIds(userId.toString());
    socketIds.forEach((socketId) => {
      io.to(socketId).emit("group_member_added", payload);
    });
  });
};

export const emitGroupDeleted = (userIds, payload) => {
  userIds.forEach((userId) => {
    const socketIds = getReceiverSocketIds(userId.toString());
    socketIds.forEach((socketId) => {
      io.to(socketId).emit("group_deleted", payload);
    });
  });
};

export const emitGroupUpdated = (userIds, payload) => {
  userIds.forEach((userId) => {
    const socketIds = getReceiverSocketIds(userId.toString());
    socketIds.forEach((socketId) => {
      io.to(socketId).emit("group_updated", payload);
    });
  });
};

export const emitGroupAccessRemoved = (userIds, payload) => {
  userIds.forEach((userId) => {
    const socketIds = getReceiverSocketIds(userId.toString());
    socketIds.forEach((socketId) => {
      io.to(socketId).emit("group_access_removed", payload);
    });
  });
};

export { io, app, server };
