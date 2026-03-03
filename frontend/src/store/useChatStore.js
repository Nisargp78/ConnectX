import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  allUsers: [],
  unreadCounts: {},
  selectedUser: null,
  isUsersLoading: false,
  isAllUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
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
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({
        messages: res.data,
        unreadCounts: {
          ...get().unreadCounts,
          [userId]: 0,
        },
      });
      
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
      latestMessage: message.text || (message.image ? "📷 Photo" : "Message"),
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

  handleIncomingMessage: (newMessage) => {
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
      const alreadyExists = get().messages.some((message) => message._id === newMessage._id);

      if (!alreadyExists) {
        set({
          messages: [...get().messages, newMessage],
        });
      }

      setTimeout(() => {
        get().markMessageAsRead(newMessage._id);
      }, 800);

      set({
        unreadCounts: {
          ...get().unreadCounts,
          [senderId]: 0,
        },
      });

      return;
    }

    set({
      unreadCounts: {
        ...get().unreadCounts,
        [senderId]: (get().unreadCounts[senderId] || 0) + 1,
      },
    });

    const senderUser =
      get().users.find((user) => user._id === senderId) ||
      get().allUsers.find((user) => user._id === senderId);
    const preview = newMessage.text || (newMessage.image ? "📷 Photo" : "New message");

    toast(`${senderUser?.fullName || "New message"}: ${preview}`);
  },
  
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      get().upsertConversationFromMessage(res.data);
      set({
        messages: [...messages, res.data],
      });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  startNewChat: (user) => {
    const conversationExists = get().users.some((existingUser) => existingUser._id === user._id);

    set({
      selectedUser: user,
      unreadCounts: {
        ...get().unreadCounts,
        [user._id]: 0,
      },
      users: conversationExists ? get().users : [user, ...get().users],
    });
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

    socket.on("messagesDelivered", ({ senderId, receiverId }) => {
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

  setSelectedUser: (selectedUser) =>
    set({
      selectedUser,
      unreadCounts: selectedUser
        ? {
            ...get().unreadCounts,
            [selectedUser._id]: 0,
          }
        : get().unreadCounts,
    }),
}));
