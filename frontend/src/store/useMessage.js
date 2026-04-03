import { useState } from "react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useChatStore } from "./useChatStore";

export const useMessage = () => {
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const editMessage = async (messageId, newText) => {
    if (!newText.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    try {
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, { text: newText });

      useChatStore.setState((state) => {
        const nextMessagesByChat = Object.fromEntries(
          Object.entries(state.messagesByChat || {}).map(([chatId, chatMessages]) => [
            chatId,
            chatMessages.map((msg) => (msg._id === messageId ? res.data : msg)),
          ])
        );

        return {
          messagesByChat: nextMessagesByChat,
          messages: state.messages.map((msg) => (msg._id === messageId ? res.data : msg)),
        };
      });
      
      setEditingId(null);
      setEditText("");
      toast.success("Message edited");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to edit message");
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/delete/${messageId}`);

      useChatStore.setState((state) => {
        const nextMessagesByChat = Object.fromEntries(
          Object.entries(state.messagesByChat || {}).map(([chatId, chatMessages]) => [
            chatId,
            chatMessages.filter((msg) => msg._id !== messageId),
          ])
        );

        return {
          messagesByChat: nextMessagesByChat,
          messages: state.messages.filter((msg) => msg._id !== messageId),
        };
      });
      
      toast.success("Message deleted");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete message");
    }
  };

  return {
    editingId,
    setEditingId,
    editText,
    setEditText,
    editMessage,
    deleteMessage,
  };
};
