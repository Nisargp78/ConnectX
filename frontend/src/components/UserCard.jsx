const UserCard = ({ user, selectedUser, onlineUsers, onClick }) => {
  const isSelected = selectedUser?._id === user._id;
  const isOnline = onlineUsers.includes(user._id);

  return (
    <button
      onClick={() => onClick(user)}
      className={`w-full p-3 flex items-center justify-center gap-3 rounded-lg transition-all duration-200 cursor-pointer ${
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
      </div>

      <div className="hidden lg:block text-left min-w-0 flex-1">
        <div className="font-light truncate text-[#F3F4F4]">
          {user.fullName}
        </div>
      </div>
    </button>
  );
};

export default UserCard;