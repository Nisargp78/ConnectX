import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime, formatDate } from "../lib/format";
import MessageActions from "./MessageActions";
import MessageStatusIcon from "./MessageStatusIcon";
import TypingIndicator from "./TypingIndicator";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { Download, FileText, Play, Loader2, RotateCcw, X } from "lucide-react";
import { GLOBAL_CHAT_ID } from "../store/useChatStore";

const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5001/api"
    : "/api";

const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const sanitizeDownloadName = (name = "download") => {
  const cleaned = String(name)
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned || "download";
};

const openInNewTab = (url) => {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const handleDownload = async (url, filename) => {
  if (!url) {
    toast.error("File URL is unavailable");
    return;
  }

  try {
    const targetName = sanitizeDownloadName(filename || "download");
    let fetchUrl = url;
    const fetchOptions = { mode: "cors" };

    if (url.includes("res.cloudinary.com")) {
      const params = new URLSearchParams({
        url,
        filename: targetName,
      });
      fetchUrl = `${API_BASE_URL}/messages/download?${params.toString()}`;
      fetchOptions.credentials = "include";
    }

    const response = await fetch(fetchUrl, fetchOptions);

    if (!response.ok) {
      throw new Error(`Download failed (HTTP ${response.status})`);
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const data = await response.arrayBuffer();
    const blob = new Blob([data], { type: contentType });

    if (!blob.size || blob.size === 0) {
      throw new Error("Downloaded file is empty (0 bytes)");
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = targetName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    console.error("Download failed:", err?.name, err?.message, err);
    toast.error("Download failed. Opening file in new tab...");
    openInNewTab(url);
  }
};

const Messages = () => {
  const {
    messages,
    getMessages,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    typingUsers,
    retryMessage,
    cancelPendingUpload,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [translationsByMessage, setTranslationsByMessage] = useState({});
  const [showOriginalByMessage, setShowOriginalByMessage] = useState({});
  const [translatingByMessage, setTranslatingByMessage] = useState({});
  const isGlobalChat = selectedUser?._id === GLOBAL_CHAT_ID;
  const preferredLanguage = (authUser?.preferredLanguage || "en").toLowerCase();

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [
    selectedUser._id,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typingUsers]);

  useEffect(() => {
    setTranslationsByMessage({});
    setShowOriginalByMessage({});
    setTranslatingByMessage({});
  }, [selectedUser?._id]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setImagePreview(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Render media content (image, video, file card)
  const renderMediaContent = (message) => {
    const file = message.file;

    // New file field — video
    if (file?.type === "video" && file?.url) {
      return (
        <div className="mb-2 rounded-lg overflow-hidden border border-[#5F9598]/50 max-w-[280px] md:max-w-[320px]">
          <video
            src={file.url}
            controls
            className="w-full rounded-lg"
            preload="metadata"
          />
          <div className="flex items-center justify-between px-2 py-1.5 bg-black/30">
            <div className="flex items-center gap-1 min-w-0">
              <Play className="size-3 text-purple-300 shrink-0" />
              <span className="text-[10px] text-slate-300 truncate">{file.name}</span>
            </div>
            <button
              onClick={() => handleDownload(file.url, file.name)}
              className="p-1 rounded hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title="Download"
            >
              <Download className="size-3 text-slate-300 hover:text-white" />
            </button>
          </div>
        </div>
      );
    }

    // New file field — document
    if (file?.type === "document" && (file?.url || message?.sendState === "sending" || message?.sendState === "failed")) {
      return (
        <div className="mb-2 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-black/20 border border-[#5F9598]/30 max-w-[260px] md:max-w-[280px]">
          <div className="w-9 h-9 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0">
            <FileText className="size-5 text-teal-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#F3F4F4] truncate font-medium">{file.name}</p>
            <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
          </div>
          {message?.sendState === "sending" && (
            <div className="flex items-center gap-1 shrink-0">
              <div className="p-1.5 rounded-lg" title="Uploading">
                <Loader2 className="size-4 text-teal-300 animate-spin" />
              </div>
              <button
                onClick={() => cancelPendingUpload(message._id)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Cancel upload"
              >
                <X className="size-4 text-rose-300 hover:text-rose-200" />
              </button>
            </div>
          )}

          {message?.sendState === "failed" && (
            <button
              onClick={() => retryMessage(message._id)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title="Retry upload"
            >
              <RotateCcw className="size-4 text-amber-300 hover:text-amber-200" />
            </button>
          )}

          {!message?.sendState && file?.url && (
            <button
              onClick={() => handleDownload(file.url, file.name)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title="Download"
            >
              <Download className="size-4 text-teal-400 hover:text-teal-300" />
            </button>
          )}
        </div>
      );
    }

    // New file field — image
    const imagePreviewUrl = file?.url || message.image;
    if (file?.type === "image" && (imagePreviewUrl || message?.sendState === "sending" || message?.sendState === "failed")) {
      return (
        <div className="mb-2 rounded-lg overflow-hidden border border-[#5F9598]/50 max-w-[280px] md:max-w-[320px]">
          {imagePreviewUrl ? (
            <img
              src={imagePreviewUrl}
              alt="Attachment"
              className="w-full rounded-lg cursor-zoom-in"
              onClick={() =>
                setImagePreview({
                  url: imagePreviewUrl,
                  name: file?.name || "Image",
                })
              }
            />
          ) : (
            <div className="h-36 bg-slate-800/50" />
          )}

          <div className="flex items-center justify-between px-2 py-1.5 bg-black/30">
            <span className="text-[10px] text-slate-300 truncate pr-2">
              {file?.name || "Image"}
            </span>

            {message?.sendState === "sending" && (
              <div className="flex items-center gap-1 shrink-0">
                <div className="p-1 rounded-lg" title="Uploading">
                  <Loader2 className="size-3 text-slate-200 animate-spin" />
                </div>
                <button
                  onClick={() => cancelPendingUpload(message._id)}
                  className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                  title="Cancel upload"
                >
                  <X className="size-3 text-rose-300 hover:text-rose-200" />
                </button>
              </div>
            )}

            {message?.sendState === "failed" && (
              <button
                onClick={() => retryMessage(message._id)}
                className="p-1 rounded hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                title="Retry upload"
              >
                <RotateCcw className="size-3 text-amber-300 hover:text-amber-200" />
              </button>
            )}

            {!message?.sendState && imagePreviewUrl && (
              <button
                onClick={() => handleDownload(imagePreviewUrl, file?.name || "image")}
                className="p-1 rounded hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                title="Download"
              >
                <Download className="size-3 text-slate-300 hover:text-white" />
              </button>
            )}
          </div>
        </div>
      );
    }

    // Legacy image field (backward compat)
    // Also detect if a non-image was stored in the image field (old bug)
    if (message.image) {
      const url = message.image;
      const urlLower = url.toLowerCase();
      const docExtensions = [".pdf", ".doc", ".docx", ".zip", ".rar", ".7z", ".txt", ".csv", ".xls", ".xlsx", ".ppt", ".pptx"];
      const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];

      const isDoc = docExtensions.some(ext => urlLower.includes(ext));
      const isVideo = videoExtensions.some(ext => urlLower.includes(ext));

      if (isDoc) {
        const guessedName = url.split("/").pop().split("?")[0] || "Document";
        return (
          <div className="mb-2 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-black/20 border border-[#5F9598]/30 max-w-[260px] md:max-w-[280px]">
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0">
              <FileText className="size-5 text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#F3F4F4] truncate font-medium">{guessedName}</p>
            </div>
            <button
              onClick={() => handleDownload(url, guessedName)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title="Download"
            >
              <Download className="size-4 text-teal-400 hover:text-teal-300" />
            </button>
          </div>
        );
      }

      if (isVideo) {
        const guessedName = url.split("/").pop().split("?")[0] || "Video";
        return (
          <div className="mb-2 rounded-lg overflow-hidden border border-[#5F9598]/50 max-w-[280px] md:max-w-[320px]">
            <video src={url} controls className="w-full rounded-lg" preload="metadata" />
            <div className="flex items-center justify-between px-2 py-1.5 bg-black/30">
              <div className="flex items-center gap-1 min-w-0">
                <Play className="size-3 text-purple-300 shrink-0" />
                <span className="text-[10px] text-slate-300 truncate">{guessedName}</span>
              </div>
              <button
                onClick={() => handleDownload(url, guessedName)}
                className="p-1 rounded hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                title="Download"
              >
                <Download className="size-3 text-slate-300 hover:text-white" />
              </button>
            </div>
          </div>
        );
      }

      // It's a real image
      return (
        <div className="mb-2 rounded-lg overflow-hidden border border-[#5F9598]/50 max-w-[280px] md:max-w-[320px]">
          <img
            src={message.image}
            alt="Attachment"
            className="w-full rounded-lg cursor-zoom-in"
            onClick={() => setImagePreview({ url: message.image, name: "image" })}
          />
          <div className="flex items-center justify-end px-2 py-1.5 bg-black/30">
            <button
              onClick={() => handleDownload(message.image, "image")}
              className="p-1 rounded hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title="Download"
            >
              <Download className="size-3 text-slate-300 hover:text-white" />
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const getMessageTranslation = (message) => {
    if (!message?._id) return "";

    const localTranslation = translationsByMessage[message._id]?.[preferredLanguage];
    if (localTranslation) return localTranslation;

    const persistedTranslations = message.translations || {};
    return persistedTranslations[preferredLanguage] || "";
  };

  const handleTranslateMessage = async (message) => {
    if (!message?._id || !message?.text?.trim()) {
      return;
    }

    const existingTranslation = getMessageTranslation(message);
    if (existingTranslation) {
      setShowOriginalByMessage((prev) => ({
        ...prev,
        [message._id]: false,
      }));
      return;
    }

    try {
      setTranslatingByMessage((prev) => ({
        ...prev,
        [message._id]: true,
      }));

      const res = await axiosInstance.post("/messages/translate", {
        messageId: message._id,
        text: message.text,
        targetLanguage: preferredLanguage,
      });

      setTranslationsByMessage((prev) => ({
        ...prev,
        [message._id]: {
          ...(prev[message._id] || {}),
          [preferredLanguage]: res.data.translatedText,
        },
      }));

      setShowOriginalByMessage((prev) => ({
        ...prev,
        [message._id]: false,
      }));
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to translate message");
    } finally {
      setTranslatingByMessage((prev) => ({
        ...prev,
        [message._id]: false,
      }));
    }
  };

  const toggleOriginalMessage = (messageId) => {
    setShowOriginalByMessage((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const renderMessage = (message, idx) => {
    const messageDay = new Date(message.createdAt).toDateString();
    const prevMessage = messages[idx - 1];
    const prevMessageDay = prevMessage
      ? new Date(prevMessage.createdAt).toDateString()
      : null;

    const showDateDivider = idx === 0 || messageDay !== prevMessageDay;
    const isSender = message.senderId === authUser._id;
    const isLast = idx === messages.length - 1;

    const avatarSrc = isGlobalChat
      ? (isSender
          ? authUser.profilePic || "/avatar.png"
          : message.senderProfilePic || "/avatar.png")
      : (isSender
          ? authUser.profilePic || "/avatar.png"
          : selectedUser.profilePic || "/avatar.png");

    const displaySenderName = isGlobalChat
      ? (isSender ? "You" : message.senderName || "Unknown user")
      : null;
    const showAvatar = isGlobalChat;
    const showSideMeta = !isGlobalChat;
    const mediaContent = renderMediaContent(message);
    const isAttachmentOnly = !message.text && Boolean(mediaContent);
    const translatedText = !isSender ? getMessageTranslation(message) : "";
    const isShowingTranslated = Boolean(translatedText) && !showOriginalByMessage[message._id];
    const isTranslating = Boolean(translatingByMessage[message._id]);
    const sideMeta = showSideMeta ? (
      <div className="flex items-center gap-1.5 pb-1 shrink-0">
        {isSender ? (
          <>
            {!message.sendState && <MessageStatusIcon status={message.status} />}
            {!message.sendState && (
              <MessageActions
                message={message}
                isSender={isSender}
                canTranslate={!isSender && Boolean(message.text?.trim())}
                isTranslating={isTranslating}
                isShowingTranslated={isShowingTranslated}
                menuAlign="left"
                onTranslate={() =>
                  isShowingTranslated
                    ? toggleOriginalMessage(message._id)
                    : handleTranslateMessage(message)
                }
              />
            )}
            <span className="text-[10px] md:text-[11px] text-slate-300/85 whitespace-nowrap">
              {formatMessageTime(message.createdAt)}
              {message.isEdited && <span className="ml-1">(edited)</span>}
            </span>
          </>
        ) : (
          <>
            <span className="text-[10px] md:text-[11px] text-slate-300/85 whitespace-nowrap">
              {formatMessageTime(message.createdAt)}
              {message.isEdited && <span className="ml-1">(edited)</span>}
            </span>
            {!message.sendState && (
              <MessageActions
                message={message}
                isSender={isSender}
                canTranslate={!isSender && Boolean(message.text?.trim())}
                isTranslating={isTranslating}
                isShowingTranslated={isShowingTranslated}
                menuAlign="right"
                onTranslate={() =>
                  isShowingTranslated
                    ? toggleOriginalMessage(message._id)
                    : handleTranslateMessage(message)
                }
              />
            )}
          </>
        )}
      </div>
    ) : null;

    return (
      <div key={message._id} className="space-y-2">
        {showDateDivider && (
          <div className="flex justify-center">
            <span className="px-3 py-1 text-[11px] font-medium text-slate-100 bg-slate-900/60 rounded-full border border-slate-500/40 shadow-sm backdrop-blur-sm">
              {formatDate(message.createdAt)}
            </span>
          </div>
        )}
        
        <div
          className={`flex ${isSender ? "justify-end" : "justify-start"}`}
        >
          <div
          className={`flex items-end gap-2 md:gap-3 max-w-[90%] md:max-w-[82%] ${isGlobalChat && isSender ? "flex-row-reverse" : ""} group`}
        >
            {!isSender && sideMeta}

            {showAvatar && (
              <img
                src={avatarSrc}
                alt="profile pic"
                className="size-7 md:size-10 rounded-full border border-cyan-200/25 object-cover ring-2 ring-black/20 shadow-md"
              />
            )}

            <div
              className={`text-[#F3F4F4] transition-all text-sm md:text-base
                ${
                  isAttachmentOnly
                    ? "bg-transparent border-transparent shadow-none p-0"
                    : isSender
                      ? "rounded-2xl px-3 md:px-4 py-2 md:py-3 shadow-lg border backdrop-blur-sm bg-gradient-to-br from-[#3F8A8F] via-[#347579] to-[#2B666A] border-[#8fd9d0]/20"
                      : "rounded-2xl px-3 md:px-4 py-2 md:py-3 shadow-lg border backdrop-blur-sm bg-gradient-to-br from-[#2A6883] via-[#1F5B75] to-[#194D66] border-[#8acde8]/20"
                }`}
            >
              
              {/* Render media (image / video / document) */}
              {mediaContent}

              {displaySenderName && (
                <p className="text-[11px] font-medium text-cyan-200 mb-1 truncate">
                  {displaySenderName}
                </p>
              )}

              {message.text && (
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2 md:gap-3">
                    <span className="whitespace-pre-wrap wrap-break-words leading-relaxed flex-1 text-[15px] md:text-base">
                      {message.text}
                    </span>
                  </div>

                  {isGlobalChat && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
                      {isSender && !message.sendState && <MessageStatusIcon status={message.status} />}
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] md:text-[11px] text-slate-200/80 whitespace-nowrap">
                          {formatMessageTime(message.createdAt)}
                          {message.isEdited && <span className="ml-1">(edited)</span>}
                        </span>
                        {!message.sendState && (
                          <MessageActions
                            message={message}
                            isSender={isSender}
                            canTranslate={!isSender && Boolean(message.text?.trim())}
                            isTranslating={isTranslating}
                            isShowingTranslated={isShowingTranslated}
                            menuAlign={isSender ? "left" : "right"}
                            onTranslate={() =>
                              isShowingTranslated
                                ? toggleOriginalMessage(message._id)
                                : handleTranslateMessage(message)
                            }
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {isShowingTranslated && (
                    <div className="mt-1 rounded-xl px-3 py-2 bg-black/20 border border-cyan-100/20">
                      <p className="text-[10px] uppercase tracking-wide text-cyan-100/90 mb-1">
                        Translated
                      </p>
                      <p className="text-[13px] md:text-sm text-cyan-50/95 italic leading-relaxed whitespace-pre-wrap wrap-break-words">
                        {translatedText}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!message.text && isGlobalChat && (
                <div className="flex items-center justify-end gap-1.5 md:gap-2 pt-1 border-t border-white/10">
                  <span className="text-[10px] md:text-[11px] text-slate-200/80">
                    {formatMessageTime(message.createdAt)}
                  </span>
                  {isSender && !message.sendState && <MessageStatusIcon status={message.status} />}
                  {!message.sendState && (
                    <MessageActions
                      message={message}
                      isSender={isSender}
                      canTranslate={!isSender && Boolean(message.text?.trim())}
                      isTranslating={isTranslating}
                      isShowingTranslated={isShowingTranslated}
                      menuAlign={isSender ? "left" : "right"}
                      onTranslate={() =>
                        isShowingTranslated
                          ? toggleOriginalMessage(message._id)
                          : handleTranslateMessage(message)
                      }
                    />
                  )}
                </div>
              )}
            </div>

            {isSender && sideMeta}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-4 scrollbar-thin">
      {messages.map((message, idx) => renderMessage(message, idx))}

      {imagePreview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3"
          onClick={() => setImagePreview(null)}
        >
          <div
            className="relative max-w-[95vw] max-h-[90vh]"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={imagePreview.url}
              alt={imagePreview.name || "Image preview"}
              className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg border border-slate-700"
            />

            <div className="absolute top-2 right-2 flex items-center gap-2">
              <button
                onClick={() => handleDownload(imagePreview.url, imagePreview.name || "image")}
                className="p-2 rounded-lg bg-black/60 hover:bg-black/80 transition-colors"
                title="Download"
              >
                <Download className="size-4 text-white" />
              </button>
              <button
                onClick={() => setImagePreview(null)}
                className="p-2 rounded-lg bg-black/60 hover:bg-black/80 transition-colors"
                title="Close"
              >
                <X className="size-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      <TypingIndicator />
      <div ref={messageEndRef} />
    </div>
  );
};

export default Messages;