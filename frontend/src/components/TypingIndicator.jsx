import { useChatStore } from "../store/useChatStore";

const TypingIndicator = () => {
  const { selectedUser, typingUsers } = useChatStore();

  if (!selectedUser || !typingUsers[selectedUser._id]) {
    return null;
  }

  return (
    <div className="flex items-end gap-2 md:gap-3 px-2 md:px-4 pb-2">
      <img
        src={selectedUser.profilePic || "/avatar.png"}
        alt="typing"
        className="size-7 md:size-10 rounded-full border-2 border-slate-700/50 object-cover ring-2 ring-slate-700/30"
      />
      <div className="bg-[#1D546D] rounded-2xl px-4 py-3 flex items-center gap-1">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
