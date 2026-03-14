import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const GLOBAL_CHAT_ID = "global_broadcast_room";
export const SIDEBAR_MODE_CHATS = "chats";
export const SIDEBAR_MODE_GROUPS = "groups";
export const GLOBAL_CHAT_USER = {
  _id: GLOBAL_CHAT_ID,
  fullName: "Global Chat",
  email: "broadcast@connectx.local",
  profilePic: "/CX.png",
  latestMessage: "Broadcast to everyone",
  isGlobal: true,
};

const BROADCAST_COOLDOWN_MS = 5000;

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

const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "avi", "mkv", "webm", "m4v", "flv", "wmv"]);

const getExtension = (filename = "") => {
  const parts = String(filename).toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
};

const getFileTypeFromPayload = ({ fileType, fileMimeType, fileName }) => {
  if (fileType) return fileType;

  const mime = String(fileMimeType || "").toLowerCase();
  const ext = getExtension(fileName);

  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (DOC_EXTENSIONS.has(ext)) return "document";
  return "document";
};

const buildOptimisticMessage = ({ selectedUser, authUser, messageData }) => {
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const hasFile = Boolean(messageData.file);
  const fileType = hasFile ? getFileTypeFromPayload(messageData) : null;
  const optimisticFile = hasFile
    ? {
        name: messageData.fileName || "file",
        size: messageData.fileSize || 0,
        type: fileType,
        url: fileType === "document" ? "" : messageData.file,
      }
    : null;

  return {
    _id: tempId,
    _clientTempId: tempId,
    senderId: authUser._id,
    receiverId: selectedUser._id,
    text: messageData.text || "",
    image: hasFile && fileType === "image" ? messageData.file : null,
    file: optimisticFile,
    createdAt: new Date().toISOString(),
    status: "sent",
    isEdited: false,
    sendState: "sending",
    _optimisticPayload: {
      text: messageData.text || "",
      file: messageData.file,
      fileName: messageData.fileName,
      fileSize: messageData.fileSize,
      fileType: messageData.fileType,
      fileMimeType: messageData.fileMimeType,
    },
  };
};

const mergeServerAndPendingMessages = (serverMessages = [], pendingMessages = []) => {
  const map = new Map();

  for (const message of serverMessages) {
    map.set(message._id, message);
  }

  for (const message of pendingMessages) {
    map.set(message._id, message);
  }

  return Array.from(map.values()).sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return aTime - bTime;
  });
};

const upsertPendingMessageInMap = (pendingMap, receiverId, message) => {
  const current = pendingMap[receiverId] || [];
  const exists = current.some((item) => item._id === message._id);
  return {
    ...pendingMap,
    [receiverId]: exists
      ? current.map((item) => (item._id === message._id ? message : item))
      : [...current, message],
  };
};

const removePendingMessageFromMap = (pendingMap, receiverId, messageId) => {
  const current = pendingMap[receiverId] || [];
  const updated = current.filter((item) => item._id !== messageId);

  if (!updated.length) {
    const rest = { ...pendingMap };
    delete rest[receiverId];
    return rest;
  }

  return {
    ...pendingMap,
    [receiverId]: updated,
  };
};

const patchPendingMessageInMap = (pendingMap, receiverId, messageId, patch) => {
  const current = pendingMap[receiverId] || [];
  return {
    ...pendingMap,
    [receiverId]: current.map((item) =>
      item._id === messageId
        ? { ...item, ...patch }
        : item
    ),
  };
};

const removeUploadController = (controllers, messageId) => {
  if (!controllers?.[messageId]) return controllers;
  const rest = { ...controllers };
  delete rest[messageId];
  return rest;
};

const removeCanceledId = (canceledMap, messageId) => {
  if (!canceledMap?.[messageId]) return canceledMap;
  const rest = { ...canceledMap };
  delete rest[messageId];
  return rest;
};

const getLatestMessagePreview = (message) => {
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

const normalizeGroup = (group) => ({
  ...group,
  isGroup: true,
  adminId: group.adminId || group.admin?._id || group.admin || null,
  adminIds:
    group.adminIds ||
    (Array.isArray(group.admins)
      ? group.admins.map((admin) => admin?._id || admin).filter(Boolean)
      : []),
  createdById: group.createdById || group.createdBy?._id || group.createdBy || null,
  fullName: group.name,
  profilePic: group.avatar || "/avatar.png",
  latestMessage: group.latestMessage || "Start a group conversation",
});

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  groups: [],
  allUsers: [],
  unreadCounts: {},
  selectedUser: null,
  sidebarMode: SIDEBAR_MODE_CHATS,
  isUsersLoading: false,
  isAllUsersLoading: false,
  isGroupsLoading: false,
  isMessagesLoading: false,
  typingUsers: {},
  pendingMessagesByChat: {},
  uploadControllers: {},
  canceledMessageIds: {},
  broadcastMeta: {
    latestMessage: "Broadcast to everyone",
    latestMessageAt: null,
    unreadCount: 0,
  },
  broadcastCooldownUntil: 0,

  setUserTyping: (userId) => {
    set((state) => ({
      typingUsers: { ...state.typingUsers, [userId]: true },
    }));
  },

  setUserStoppedTyping: (userId) => {
    set((state) => {
      const newTypingUsers = { ...state.typingUsers };
      delete newTypingUsers[userId];
      return { typingUsers: newTypingUsers };
    });
  },

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      
      // Initialize unreadCounts from API response
      const unreadCounts = {};
      res.data.forEach((user) => {
        if (user.unreadCount > 0) {
          unreadCounts[user._id] = user.unreadCount;
        }
      });
      
      set({ 
        users: res.data,
        unreadCounts,
      });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      const normalizedGroups = res.data.map(normalizeGroup);
      set({ groups: normalizedGroups });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to fetch groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  createGroup: async ({ name, description, avatar, memberIds }) => {
    try {
      const res = await axiosInstance.post("/groups", {
        name,
        description,
        avatar,
        members: memberIds,
      });

      const createdGroup = {
        ...normalizeGroup(res.data),
        latestMessage: "Group created",
      };

      set((state) => ({
        groups: [createdGroup, ...state.groups.filter((group) => group._id !== createdGroup._id)],
      }));

      const socket = useAuthStore.getState().socket;
      socket?.emit("join_group", { groupId: createdGroup._id });

      return createdGroup;
    } catch (error) {
      const message = error.response?.data?.error || "Failed to create group";
      toast.error(message);
      return null;
    }
  },

  addMemberToGroup: async (groupId, memberId) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/members`, { memberId });
      const updatedGroup = normalizeGroup(res.data);

      set((state) => ({
        groups: state.groups.map((group) => (group._id === groupId ? { ...group, ...updatedGroup } : group)),
      }));

      return updatedGroup;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to add member");
      return null;
    }
  },

  addMembersToGroup: async (groupId, memberIds) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/add-members`, { memberIds });
      const updatedGroup = normalizeGroup(res.data.group);

      set((state) => ({
        groups: state.groups.map((group) => (group._id === groupId ? { ...group, ...updatedGroup } : group)),
        selectedUser:
          state.selectedUser?._id === groupId
            ? { ...state.selectedUser, ...updatedGroup }
            : state.selectedUser,
      }));

      toast.success(res.data.message || "Members added successfully");
      return updatedGroup;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to add members");
      return null;
    }
  },

  removeMemberFromGroup: async (groupId, memberId) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/remove-member`, { memberId });
      const updatedGroup = normalizeGroup(res.data.group);

      set((state) => ({
        groups: state.groups.map((group) => (group._id === groupId ? { ...group, ...updatedGroup } : group)),
        selectedUser:
          state.selectedUser?._id === groupId
            ? { ...state.selectedUser, ...updatedGroup }
            : state.selectedUser,
      }));

      toast.success(res.data.message || "Member removed successfully");
      return updatedGroup;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to remove member");
      return null;
    }
  },

  promoteMemberToAdmin: async (groupId, memberId) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/add-admin`, { memberId });
      const updatedGroup = normalizeGroup(res.data.group);

      set((state) => ({
        groups: state.groups.map((group) => (group._id === groupId ? { ...group, ...updatedGroup } : group)),
        selectedUser:
          state.selectedUser?._id === groupId
            ? { ...state.selectedUser, ...updatedGroup }
            : state.selectedUser,
      }));

      toast.success(res.data.message || "Admin added successfully");
      return updatedGroup;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to add admin");
      return null;
    }
  },

  leaveGroup: async (groupId) => {
    try {
      const res = await axiosInstance.delete(`/groups/${groupId}/leave`);

      set((state) => ({
        groups: state.groups.filter((group) => group._id !== groupId),
        selectedUser: state.selectedUser?._id === groupId ? null : state.selectedUser,
        messages: state.selectedUser?._id === groupId ? [] : state.messages,
      }));

      toast.success(res.data.message || "Left group");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to leave group");
      return false;
    }
  },

  deleteGroup: async (groupId) => {
    try {
      const res = await axiosInstance.delete(`/groups/${groupId}`);

      set((state) => ({
        groups: state.groups.filter((group) => group._id !== groupId),
        selectedUser: state.selectedUser?._id === groupId ? null : state.selectedUser,
        messages: state.selectedUser?._id === groupId ? [] : state.messages,
      }));

      toast.success(res.data.message || "Group deleted");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete group");
      return false;
    }
  },

  getAllUsers: async () => {
    set({ isAllUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/all-users");
      set({ allUsers: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      set({ isAllUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const selectedUser = get().selectedUser;

      if (userId === GLOBAL_CHAT_ID) {
        const res = await axiosInstance.get("/broadcast/history");
        const pendingForGlobal = get().pendingMessagesByChat[GLOBAL_CHAT_ID] || [];
        set({
          messages: mergeServerAndPendingMessages(res.data, pendingForGlobal),
          broadcastMeta: {
            ...get().broadcastMeta,
            unreadCount: 0,
            latestMessage:
              res.data.length > 0
                ? getLatestMessagePreview(res.data[res.data.length - 1])
                : get().broadcastMeta.latestMessage,
            latestMessageAt:
              res.data.length > 0
                ? res.data[res.data.length - 1].createdAt
                : get().broadcastMeta.latestMessageAt,
          },
        });
        return;
      }

      const res = await axiosInstance.get(
        selectedUser?.isGroup ? `/messages/group/${userId}` : `/messages/${userId}`
      );
      const pendingForUser = get().pendingMessagesByChat[userId] || [];
      set({
        messages: mergeServerAndPendingMessages(res.data, pendingForUser),
      });

      if (selectedUser?.isGroup) {
        return;
      }

      get().resetUnread(userId);
      
      // Mark all sent messages as delivered
      await get().markMessagesAsDelivered(userId);
      
      // Mark received messages as read with a delay (to show delivered state first)
      const authUser = useAuthStore.getState().authUser;
      setTimeout(() => {
        res.data.forEach((message) => {
          if (message.receiverId === authUser._id && message.status !== "read") {
            get().markMessageAsRead(message._id);
          }
        });
      }, 800); // 800ms delay to show delivered state
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  incrementUnread: (userId) => {
    if (!userId) return;

    if (userId === GLOBAL_CHAT_ID) {
      return;
    }

    set({
      unreadCounts: {
        ...get().unreadCounts,
        [userId]: (get().unreadCounts[userId] || 0) + 1,
      },
    });
  },

  resetUnread: (userId) => {
    if (!userId) return;

    if (userId === GLOBAL_CHAT_ID) {
      set({
        broadcastMeta: {
          ...get().broadcastMeta,
          unreadCount: 0,
        },
      });
      return;
    }

    set({
      unreadCounts: {
        ...get().unreadCounts,
        [userId]: 0,
      },
    });
  },

  upsertConversationFromMessage: (message) => {
    const authUser = useAuthStore.getState().authUser;
    if (!authUser) return;

    const senderId = message.senderId?.toString?.() || message.senderId;
    const receiverId = message.receiverId?.toString?.() || message.receiverId;
    const myId = authUser._id?.toString?.() || authUser._id;

    const otherUserId = senderId === myId ? receiverId : senderId;

    const existingConversationUser = get().users.find((user) => user._id === otherUserId);
    const allUsersMatch = get().allUsers.find((user) => user._id === otherUserId);
    const selectedUser = get().selectedUser;
    const selectedMatch = selectedUser?._id === otherUserId ? selectedUser : null;

    const baseConversationUser = existingConversationUser || allUsersMatch || selectedMatch;
    if (!baseConversationUser) return;

    const updatedConversationUser = {
      ...baseConversationUser,
      latestMessage: getLatestMessagePreview(message),
      latestMessageAt: message.createdAt,
      latestMessageSenderId: message.senderId,
    };

    set({
      users: [
        updatedConversationUser,
        ...get().users.filter((user) => user._id !== otherUserId),
      ],
    });
  },

  addMessageToState: (newMessage) => {
    const authUser = useAuthStore.getState().authUser;
    if (!authUser) return;

    const senderId = newMessage.senderId?.toString?.() || newMessage.senderId;
    const myId = authUser._id?.toString?.() || authUser._id;

    if (senderId === myId) return;

    get().upsertConversationFromMessage(newMessage);
    get().markMessageAsDelivered(newMessage._id);

    const selectedUser = get().selectedUser;
    const isSenderChatOpen = selectedUser?._id === senderId;

    if (isSenderChatOpen) {
      set((state) => {
        const alreadyExists = state.messages.some(
          (message) => message._id === newMessage._id
        );

        if (alreadyExists) {
          return { messages: state.messages };
        }

        return {
          messages: [...state.messages, newMessage],
        };
      });

      if (!document.hidden) {
        setTimeout(() => {
          get().markMessageAsRead(newMessage._id);
        }, 800);

        get().resetUnread(senderId);
      }

      return;
    }
  },
  
  sendMessage: async (messageData, receiverIdArg) => {
    const { selectedUser } = get();
    const authUser = useAuthStore.getState().authUser;
    const receiverId = receiverIdArg || selectedUser?._id;

    if (receiverId === GLOBAL_CHAT_ID || selectedUser?.isGlobal) {
      return get().sendBroadcastMessage(messageData);
    }

    if (selectedUser?.isGroup) {
      try {
        const res = await axiosInstance.post(`/messages/send-group/${receiverId}`, messageData);
        get().addGroupMessageToState(res.data);
        return true;
      } catch (error) {
        toast.error(error.response?.data?.error || "Failed to send group message");
        return false;
      }
    }

    if (!receiverId || !authUser) return false;

    const targetUser =
      selectedUser?._id === receiverId
        ? selectedUser
        : get().users.find((user) => user._id === receiverId)
          || get().allUsers.find((user) => user._id === receiverId)
          || { _id: receiverId };

    const optimisticMessage = buildOptimisticMessage({
      selectedUser: targetUser,
      authUser,
      messageData,
    });
    const hasAttachment = Boolean(messageData.file);
    const controller = hasAttachment ? new AbortController() : null;

    get().upsertConversationFromMessage(optimisticMessage);
    set((state) => ({
      pendingMessagesByChat: upsertPendingMessageInMap(
        state.pendingMessagesByChat,
        receiverId,
        optimisticMessage
      ),
      messages:
        state.selectedUser?._id === receiverId
          ? mergeServerAndPendingMessages(state.messages, [optimisticMessage])
          : state.messages,
      uploadControllers: controller
        ? { ...state.uploadControllers, [optimisticMessage._id]: controller }
        : state.uploadControllers,
    }));

    try {
      const res = await axiosInstance.post(
        `/messages/send/${receiverId}`,
        messageData,
        controller ? { signal: controller.signal } : undefined
      );

      const wasCanceled = Boolean(get().canceledMessageIds[optimisticMessage._id]);

      if (wasCanceled) {
        // If cancel happened just after request reached server, force-delete created message.
        try {
          await axiosInstance.delete(`/messages/delete/${res.data._id}`);
        } catch (deleteError) {
          console.error("Failed to delete canceled message from server:", deleteError);
        }

        set((state) => ({
          pendingMessagesByChat: removePendingMessageFromMap(
            state.pendingMessagesByChat,
            receiverId,
            optimisticMessage._id
          ),
          messages: state.messages.filter(
            (message) =>
              message._id !== optimisticMessage._id && message._id !== res.data._id
          ),
          uploadControllers: removeUploadController(state.uploadControllers, optimisticMessage._id),
          canceledMessageIds: removeCanceledId(state.canceledMessageIds, optimisticMessage._id),
        }));

        return false;
      }

      get().upsertConversationFromMessage(res.data);

      set((state) => {
        const updatedPending = removePendingMessageFromMap(
          state.pendingMessagesByChat,
          receiverId,
          optimisticMessage._id
        );

        const isCurrentChat = state.selectedUser?._id === receiverId;

        const currentMessages = isCurrentChat
          ? state.messages.filter((message) => message._id !== optimisticMessage._id)
          : state.messages;

        const nextMessages = isCurrentChat
          ? mergeServerAndPendingMessages(currentMessages, [res.data, ...(updatedPending[receiverId] || [])])
          : state.messages;

        return {
          pendingMessagesByChat: updatedPending,
          messages: nextMessages,
          uploadControllers: removeUploadController(state.uploadControllers, optimisticMessage._id),
          canceledMessageIds: removeCanceledId(state.canceledMessageIds, optimisticMessage._id),
        };
      });

      return true;
    } catch (error) {
      const isCanceled = error?.code === "ERR_CANCELED" || error?.name === "CanceledError";
      const errorMessage = error.response?.data?.message || "Failed to send message";

      set((state) => {
        const updatedPending = patchPendingMessageInMap(
          state.pendingMessagesByChat,
          receiverId,
          optimisticMessage._id,
          { sendState: isCanceled ? "canceled" : "failed" }
        );

        const isCurrentChat = state.selectedUser?._id === receiverId;
        return {
          pendingMessagesByChat: updatedPending,
          messages: isCurrentChat
            ? mergeServerAndPendingMessages(
                state.messages.filter((message) => message._id !== optimisticMessage._id),
                updatedPending[receiverId] || []
              )
            : state.messages,
          uploadControllers: removeUploadController(state.uploadControllers, optimisticMessage._id),
          canceledMessageIds: isCanceled
            ? state.canceledMessageIds
            : removeCanceledId(state.canceledMessageIds, optimisticMessage._id),
        };
      });

      if (isCanceled) {
        toast("Upload canceled");
      } else {
        toast.error(error.response?.data?.message || "Failed to send message");
      }
      console.error("Background send failed:", errorMessage, error);
      return false;
    }
  },

  cancelPendingUpload: (messageId) => {
    const { uploadControllers, pendingMessagesByChat } = get();
    const controller = uploadControllers[messageId];
    if (!controller) return;

    const pendingMessage = Object.values(pendingMessagesByChat)
      .flat()
      .find((msg) => msg._id === messageId);

    if (!pendingMessage?.receiverId) {
      controller.abort();
      set((state) => ({
        uploadControllers: removeUploadController(state.uploadControllers, messageId),
      }));
      return;
    }

    const receiverId = pendingMessage.receiverId;
    controller.abort();

    set((state) => {
      const updatedPending = removePendingMessageFromMap(
        state.pendingMessagesByChat,
        receiverId,
        messageId
      );

      return {
        pendingMessagesByChat: updatedPending,
        messages:
          state.selectedUser?._id === receiverId
            ? state.messages.filter((msg) => msg._id !== messageId)
            : state.messages,
        uploadControllers: removeUploadController(state.uploadControllers, messageId),
        canceledMessageIds: { ...state.canceledMessageIds, [messageId]: true },
      };
    });
  },

  retryMessage: async (messageId) => {
    const pendingMessagesByChat = get().pendingMessagesByChat;
    const pendingMessage = Object.values(pendingMessagesByChat)
      .flat()
      .find((msg) => msg._id === messageId);

    if (!pendingMessage?._optimisticPayload || !pendingMessage?.receiverId) return false;

    const receiverId = pendingMessage.receiverId;

    if (receiverId === GLOBAL_CHAT_ID) {
      return get().sendBroadcastMessage(pendingMessage._optimisticPayload, messageId);
    }

    const retryHasAttachment = Boolean(pendingMessage._optimisticPayload?.file);
    const retryController = retryHasAttachment ? new AbortController() : null;

    set((state) => {
      const updatedPending = patchPendingMessageInMap(
        state.pendingMessagesByChat,
        receiverId,
        messageId,
        { sendState: "sending" }
      );

      return {
        pendingMessagesByChat: updatedPending,
        messages:
          state.selectedUser?._id === receiverId
            ? mergeServerAndPendingMessages(
                state.messages.filter((msg) => msg._id !== messageId),
                updatedPending[receiverId] || []
              )
            : state.messages,
        uploadControllers: retryController
          ? { ...state.uploadControllers, [messageId]: retryController }
          : state.uploadControllers,
      };
    });

    try {
      const res = await axiosInstance.post(
        `/messages/send/${receiverId}`,
        pendingMessage._optimisticPayload,
        retryController ? { signal: retryController.signal } : undefined
      );

      get().upsertConversationFromMessage(res.data);
      set((state) => {
        const updatedPending = removePendingMessageFromMap(
          state.pendingMessagesByChat,
          receiverId,
          messageId
        );

        return {
          pendingMessagesByChat: updatedPending,
          messages:
            state.selectedUser?._id === receiverId
              ? mergeServerAndPendingMessages(
                  state.messages.filter((msg) => msg._id !== messageId),
                  [res.data, ...(updatedPending[receiverId] || [])]
                )
              : state.messages,
          uploadControllers: removeUploadController(state.uploadControllers, messageId),
        };
      });
      return true;
    } catch (error) {
      const isCanceled = error?.code === "ERR_CANCELED" || error?.name === "CanceledError";

      set((state) => {
        const updatedPending = patchPendingMessageInMap(
          state.pendingMessagesByChat,
          receiverId,
          messageId,
          { sendState: isCanceled ? "canceled" : "failed" }
        );

        return {
          pendingMessagesByChat: updatedPending,
          messages:
            state.selectedUser?._id === receiverId
              ? mergeServerAndPendingMessages(
                  state.messages.filter((msg) => msg._id !== messageId),
                  updatedPending[receiverId] || []
                )
              : state.messages,
          uploadControllers: removeUploadController(state.uploadControllers, messageId),
        };
      });

      if (isCanceled) {
        toast("Upload canceled");
      } else {
        toast.error("Retry failed. Please try again.");
      }
      console.error("Retry send failed:", error?.message, error);
      return false;
    }
  },

  startNewChat: (user) => {
    const conversationExists = get().users.some((existingUser) => existingUser._id === user._id);

    get().resetUnread(user._id);

    set({
      selectedUser: user,
      users: conversationExists ? get().users : [user, ...get().users],
    });
  },

  sendBroadcastMessage: async (messageData, existingMessageId = null) => {
    const authUser = useAuthStore.getState().authUser;
    if (!authUser) return false;

    const cooldownUntil = get().broadcastCooldownUntil;
    if (Date.now() < cooldownUntil) {
      const waitSeconds = Math.ceil((cooldownUntil - Date.now()) / 1000);
      toast.error(`Please wait ${waitSeconds}s before sending another broadcast.`);
      return false;
    }

    const optimisticMessage = existingMessageId
      ? (Object.values(get().pendingMessagesByChat)
          .flat()
          .find((msg) => msg._id === existingMessageId) || null)
      : buildOptimisticMessage({
          selectedUser: GLOBAL_CHAT_USER,
          authUser,
          messageData,
        });

    if (!optimisticMessage) return false;

    const messageId = optimisticMessage._id;
    const hasAttachment = Boolean(messageData.file);
    const controller = hasAttachment ? new AbortController() : null;

    set((state) => {
      const pending = upsertPendingMessageInMap(
        state.pendingMessagesByChat,
        GLOBAL_CHAT_ID,
        { ...optimisticMessage, receiverId: GLOBAL_CHAT_ID, sendState: "sending" }
      );

      return {
        pendingMessagesByChat: pending,
        messages:
          state.selectedUser?._id === GLOBAL_CHAT_ID
            ? mergeServerAndPendingMessages(
                state.messages.filter((msg) => msg._id !== messageId),
                pending[GLOBAL_CHAT_ID] || []
              )
            : state.messages,
        uploadControllers: controller
          ? { ...state.uploadControllers, [messageId]: controller }
          : state.uploadControllers,
        broadcastCooldownUntil: Date.now() + BROADCAST_COOLDOWN_MS,
      };
    });

    try {
      const res = await axiosInstance.post(
        "/broadcast/send",
        messageData,
        controller ? { signal: controller.signal } : undefined
      );

      const wasCanceled = Boolean(get().canceledMessageIds[messageId]);
      if (wasCanceled) {
        set((state) => ({
          pendingMessagesByChat: removePendingMessageFromMap(
            state.pendingMessagesByChat,
            GLOBAL_CHAT_ID,
            messageId
          ),
          messages: state.messages.filter((msg) => msg._id !== messageId && msg._id !== res.data._id),
          uploadControllers: removeUploadController(state.uploadControllers, messageId),
          canceledMessageIds: removeCanceledId(state.canceledMessageIds, messageId),
        }));
        return false;
      }

      set((state) => {
        const updatedPending = removePendingMessageFromMap(
          state.pendingMessagesByChat,
          GLOBAL_CHAT_ID,
          messageId
        );

        const mergedMessages =
          state.selectedUser?._id === GLOBAL_CHAT_ID
            ? mergeServerAndPendingMessages(
                state.messages.filter((msg) => msg._id !== messageId),
                [res.data, ...(updatedPending[GLOBAL_CHAT_ID] || [])]
              )
            : state.messages;

        return {
          pendingMessagesByChat: updatedPending,
          messages: mergedMessages,
          uploadControllers: removeUploadController(state.uploadControllers, messageId),
          canceledMessageIds: removeCanceledId(state.canceledMessageIds, messageId),
          broadcastMeta: {
            ...state.broadcastMeta,
            latestMessage: getLatestMessagePreview(res.data),
            latestMessageAt: res.data.createdAt,
          },
        };
      });

      return true;
    } catch (error) {
      const isCanceled = error?.code === "ERR_CANCELED" || error?.name === "CanceledError";

      set((state) => {
        const updatedPending = patchPendingMessageInMap(
          state.pendingMessagesByChat,
          GLOBAL_CHAT_ID,
          messageId,
          { sendState: isCanceled ? "canceled" : "failed", receiverId: GLOBAL_CHAT_ID }
        );

        return {
          pendingMessagesByChat: updatedPending,
          messages:
            state.selectedUser?._id === GLOBAL_CHAT_ID
              ? mergeServerAndPendingMessages(
                  state.messages.filter((msg) => msg._id !== messageId),
                  updatedPending[GLOBAL_CHAT_ID] || []
                )
              : state.messages,
          uploadControllers: removeUploadController(state.uploadControllers, messageId),
          canceledMessageIds: isCanceled
            ? state.canceledMessageIds
            : removeCanceledId(state.canceledMessageIds, messageId),
        };
      });

      if (error?.response?.status === 429) {
        toast.error(error.response?.data?.error || "Rate limit exceeded.");
      } else if (isCanceled) {
        toast("Upload canceled");
      } else {
        toast.error(error.response?.data?.error || "Failed to send broadcast");
      }

      return false;
    }
  },

  addBroadcastMessageToState: (broadcastMessage) => {
    const authUser = useAuthStore.getState().authUser;
    if (!authUser) return;

    const isGlobalOpen = get().selectedUser?._id === GLOBAL_CHAT_ID;

    set((state) => {
      const alreadyExists = state.messages.some((msg) => msg._id === broadcastMessage._id);

      const nextMessages =
        isGlobalOpen && !alreadyExists
          ? [...state.messages, { ...broadcastMessage, receiverId: GLOBAL_CHAT_ID }]
          : state.messages;

      return {
        messages: nextMessages,
        broadcastMeta: {
          latestMessage: getLatestMessagePreview(broadcastMessage),
          latestMessageAt: broadcastMessage.createdAt,
          unreadCount: 0,
        },
      };
    });
  },

  addGroupMessageToState: (groupMessage) => {
    const authUser = useAuthStore.getState().authUser;
    if (!authUser) return;

    const selectedUser = get().selectedUser;
    const isGroupOpen = selectedUser?._id === groupMessage.groupId;

    set((state) => {
      const alreadyExists = state.messages.some((msg) => msg._id === groupMessage._id);
      const nextMessages = isGroupOpen && !alreadyExists ? [...state.messages, groupMessage] : state.messages;

      const updatedGroups = state.groups.map((group) => {
        if (group._id !== groupMessage.groupId) return group;

        return {
          ...group,
          latestMessage: getLatestMessagePreview(groupMessage),
          latestMessageAt: groupMessage.createdAt,
        };
      });

      return {
        messages: nextMessages,
        groups: updatedGroups.sort((a, b) => {
          const aTime = new Date(a.latestMessageAt || 0).getTime();
          const bTime = new Date(b.latestMessageAt || 0).getTime();
          return bTime - aTime;
        }),
      };
    });
  },

  upsertGroupFromSocket: (incomingGroup) => {
    const normalizedGroup = normalizeGroup(incomingGroup);

    set((state) => {
      const existing = state.groups.some((group) => group._id === normalizedGroup._id);
      const nextGroups = existing
        ? state.groups.map((group) => (group._id === normalizedGroup._id ? { ...group, ...normalizedGroup } : group))
        : [normalizedGroup, ...state.groups];

      return {
        groups: nextGroups,
        selectedUser:
          state.selectedUser?._id === normalizedGroup._id
            ? { ...state.selectedUser, ...normalizedGroup }
            : state.selectedUser,
      };
    });
  },

  removeGroupFromState: (groupId) => {
    set((state) => ({
      groups: state.groups.filter((group) => group._id !== groupId),
      selectedUser: state.selectedUser?._id === groupId ? null : state.selectedUser,
      messages: state.selectedUser?._id === groupId ? [] : state.messages,
    }));
  },

  markMessagesAsDelivered: async (senderId) => {
    try {
      await axiosInstance.put(`/messages/delivered/${senderId}`);
    } catch (error) {
      console.log("Error marking messages as delivered:", error.message);
    }
  },

  markMessageAsDelivered: async (messageId) => {
    try {
      await axiosInstance.put(`/messages/status/${messageId}`, { status: "delivered" });
    } catch (error) {
      console.log("Error marking message as delivered:", error.message);
    }
  },

  markMessageAsRead: async (messageId) => {
    try {
      await axiosInstance.put(`/messages/status/${messageId}`, { status: "read" });
    } catch (error) {
      console.log("Error marking message as read:", error.message);
    }
  },

  updateMessageStatus: (messageId, status, deliveredAt, readAt) => {
    set({
      messages: get().messages.map((msg) =>
        msg._id === messageId
          ? { ...msg, status, deliveredAt, readAt }
          : msg
      ),
    });
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("messageEdited", (editedMessage) => {
      set({
        messages: get().messages.map((msg) =>
          msg._id === editedMessage._id ? editedMessage : msg
        ),
      });
    });

    socket.on("messageDeleted", ({ messageId }) => {
      set({
        messages: get().messages.filter((msg) => msg._id !== messageId),
      });
    });

    socket.on("messageStatusUpdated", ({ messageId, status, deliveredAt, readAt }) => {
      get().updateMessageStatus(messageId, status, deliveredAt, readAt);
    });

    socket.on("messagesDelivered", ({ senderId }) => {
      set({
        messages: get().messages.map((msg) =>
          msg.senderId === senderId && msg.status === "sent"
            ? { ...msg, status: "delivered", deliveredAt: new Date() }
            : msg
        ),
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("messageEdited");
    socket.off("messageDeleted");
    socket.off("messageStatusUpdated");
    socket.off("messagesDelivered");
  },

  setSelectedUser: (selectedUser) => {
    if (selectedUser?._id) {
      get().resetUnread(selectedUser._id);
    }

    set({ selectedUser });
  },

  setSidebarMode: (mode) => {
    set({ sidebarMode: mode });
  },
}));
