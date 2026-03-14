import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Paperclip, Send, X, Smile, FileText, Film, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";
import JSZip from "jszip";
import { GLOBAL_CHAT_ID } from "../store/useChatStore";

const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const getFileCategory = (mimeType) => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
};

const MessageInput = () => {
  const [text, setText] = useState("");
  const [filePreview, setFilePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("file");
  const [isZippingFolder, setIsZippingFolder] = useState(false);
  const attachmentInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const { sendMessage, selectedUser, broadcastCooldownUntil } = useChatStore();
  const { socket } = useAuthStore();

  const isGlobalChat = selectedUser?._id === GLOBAL_CHAT_ID;
  const isGroupChat = Boolean(selectedUser?.isGroup);
  const isBroadcastCoolingDown = isGlobalChat && Date.now() < broadcastCooldownUntil;

  // Accepted file types
  const ACCEPTED_TYPES = "image/*,video/*,.pdf,.doc,.docx,.zip,.rar,.7z";

  const createFilePreview = (file, forcedType) => {
    const category = forcedType || getFileCategory(file.type || "");

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = {
          dataUri: reader.result,
          name: file.name,
          size: file.size,
          type: category,
          mimeType: file.type,
          previewUrl: null,
        };

        // For images and videos, create an object URL for preview
        if (category === "image" || category === "video") {
          preview.previewUrl = URL.createObjectURL(file);
        }

        resolve(preview);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSingleFile = async (file) => {
    if (!file) return;

    const maxSize = 35 * 1024 * 1024; // ~35MB effective limit
    if (file.size > maxSize) {
      toast.error("File too large. Maximum size is 35MB.");
      return;
    }

    const preview = await createFilePreview(file);
    setFilePreview(preview);
  };

  const handleFolderFiles = async (files) => {
    if (!files.length) return;

    try {
      setIsZippingFolder(true);
      toast.loading("Zipping folder...", { id: "folder-zip" });
      const zip = new JSZip();

      for (const file of files) {
        // Use webkitRelativePath to preserve folder structure
        const path = file.webkitRelativePath || file.name;
        zip.file(path, file);
      }

      const blob = await zip.generateAsync({ type: "blob" });

      if (blob.size > 35 * 1024 * 1024) {
        toast.error("Zipped folder too large. Maximum size is 35MB.", { id: "folder-zip" });
        return;
      }

      const folderName = files[0]?.webkitRelativePath?.split("/")[0] || "folder";
      const zippedFile = new File([blob], `${folderName}.zip`, {
        type: "application/zip",
      });
      const preview = await createFilePreview(zippedFile, "document");
      setFilePreview(preview);
      toast.success("Folder zipped successfully!", { id: "folder-zip" });
    } catch (err) {
      toast.error("Failed to zip folder.", { id: "folder-zip" });
      console.error("Folder zip error:", err);
    } finally {
      setIsZippingFolder(false);
    }
  };

  const handleAttachmentChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const isDirectorySelection =
      pickerMode === "folder" || files.some((file) => file.webkitRelativePath && file.webkitRelativePath.includes("/"));

    if (isDirectorySelection) {
      await handleFolderFiles(files);
      return;
    }

    await handleSingleFile(files[0]);
  };

  const openAttachmentPicker = (mode) => {
    setPickerMode(mode);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
      attachmentInputRef.current.click();
    }
  };

  const removeFile = (previewToRemove = filePreview) => {
    if (previewToRemove?.previewUrl) {
      URL.revokeObjectURL(previewToRemove.previewUrl);
    }
    setFilePreview(null);
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
  };

  const clearComposer = (previewToRemove = filePreview) => {
    setText("");
    removeFile(previewToRemove);
  };

  const onEmojiClick = (emojiObject) => {
    setText(text + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current && socket && selectedUser && !isGlobalChat && !isGroupChat) {
        socket.emit("user_stopped_typing", { receiverId: selectedUser._id });
      }
      // Cleanup preview URLs
      if (filePreview?.previewUrl) {
        URL.revokeObjectURL(filePreview.previewUrl);
      }
    };
  }, [socket, selectedUser, isGlobalChat, isGroupChat]);

  const handleTyping = (value) => {
    setText(value);

    if (!socket || !selectedUser || isGlobalChat || isGroupChat) return;

    if (!isTypingRef.current && value.trim()) {
      isTypingRef.current = true;
      socket.emit("user_typing", { receiverId: selectedUser._id });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        socket.emit("user_stopped_typing", { receiverId: selectedUser._id });
      }
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !filePreview) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current && socket && selectedUser && !isGlobalChat && !isGroupChat) {
      isTypingRef.current = false;
      socket.emit("user_stopped_typing", { receiverId: selectedUser._id });
    }

    const currentPreview = filePreview;
    const messageData = { text: text.trim() };

    if (currentPreview) {
      messageData.file = currentPreview.dataUri;
      messageData.fileName = currentPreview.name;
      messageData.fileSize = currentPreview.size;
      messageData.fileType = currentPreview.type;
      messageData.fileMimeType = currentPreview.mimeType;
    }

    clearComposer(currentPreview);

    sendMessage(messageData, selectedUser._id).catch((error) => {
      console.error("Failed to send message:", error);
    });
  };

  const renderFilePreview = () => {
    if (!filePreview) return null;

    return (
      <div className="mb-3 flex items-center gap-2">
        <div className="relative">
          {filePreview.type === "image" && filePreview.previewUrl && (
            <img
              src={filePreview.previewUrl}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-xl border-2 border-blue-500/50 shadow-lg shadow-blue-500/20"
            />
          )}

          {filePreview.type === "video" && filePreview.previewUrl && (
            <div className="w-24 h-20 rounded-xl border-2 border-purple-500/50 shadow-lg shadow-purple-500/20 overflow-hidden bg-black/40 flex items-center justify-center relative">
              <video
                src={filePreview.previewUrl}
                className="w-full h-full object-cover opacity-70"
                muted
              />
              <Film className="absolute size-6 text-purple-300/80" />
            </div>
          )}

          {filePreview.type === "document" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-teal-500/50 bg-[#051923]/60 shadow-lg shadow-teal-500/10">
              <FileText className="size-6 text-teal-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-[#F3F4F4] truncate max-w-30">{filePreview.name}</p>
                <p className="text-[10px] text-slate-400">{formatFileSize(filePreview.size)}</p>
              </div>
            </div>
          )}

          <button
            onClick={removeFile}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-600
            flex items-center justify-center transition-colors ring-2 ring-slate-900 shadow-lg"
            type="button"
          >
            <X className="size-3.5 text-white" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-2 md:p-4 w-full border-t border-[#F3F4F4]/5 bg-[#0A2A3A]/30 sticky bottom-0 md:relative z-10">
      {renderFilePreview()}

      <form onSubmit={handleSendMessage} className="flex items-center gap-1 md:gap-2">
        <div className="flex-1 flex gap-1 md:gap-2">
          <input
            type="text"
            className="w-full px-2 md:px-4 py-1.5 md:py-2.5 text-sm md:text-base rounded-xl bg-[#051923]/40 border border-slate-600/50 focus:border-[#5F9598] focus:outline-none text-[#F3F4F4] placeholder-[#F3F4F4]/35 transition-colors caret-[#5F9598]"
            placeholder={
              isGlobalChat
                ? "Broadcast a message to everyone..."
                : isGroupChat
                  ? "Message this group..."
                  : "Type a message..."
            }
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
          />
          <button
            type="button"
            className="p-1.5 md:p-2.5 rounded-lg text-[#F3F4F4] hover:bg-slate-700/40 border border-transparent cursor-pointer transition-colors"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile className="size-4 md:size-5" />
          </button>

          {showEmojiPicker && (
            <div className="mt-3 absolute bottom-20 right-4 z-50">
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                theme="dark"
                height={400}
                width="100%"
                emojiStyle="native"
              />
            </div>
          )}

          {/* Attachment button */}
          <div className="relative group">
            <button
              type="button"
              className={`p-1.5 md:p-2.5 rounded-lg transition-colors ${
                filePreview ? "bg-emerald-500/30 text-emerald-400 border border-emerald-500/50" : "text-[#F3F4F4] hover:bg-slate-700/40 border border-transparent cursor-pointer"
              }`}
              disabled={isZippingFolder}
              onClick={() => openAttachmentPicker("file")}
              title="Attachments"
            >
              {isZippingFolder ? (
                <Loader2 className="size-4 md:size-5 animate-spin" />
              ) : (
                <Paperclip className="size-4 md:size-5" />
              )}
            </button>
          </div>
          
          {/* Hidden attachment input supports both file and directory modes */}
          <input
            type="file"
            accept={pickerMode === "file" ? ACCEPTED_TYPES : undefined}
            className="hidden"
            ref={attachmentInputRef}
            onChange={handleAttachmentChange}
            multiple
            webkitdirectory={pickerMode === "folder" ? "" : undefined}
          />

        </div>
        <button
          type="submit"
          className="p-1.5 md:p-2 rounded-lg bg-teal-600 hover:bg-teal-800 text-[#F3F4F4] transition-colors cursor-pointer disabled:bg-[#1D546D]/80 disabled:cursor-not-allowed flex items-center justify-center"
          disabled={(!text.trim() && !filePreview) || isBroadcastCoolingDown}
          title={isBroadcastCoolingDown ? "Please wait before sending another broadcast" : "Send"}
        >
          <Send className="size-4 md:size-5" />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
