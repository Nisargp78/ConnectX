import { useState } from "react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useChatStore } from "./useChatStore";

export const useMessage = () => {
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const { messages, setMessages } = useChatStore();

  const setMessagesInStore = (updatedMessages) => {
    useChatStore.setState({ messages: updatedMessages });
  };

  const editMessage = async (messageId, newText) => {
    if (!newText.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    try {
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, { text: newText });
      
      const updatedMessages = messages.map((msg) =>
        msg._id === messageId ? res.data : msg
      );
      setMessagesInStore(updatedMessages);
      
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
      
      const updatedMessages = messages.filter((msg) => msg._id !== messageId);
      setMessagesInStore(updatedMessages);
      
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
