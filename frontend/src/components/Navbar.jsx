import { Link, NavLink } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, MessageSquare, User, Globe } from "lucide-react";
import { useChatStore, GLOBAL_CHAT_USER, GLOBAL_CHAT_ID } from "../store/useChatStore";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";

const Navbar = () => {
  const { logout } = useAuthStore();
  const { setSelectedUser, selectedUser } = useChatStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isGlobalChatActive = selectedUser?._id === GLOBAL_CHAT_ID && location.pathname === "/";

  const openGlobalChat = () => {
    setSelectedUser(GLOBAL_CHAT_USER);
    navigate("/");
  };

  const openChats = () => {
    if (isGlobalChatActive) {
      setSelectedUser(null);
    }
  };

  const openProfile = () => {
    if (selectedUser?._id === GLOBAL_CHAT_ID) {
      setSelectedUser(null);
    }
  };

  return (
    <>
      <nav
        className="hidden md:fixed md:flex md:left-0 md:top-0 md:h-screen md:w-20 bg-[#061E29] border-r border-[#F3F4F4]/5 
      backdrop-blur-md shadow-2xl flex-col z-40"
      >
        <div className="flex items-center justify-center gap-3 p-4 border-b border-slate-700/50 h-20">
          <Link
            to="/"
            className="flex items-center justify-center hover:opacity-80 transition-all w-full"
          >
            <div className="size-12 rounded-lg bg-slate-50 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <img src="/CX.png" className="p-1" alt="ConnectX" />
              <span className="hidden">ConnectX</span>
            </div>
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center gap-2 p-4">
          <>
            <NavLink
              to={"/"}
              onClick={openChats}
              className={({ isActive }) =>
                `w-12 h-12 flex items-center justify-center gap-3 rounded-lg transition-all group hover:bg-[#1D546D]/50 hover:text-[#F3F4F4] ${
                  isActive && !isGlobalChatActive ? "bg-[#1D546D] text-[#F3F4F4]" : "text-[#5F9598]"
                }`
              }
              title="Chats"
            >
              <MessageSquare className="size-5 shrink-0" />
              <span className="hidden">Chats</span>
            </NavLink>
            <NavLink
              to={"/profile"}
              onClick={openProfile}
              className={({ isActive }) =>
                `w-12 h-12 flex items-center justify-center gap-3 rounded-lg transition-all group hover:bg-[#1D546D]/50 hover:text-[#F3F4F4] ${
                  isActive ? "bg-[#1D546D] text-[#F3F4F4]" : "text-[#5F9598]"
                }`
              }
              title="Profile"
            >
              <User className="size-5 shrink-0" />
              <span className="hidden">Profile</span>
            </NavLink>
            <button
              onClick={openGlobalChat}
              className={`w-12 h-12 flex items-center justify-center gap-3 rounded-lg transition-all group hover:bg-[#1D546D]/50 hover:text-[#F3F4F4] cursor-pointer ${
                isGlobalChatActive ? "bg-[#1D546D] text-[#F3F4F4]" : "text-[#5F9598]"
              }`}
              title="Global Chat"
            >
              <Globe className="size-5 shrink-0" />
              <span className="hidden">Global Chat</span>
            </button>
          </>
        </div>

        <div className="border-t border-slate-700/50 p-4">
          <button
            onClick={logout}
            className="cursor-pointer w-12 h-12 flex items-center justify-center gap-3 rounded-lg text-[#5F9598] hover:bg-[#1D546D]  hover:text-[#F3F4F4] transition-all"
            title="Logout"
          >
            <LogOut className="size-5 shrink-0" />
            <span className="hidden">Logout</span>
          </button>
        </div>
      </nav>

      {/* Mobile Navbar - Horizontal on Top */}
      <nav className="md:hidden fixed top-0 left-0 right-0 bg-[#061E29] border-b border-[#F3F4F4]/5 backdrop-blur-md shadow-2xl z-40">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center hover:opacity-80 transition-all"
            >
              <div className="size-10 rounded-lg bg-slate-50 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <img src="/CX.png" className="p-1" alt="ConnectX" />
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-2">
              <NavLink
                to={"/"}
                onClick={openChats}
                className={({ isActive }) =>
                  `w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:bg-[#1D546D]/50 hover:text-[#F3F4F4] ${
                    isActive && !isGlobalChatActive ? "bg-[#1D546D] text-[#F3F4F4]" : "text-[#5F9598]"
                  }`
                }
                title="Chats"
              >
                <MessageSquare className="size-5 shrink-0" />
              </NavLink>
              <NavLink
                to={"/profile"}
                onClick={openProfile}
                className={({ isActive }) =>
                  `w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:bg-[#1D546D]/50 hover:text-[#F3F4F4] ${
                    isActive ? "bg-[#1D546D] text-[#F3F4F4]" : "text-[#5F9598]"
                  }`
                }
                title="Profile"
              >
                <User className="size-5 shrink-0" />
              </NavLink>
              <button
                onClick={openGlobalChat}
                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:bg-[#1D546D]/50 hover:text-[#F3F4F4] ${
                  isGlobalChatActive ? "bg-[#1D546D] text-[#F3F4F4]" : "text-[#5F9598]"
                }`}
                title="Global Chat"
              >
                <Globe className="size-5 shrink-0" />
              </button>
              <button
                onClick={logout}
                className="cursor-pointer w-10 h-10 flex items-center justify-center rounded-lg text-[#5F9598] hover:bg-[#1D546D] hover:text-[#F3F4F4] transition-all"
                title="Logout"
              >
                <LogOut className="size-5 shrink-0" />
              </button>
            </div>
          </div>
        </nav>
    </>
  );
};
export default Navbar;