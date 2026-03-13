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
  isSending: false,
  typingUsers: {},

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
      });

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

    set({
      unreadCounts: {
        ...get().unreadCounts,
        [userId]: (get().unreadCounts[userId] || 0) + 1,
      },
    });
  },

  resetUnread: (userId) => {
    if (!userId) return;

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
  
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    set({ isSending: true });
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      get().upsertConversationFromMessage(res.data);
      set({
        messages: [...messages, res.data],
      });
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
      return false;
    } finally {
      set({ isSending: false });
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

  setSelectedUser: (selectedUser) => {
    if (selectedUser?._id) {
      get().resetUnread(selectedUser._id);
    }

    set({ selectedUser });
  },
}));
