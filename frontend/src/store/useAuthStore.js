import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { useChatStore } from "./useChatStore";
import { showChatNotification } from "../utils/notifications";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      // Disconnect socket first to ensure immediate offline status
      get().disconnectSocket();
      
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser) return;

    const existingSocket = get().socket;
    if (existingSocket) {
      // Keep a single socket instance per tab to avoid duplicate event listeners.
      if (!existingSocket.connected) {
        existingSocket.connect();
      }
      return;
    }

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    socket.connect();

    set({ socket: socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds});
    });

    socket.on("receive_message", (message) => {
      const chatStore = useChatStore.getState();
      chatStore.addMessageToState(message);

      const senderId = message.senderId?.toString?.() || message.senderId;
      const activeChatId = chatStore.selectedUser?._id;

      if (activeChatId !== senderId || document.hidden === true) {
        const preview = message.message || message.text || (message.image ? "Photo" : "New message");
        showChatNotification(message.senderName, preview);
        chatStore.incrementUnread(senderId);
      }
    });

    // Global listener for message status updates (always active)
    socket.on("messageStatusUpdated", ({ messageId, status, deliveredAt, readAt }) => {
      const chatStore = useChatStore.getState();
      chatStore.updateMessageStatus(messageId, status, deliveredAt, readAt);
    });
  },
  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.off("getOnlineUsers");
      socket.off("receive_message");
      socket.off("messageStatusUpdated");
      socket.disconnect();
    }
    set({ socket: null, onlineUsers: [] });
  },
}));
