import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";

import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime , formatDate} from "../lib/format";
import MessageActions from "./MessageActions";

const Messages = () => {
   const {
    messages,
    getMessages,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

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
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const renderMessage = (message, idx) => {
    const messageDay = new Date(message.createdAt).toDateString();
    const prevMessage = messages[idx - 1];
    const prevMessageDay = prevMessage
      ? new Date(prevMessage.createdAt).toDateString()
      : null;

    const showDateDivider = idx === 0 || messageDay !== prevMessageDay;
    const isSender = message.senderId === authUser._id;
    const isLast = idx === messages.length - 1;

    const avatarSrc = isSender
      ? authUser.profilePic || "/avatar.png"
      : selectedUser.profilePic || "/avatar.png";

    return (
      <div key={message._id} className="space-y-2">
        {showDateDivider && (
          <div className="flex justify-center">
            <span className="px-3 py-1 text-[11px] font-medium text-slate-200 bg-slate-700/40 rounded-full border border-slate-600/60">
              {formatDate(message.createdAt)}
            </span>
          </div>
        )}
        
        <div
          className={`flex ${isSender ? "justify-end" : "justify-start"}`}
          ref={isLast ? messageEndRef : null}
        >
          <div
          className={`flex items-end gap-2 md:gap-3 max-w-[85%] md:max-w-[80%] ${isSender ? "flex-row-reverse" : ""} group`}
        >
            <img
              src={avatarSrc}
              alt="profile pic"
              className="size-7 md:size-10 rounded-full border-2 border-slate-700/50 object-cover ring-2 ring-slate-700/30"
            />

            <div
              className={`rounded-2xl px-2.5 md:px-4 py-1.5 md:py-2.5 text-[#F3F4F4] transition-all text-sm md:text-base 
                ${isSender ? " bg-[#347579]" : "bg-[#1D546D]"}`}
            >
              
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-55 rounded-lg mb-2 border border-[#5F9598]/50"
                />
              )}

              {message.text && (
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between gap-1 md:gap-2 flex-wrap">
                    <span className="whitespace-pre-wrap wrap-break-words leading-relaxed flex-1 text-sm md:text-base">
                      {message.text}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] md:text-[11px] text-slate-300/80 whitespace-nowrap">
                        {formatMessageTime(message.createdAt)}
                        {message.isEdited && <span className="ml-1">(edited)</span>}
                      </span>
                      <MessageActions
                        message={message}
                        isSender={isSender}
                      />
                    </div>
                  </div>
                </div>
              )}

              {!message.text && (
                <div className="flex items-center justify-end gap-1 md:gap-2">
                  <span className="text-[10px] md:text-[11px] text-slate-300/80">
                    {formatMessageTime(message.createdAt)}
                  </span>
                  <MessageActions
                    message={message}
                    isSender={isSender}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-4 scrollbar-thin scrollbar-thumb-[#347579] scrollbar-track-[#061E29] hover:scrollbar-thumb-[#3d8589]">
      {messages.map((message, idx) => renderMessage(message, idx))}
    </div>
  );
};

export default Messages;