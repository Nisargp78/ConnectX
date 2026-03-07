const UserCard = ({ user, selectedUser, onlineUsers, unreadCount, onClick }) => {
  const isSelected = selectedUser?._id === user._id;
  const isOnline = onlineUsers.includes(user._id);
  const latestMessagePreview = user.latestMessage || "Start a conversation";

  return (
    <button
      onClick={() => onClick(user)}
      className={`w-full p-3 flex items-center justify-center lg:justify-start gap-3 rounded-lg transition-all duration-200 cursor-pointer relative ${
        isSelected
          ? "bg-[#5F9598]/30 border border-[#5F9598] shadow-lg shadow-[#5F9598]/20"
          : "hover:bg-[#5F9598]/8 border border-transparent"
      }`}
    >
      <div className="relative mx-auto lg:mx-0 shrink-0">
        <img
          src={user.profilePic || "/avatar.png"}
          alt={user.fullName}
          className="size-12 object-cover rounded-full ring-2 ring-slate-700/50"
        />
        <span
          className={`absolute bottom-0 right-0 size-3 rounded-full ${
            isOnline ? "bg-[#27b588]" : "bg-[#658789]"
          }`}
        />
        {unreadCount > 0 && (
          <span className="lg:hidden absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-[#21b8c0] text-[#051923] text-[10px] font-semibold flex items-center justify-center border border-[#0b2434]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>

      <div className="hidden lg:block text-left min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="font-light truncate text-[#F3F4F4] text-sm lg:text-base">{user.fullName}</div>
          {unreadCount > 0 && (
            <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#21b8c0] text-[#051923] text-xs font-semibold flex items-center justify-center shrink-0">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <div className="hidden lg:block text-xs text-slate-400 truncate mt-0.5">
          {latestMessagePreview}
        </div>
      </div>
    </button>
  );
};

export default UserCard;