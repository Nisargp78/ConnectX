import { useEffect, useMemo, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  Search,
  ArrowLeft,
  MessageSquarePlus,
  UserPlus,
  Users,
  X,
  Check,
} from "lucide-react";
import UserCard from "./UserCard";
import { SIDEBAR_MODE_CHATS, SIDEBAR_MODE_GROUPS } from "../store/useChatStore";

const Sidebar = () => {
  const {
    getUsers,
    getGroups,
    getAllUsers,
    createGroup,
    users,
    groups,
    allUsers,
    unreadCounts,
    selectedUser,
    setSelectedUser,
    startNewChat,
    sidebarMode,
    setSidebarMode,
    isUsersLoading,
    isGroupsLoading,
    isAllUsersLoading,
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewChatMode, setIsNewChatMode] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const isGroupsMode = sidebarMode === SIDEBAR_MODE_GROUPS;

  const selectedMembers = useMemo(
    () => allUsers.filter((user) => selectedMemberIds.includes(user._id)),
    [allUsers, selectedMemberIds]
  );

  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return allUsers;

    const query = memberSearchQuery.toLowerCase();
    return allUsers.filter((user) => {
      const matchesName = user.fullName.toLowerCase().includes(query);
      const matchesEmail = user.email.toLowerCase().includes(query);
      return matchesName || matchesEmail;
    });
  }, [allUsers, memberSearchQuery]);

  useEffect(() => {
    getUsers();
    getGroups();
  }, [getUsers, getGroups]);

  const visibleUsers = useMemo(() => {
    const conversationUserIds = new Set(users.map((user) => user._id));

    if (isGroupsMode) {
      return groups;
    }

    if (isNewChatMode) {
      return allUsers.filter((user) => !conversationUserIds.has(user._id));
    }
    return users;
  }, [allUsers, groups, isGroupsMode, isNewChatMode, users]);

  const filteredUsers = visibleUsers.filter((user) => {
    if (isGroupsMode) {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const groupNameValue = (user.fullName || user.name || "").toLowerCase();
      return groupNameValue.includes(query);
    }

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
    if (isGroupsMode) {
      setSidebarMode(SIDEBAR_MODE_CHATS);
      return;
    }

    const nextMode = !isNewChatMode;
    setIsNewChatMode(nextMode);
    setSearchQuery("");

    if (nextMode && allUsers.length === 0) {
      await getAllUsers();
    }
  };

  const handleUserSelect = (user) => {
    if (user?.isGroup) {
      setSelectedUser(user);
      return;
    }

    if (isNewChatMode) {
      startNewChat(user);
      setIsNewChatMode(false);
      return;
    }

    setSelectedUser(user);
  };

  const openCreateGroupModal = async () => {
    if (allUsers.length === 0) {
      await getAllUsers();
    }
    setShowCreateGroupModal(true);
  };

  const closeCreateGroupModal = () => {
    setShowCreateGroupModal(false);
    setGroupName("");
    setGroupDescription("");
    setSelectedMemberIds([]);
    setMemberSearchQuery("");
  };

  const toggleMember = (memberId) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMemberIds.length === 0) {
      return;
    }

    const createdGroup = await createGroup({
      name: groupName,
      description: groupDescription,
      memberIds: selectedMemberIds,
    });

    if (createdGroup) {
      setSidebarMode(SIDEBAR_MODE_GROUPS);
      setSelectedUser(createdGroup);
      closeCreateGroupModal();
    }
  };

  return (
    <>
      <aside className="h-full w-20 lg:w-72 border-r border-slate-700/50 flex flex-col transition-all duration-200 bg-[#0b2434]">
      <div className="border-b border-slate-700/50 w-full p-5 bg-linear-to-b from-slate-800/10 to-transparent">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold hidden text-2xl lg:block text-[#F3F4F4]">
            {isGroupsMode ? "Groups" : "Chats"}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={openCreateGroupModal}
              className="p-2 hover:bg-[#5F9598]/20 rounded-lg transition-colors text-[#F3F4F4] cursor-pointer"
              title="Create Group"
            >
              <Users className="size-6" />
            </button>
            <button
              onClick={handleToggleNewChatMode}
              className="p-2 hover:bg-[#5F9598]/20 rounded-lg transition-colors text-[#F3F4F4] cursor-pointer"
              title={isNewChatMode ? "Back to chats" : "New Chat"}
            >
              {isNewChatMode ? <ArrowLeft className="size-7" /> : <MessageSquarePlus className="size-7" />}
            </button>
          </div>
        </div>

        <div className="mt-3 hidden lg:flex items-center gap-2">
          <button
            onClick={() => setSidebarMode(SIDEBAR_MODE_CHATS)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
              !isGroupsMode
                ? "bg-[#2f75a8] text-white"
                : "bg-[#051923] text-slate-300 hover:bg-[#123446]"
            }`}
          >
            Direct
          </button>
          <button
            onClick={() => setSidebarMode(SIDEBAR_MODE_GROUPS)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
              isGroupsMode
                ? "bg-[#2f75a8] text-white"
                : "bg-[#051923] text-slate-300 hover:bg-[#123446]"
            }`}
          >
            Groups
          </button>
        </div>

        {!isGroupsMode && (
          <div className="mt-6 hidden lg:flex items-center gap-2">
          <label
            htmlFor="hr"
            className="flex flex-row items-center gap-2.5 dark:text-white light:text-black"
          >
            <input
              id="hr"
              type="checkbox"
              className="peer hidden"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
            />
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
        )}

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
        {(isUsersLoading || isGroupsLoading || (isNewChatMode && isAllUsersLoading)) && (
          <div className="text-center text-slate-400 py-6">
            {isGroupsMode ? "Loading groups..." : "Loading users..."}
          </div>
        )}

        {filteredUsers.map((user) => (
          <UserCard
            key={user._id}
            user={user}
            selectedUser={selectedUser}
            onlineUsers={onlineUsers}
            unreadCount={user.isGroup ? 0 : unreadCounts[user._id] || 0}
            onClick={handleUserSelect}
          />
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center text-slate-400 py-6">
            {searchQuery
              ? isGroupsMode
                ? "No groups match your search"
                : "No users match your search"
              : isNewChatMode
                ? "No new users found"
                : isGroupsMode
                  ? "No groups found"
                  : "No users found"}
          </div>
        )}
      </div>
      </aside>

      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#072234] border border-slate-700/70 rounded-2xl p-5 md:p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#F3F4F4]">Create Group</h2>
              <button
                onClick={closeCreateGroupModal}
                className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-300 cursor-pointer"
                title="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#051923] border border-slate-700/50 rounded-lg text-[#F3F4F4] placeholder-slate-500 focus:outline-none focus:border-[#2f75a8]"
              />
              <textarea
                placeholder="Description (optional)"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 bg-[#051923] border border-slate-700/50 rounded-lg text-[#F3F4F4] placeholder-slate-500 focus:outline-none focus:border-[#2f75a8] resize-none"
              />
            </div>

            <div className="mt-5">
              <p className="text-sm text-slate-300 mb-2">Select members</p>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 size-4" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="w-full pl-10 pr-4 py-2 bg-[#051923] border border-slate-700/50 rounded-lg text-[#F3F4F4] placeholder-slate-500 focus:outline-none focus:border-[#2f75a8] focus:ring-1 focus:ring-[#2f75a8]"
                />
              </div>

              <div className="mb-3 px-3 py-2 rounded-lg border border-slate-700/60 bg-[#051923]">
                <p className="text-xs text-slate-400 mb-1">Selected users ({selectedMembers.length})</p>
                <p className="text-sm text-[#F3F4F4] truncate">
                  {selectedMembers.length > 0
                    ? selectedMembers.map((member) => member.fullName).join(", ")
                    : "No users selected"}
                </p>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {filteredMembers.map((user) => {
                  const isSelected = selectedMemberIds.includes(user._id);
                  return (
                    <button
                      type="button"
                      key={user._id}
                      onClick={() => toggleMember(user._id)}
                      className={`w-full px-3 py-2 rounded-lg flex items-center gap-3 text-left border transition-colors cursor-pointer ${
                        isSelected
                          ? "border-[#21b8c0] bg-[#0b445f]/35"
                          : "border-slate-700/60 bg-[#051923] hover:bg-[#0a2a3b]"
                      }`}
                    >
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.fullName}
                        className="size-9 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[#F3F4F4] truncate">{user.fullName}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                      {isSelected ? (
                        <Check className="size-4 text-[#21b8c0]" />
                      ) : (
                        <UserPlus className="size-4 text-slate-500" />
                      )}
                    </button>
                  );
                })}

                {filteredMembers.length === 0 && (
                  <div className="text-center text-slate-400 py-4 text-sm">
                    No users found for "{memberSearchQuery}".
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeCreateGroupModal}
                className="px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedMemberIds.length === 0}
                className="px-4 py-2 rounded-lg bg-[#2f75a8] hover:bg-[#2b6792] text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default Sidebar;
