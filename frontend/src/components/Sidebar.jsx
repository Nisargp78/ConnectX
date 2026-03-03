import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Search, ArrowLeft, MessageSquarePlus } from "lucide-react";
import UserCard from "./UserCard";

const Sidebar = () => {
  const {
    getUsers,
    getAllUsers,
    users,
    allUsers,
    unreadCounts,
    selectedUser,
    setSelectedUser,
    startNewChat,
    isUsersLoading,
    isAllUsersLoading,
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewChatMode, setIsNewChatMode] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const conversationUserIds = new Set(users.map((user) => user._id));
  const visibleUsers = isNewChatMode
    ? allUsers.filter((user) => !conversationUserIds.has(user._id))
    : users;

  const filteredUsers = visibleUsers.filter((user) => {
    // Filter by online status
    if (showOnlineOnly && !onlineUsers.includes(user._id)) {
      return false;
    }

    // Filter by search query (name or email)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesName = user.fullName.toLowerCase().includes(query);
      const matchesEmail = user.email.toLowerCase().includes(query);
      return matchesName || matchesEmail;
    }

    return true;
  });

  const handleToggleNewChatMode = async () => {
    const nextMode = !isNewChatMode;
    setIsNewChatMode(nextMode);
    setSearchQuery("");

    if (nextMode && allUsers.length === 0) {
      await getAllUsers();
    }
  };

  const handleUserSelect = (user) => {
    if (isNewChatMode) {
      startNewChat(user);
      setIsNewChatMode(false);
      return;
    }

    setSelectedUser(user);
  };

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-slate-700/50 flex flex-col transition-all duration-200 bg-[#0b2434]">
      <div className="border-b border-slate-700/50 w-full p-5 bg-linear-to-b from-slate-800/10 to-transparent">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold hidden text-2xl lg:block text-[#F3F4F4]">
            Chats
          </span>
          <button
            onClick={handleToggleNewChatMode}
            className="p-2 hover:bg-[#5F9598]/20 rounded-lg transition-colors text-[#F3F4F4] cursor-pointer"
            title={isNewChatMode ? "Back to chats" : "New Chat"}
          >
            {isNewChatMode ? <ArrowLeft className="size-7" /> : <MessageSquarePlus className="size-7" />}
          </button>
        </div>

        <div className="mt-6 hidden lg:flex items-center gap-2">
          <label
            htmlFor="hr"
            className="flex flex-row items-center gap-2.5 dark:text-white light:text-black"
            checked={showOnlineOnly}
            onChange={(e) => setShowOnlineOnly(e.target.checked)}
          >
            <input id="hr" type="checkbox" className="peer hidden" />
            <div
              htmlFor="hr"
              className="h-5 w-5 flex rounded-md border border-[#a2a1a833] light:bg-[#e8e8e8] dark:bg-[#e4e4e4] peer-checked:bg-[#2f75a8] transition"
            >
              <svg
                fill="none"
                viewBox="0 0 24 24"
                className="w-5 h-5 light:stroke-[#e8e8e8] dark:stroke-[#e4e4e4]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 12.6111L8.92308 17.5L20 6.5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </div>
            <p className="select-none text-[17px] text-[#F3F4F4]">Show online only</p>
            <span className="text-sm rounded-2xl w-5 h-5 flex items-center justify-center bg-[#0b445f] text-[#21b8c0]">
              {onlineUsers?.length > 0 ? onlineUsers.length - 1 : 0}
            </span>
          </label>
        </div>

        {/* Search bar */}
        <div className="mt-4 hidden lg:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 size-4" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#051923] border border-slate-700/50 rounded-lg text-[#F3F4F4] placeholder-slate-500 focus:outline-none focus:border-[#2f75a8] focus:ring-1 focus:ring-[#2f75a8] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-2 space-y-1 px-2 scrollbar-thin">
        {(isUsersLoading || (isNewChatMode && isAllUsersLoading)) && (
          <div className="text-center text-slate-400 py-6">Loading users...</div>
        )}

        {filteredUsers.map((user) => (
          <UserCard
            key={user._id}
            user={user}
            selectedUser={selectedUser}
            onlineUsers={onlineUsers}
            unreadCount={unreadCounts[user._id] || 0}
            onClick={handleUserSelect}
          />
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center text-slate-400 py-6">
            {searchQuery
              ? "No users match your search"
              : isNewChatMode
                ? "No new users found"
                : "No users found"}
          </div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;
