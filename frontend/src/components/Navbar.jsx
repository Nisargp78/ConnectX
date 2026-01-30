import { Link, NavLink } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, MessageSquare, User } from "lucide-react";

const Navbar = () => {
  const { logout } = useAuthStore();

  return (
    <nav
      className="fixed left-0 top-0 h-screen w-20 bg-[#061E29] border-r border-[#F3F4F4]/5 
    backdrop-blur-md shadow-2xl flex flex-col z-40"
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
            className={({ isActive }) =>
              `w-12 h-12 flex items-center justify-center gap-3 rounded-lg transition-all group hover:bg-[#1D546D]/50 hover:text-[#F3F4F4] ${
                isActive ? "bg-[#1D546D] text-[#F3F4F4]" : "text-[#5F9598]"
              }`
            }
            title="Chats"
          >
            <MessageSquare className="size-5 shrink-0" />
            <span className="hidden">Chats</span>
          </NavLink>
          <NavLink
            to={"/profile"}
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
  );
};
export default Navbar;
