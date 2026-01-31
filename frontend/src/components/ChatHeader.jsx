import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formateDateTime } from "../lib/format";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  return (
    <div className="p-4 border-b border-slate-700/50 bg-[#051923] sticky top-15 md:top-0 z-10 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="size-12 rounded-full overflow-hidden border border-blue-500/50 ring-2 ring-blue-500/20 shadow-md shadow-[#5F9598]">
              <img
                src={selectedUser.profilePic || "/avatar.png"}
                alt={selectedUser.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            <span 
              className={`absolute bottom-0 right-0 size-3 rounded-full ${
                onlineUsers.includes(selectedUser._id) 
                  ? "bg-emerald-500" 
                  : "bg-slate-500"
              }`} 
            />
          </div>

          {/* User info */}
          <div>
            <h3 className="font-semibold text-[#F3F4F4]">{selectedUser.fullName}</h3>
            <p className="text-sm text-[#F3F4F4]/40 tracking-wide">
              {onlineUsers.includes(selectedUser._id)
                ? "Online"
                : selectedUser.lastActive
                  ? `last active at ${formateDateTime(selectedUser.lastActive)}`
                  : "last active unknown"}
            </p>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => setSelectedUser(null)}
          className="p-2 rounded-lg hover:bg-[#1D546D] transition-colors text-[#5F9598] hover:text-[#F3F4F4] cursor-pointer"
          aria-label="Close chat"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
};
export default ChatHeader;
