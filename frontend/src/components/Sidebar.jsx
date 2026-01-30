import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Users } from "lucide-react";
import UserCard from "./UserCard";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-slate-700/50 flex flex-col transition-all duration-200 bg-[#0b2434]">
      <div className="border-b border-slate-700/50 w-full p-5 bg-linear-to-b from-slate-800/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg text-[#F3F4F4]">
            <Users className="size-5" />
          </div>
          <span className="font-semibold hidden text-2xl lg:block text-[#F3F4F4]">
            Contacts
          </span>
        </div>

        {/* Filter online users */}
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
      </div>

      <div className="overflow-y-auto w-full py-2 space-y-1 px-2">
        {filteredUsers.map((user) => (
          <UserCard
            key={user._id}
            user={user}
            selectedUser={selectedUser}
            onlineUsers={onlineUsers}
            onClick={setSelectedUser}
          />
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center text-slate-400 py-6">No users found</div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;
