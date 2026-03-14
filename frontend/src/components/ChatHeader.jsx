import { useMemo, useState } from "react";
import { Search, UserPlus, LogOut, Trash2, X, Check, Crown, UserMinus } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formateDateTime } from "../lib/format";
import { GLOBAL_CHAT_ID } from "../store/useChatStore";

const ChatHeader = () => {
  const {
    selectedUser,
    setSelectedUser,
    allUsers,
    getAllUsers,
    addMembersToGroup,
    promoteMemberToAdmin,
    removeMemberFromGroup,
    leaveGroup,
    deleteGroup,
  } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const isGlobalChat = selectedUser?._id === GLOBAL_CHAT_ID;
  const isGroupChat = Boolean(selectedUser?.isGroup);
  const groupMemberCount = selectedUser?.memberCount || selectedUser?.members?.length || 0;
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [pendingMemberIds, setPendingMemberIds] = useState([]);

  const ownerId = selectedUser?.adminId || selectedUser?.createdById || selectedUser?.createdBy?._id || selectedUser?.createdBy || selectedUser?.admin?._id || selectedUser?.admin;
  const adminIds = Array.isArray(selectedUser?.adminIds)
    ? selectedUser.adminIds.map((id) => id?.toString?.() || String(id)).filter(Boolean)
    : ownerId
      ? [ownerId?.toString?.() || String(ownerId)]
      : [];
  const authUserId = authUser?._id?.toString?.() || "";
  const isGroupAdmin = Boolean(isGroupChat && authUserId && adminIds.includes(authUserId));

  const filteredMembers = useMemo(() => {
    const members = selectedUser?.members || [];
    if (!memberSearch.trim()) return members;

    const query = memberSearch.toLowerCase();
    return members.filter((member) => {
      const name = (member.fullName || "").toLowerCase();
      const email = (member.email || "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [memberSearch, selectedUser?.members]);

  const addableUsers = useMemo(() => {
    if (!isGroupChat) return [];
    const memberIds = new Set((selectedUser?.members || []).map((member) => member._id));
    let candidates = allUsers.filter((user) => !memberIds.has(user._id));

    if (addMemberSearch.trim()) {
      const query = addMemberSearch.toLowerCase();
      candidates = candidates.filter((user) => {
        const name = (user.fullName || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    }

    return candidates;
  }, [addMemberSearch, allUsers, isGroupChat, selectedUser?.members]);

  const openGroupPanel = () => {
    if (!isGroupChat) return;
    setShowGroupPanel(true);
  };

  const closeGroupPanel = () => {
    setShowGroupPanel(false);
    setMemberSearch("");
    setShowAddMembers(false);
    setAddMemberSearch("");
    setPendingMemberIds([]);
  };

  const openAddMembers = async () => {
    if (!isGroupAdmin) return;
    if (allUsers.length === 0) {
      await getAllUsers();
    }
    setShowAddMembers(true);
  };

  const togglePendingMember = (memberId) => {
    setPendingMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleAddMembers = async () => {
    if (!selectedUser?._id || pendingMemberIds.length === 0) return;

    const updated = await addMembersToGroup(selectedUser._id, pendingMemberIds);
    if (updated) {
      setShowAddMembers(false);
      setPendingMemberIds([]);
      setAddMemberSearch("");
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedUser?._id) return;
    const ok = await leaveGroup(selectedUser._id);
    if (ok) {
      closeGroupPanel();
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedUser?._id) return;
    const confirmed = window.confirm("Delete this group and all its messages permanently?");
    if (!confirmed) return;

    const ok = await deleteGroup(selectedUser._id);
    if (ok) {
      closeGroupPanel();
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!selectedUser?._id || !memberId) return;
    const confirmed = window.confirm("Remove this member from the group?");
    if (!confirmed) return;

    await removeMemberFromGroup(selectedUser._id, memberId);
  };

  const handlePromoteToAdmin = async (memberId) => {
    if (!selectedUser?._id || !memberId) return;
    await promoteMemberToAdmin(selectedUser._id, memberId);
  };

  return (
    <>
      <div className={`p-4 border-b border-slate-700/50 sticky top-0 z-10 backdrop-blur-sm ${isGlobalChat ? "bg-[#102638]" : "bg-[#051923]"}`}>
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
            {!isGlobalChat && !isGroupChat && (
              <span
                className={`absolute bottom-0 right-0 size-3 rounded-full ${
                  onlineUsers.includes(selectedUser._id)
                    ? "bg-emerald-500"
                    : "bg-slate-500"
                }`}
              />
            )}
          </div>

          <button
            type="button"
            onClick={openGroupPanel}
            disabled={!isGroupChat}
            className={`text-left ${isGroupChat ? "cursor-pointer" : "cursor-default"}`}
          >
            <h3 className="font-semibold text-[#F3F4F4]">{selectedUser.fullName}</h3>
            <p className="text-sm text-[#F3F4F4]/40 tracking-wide">
              {isGlobalChat
                ? "Broadcast room for all users"
                : isGroupChat
                  ? `${groupMemberCount} ${groupMemberCount === 1 ? "member" : "members"}`
                : onlineUsers.includes(selectedUser._id)
                  ? "Online"
                  : selectedUser.lastActive
                    ? `last active at ${formateDateTime(selectedUser.lastActive)}`
                    : "last active unknown"}
            </p>
          </button>
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

      {showGroupPanel && isGroupChat && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#072234] border border-slate-700/70 rounded-2xl p-5 md:p-6 max-h-[88vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#F3F4F4]">Group Info</h2>
              <button
                onClick={closeGroupPanel}
                className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-300 cursor-pointer"
                title="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-700/60 bg-[#051923] mb-4">
              <img
                src={selectedUser.profilePic || "/avatar.png"}
                alt={selectedUser.fullName}
                className="size-12 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p className="text-[#F3F4F4] font-semibold truncate">{selectedUser.fullName}</p>
                <p className="text-xs text-slate-400">Created on {formateDateTime(selectedUser.createdAt || selectedUser.updatedAt)}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-300 mb-2">Members ({groupMemberCount})</p>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 size-4" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search group members..."
                  className="w-full pl-10 pr-4 py-2 bg-[#051923] border border-slate-700/50 rounded-lg text-[#F3F4F4] placeholder-slate-500 focus:outline-none focus:border-[#2f75a8]"
                />
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                {filteredMembers.map((member) => {
                  const isOnline = onlineUsers.includes(member._id);
                  const memberId = member._id?.toString?.() || String(member._id);
                  const isMemberAdmin = adminIds.includes(memberId);
                  const canRemoveMember = isGroupAdmin && !isMemberAdmin;
                  const canPromoteMember = isGroupAdmin && !isMemberAdmin && adminIds.length < 6;
                  return (
                    <div
                      key={member._id}
                      className="w-full px-3 py-2 rounded-lg flex items-center gap-3 border border-slate-700/60 bg-[#051923]"
                    >
                      <div className="relative">
                        <img
                          src={member.profilePic || "/avatar.png"}
                          alt={member.fullName}
                          className="size-9 rounded-full object-cover"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border border-[#051923] ${
                            isOnline ? "bg-emerald-500" : "bg-slate-500"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[#F3F4F4] truncate">{member.fullName}</p>
                          {isMemberAdmin && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-[10px] text-amber-200">
                              <Crown className="size-3" />
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{member.email}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        {canPromoteMember && (
                          <button
                            type="button"
                            onClick={() => handlePromoteToAdmin(member._id)}
                            className="px-2 py-1 rounded-md hover:bg-amber-600/20 text-amber-300 hover:text-amber-200 transition-colors text-xs cursor-pointer"
                            title="Promote to admin"
                          >
                            Make Admin
                          </button>
                        )}

                        {canRemoveMember && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member._id)}
                            className="p-2 rounded-lg hover:bg-rose-600/20 text-rose-300 hover:text-rose-200 transition-colors cursor-pointer"
                            title="Remove member"
                          >
                            <UserMinus className="size-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              {isGroupAdmin && (
                <>
                  <button
                    onClick={openAddMembers}
                    className="w-full px-3 py-2 rounded-lg flex items-center justify-center gap-2 bg-[#0b445f] hover:bg-[#125f7a] text-[#F3F4F4] transition-colors cursor-pointer"
                  >
                    <UserPlus className="size-4" />
                    Add Member
                  </button>

                  <button
                    onClick={handleDeleteGroup}
                    className="w-full px-3 py-2 rounded-lg flex items-center justify-center gap-2 bg-rose-700/70 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                    Delete Group
                  </button>
                </>
              )}

              <button
                onClick={handleLeaveGroup}
                className="w-full px-3 py-2 rounded-lg flex items-center justify-center gap-2 bg-amber-700/70 hover:bg-amber-700 text-white transition-colors cursor-pointer"
              >
                <LogOut className="size-4" />
                Leave Group
              </button>
            </div>
          </div>

          {showAddMembers && (
            <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-xl bg-[#072234] border border-slate-700/70 rounded-2xl p-5 md:p-6 max-h-[85vh] overflow-y-auto scrollbar-thin">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#F3F4F4]">Add Members</h3>
                  <button
                    onClick={() => {
                      setShowAddMembers(false);
                      setPendingMemberIds([]);
                      setAddMemberSearch("");
                    }}
                    className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-300 cursor-pointer"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 size-4" />
                  <input
                    type="text"
                    value={addMemberSearch}
                    onChange={(e) => setAddMemberSearch(e.target.value)}
                    placeholder="Search users to add..."
                    className="w-full pl-10 pr-4 py-2 bg-[#051923] border border-slate-700/50 rounded-lg text-[#F3F4F4] placeholder-slate-500 focus:outline-none focus:border-[#2f75a8]"
                  />
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                  {addableUsers.map((user) => {
                    const isSelected = pendingMemberIds.includes(user._id);
                    return (
                      <button
                        type="button"
                        key={user._id}
                        onClick={() => togglePendingMember(user._id)}
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

                  {addableUsers.length === 0 && (
                    <div className="text-center text-slate-400 py-4 text-sm">No users available to add.</div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMembers(false);
                      setPendingMemberIds([]);
                      setAddMemberSearch("");
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMembers}
                    disabled={pendingMemberIds.length === 0}
                    className="px-4 py-2 rounded-lg bg-[#2f75a8] hover:bg-[#2b6792] text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Add Members
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
export default ChatHeader;
