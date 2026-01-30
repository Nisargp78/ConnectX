import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User, Lock, Edit2, X } from "lucide-react";
import toast from "react-hot-toast";
import {formatDate} from '../lib/format';

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [fullName, setFullName] = useState(authUser?.fullName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Picture size should be less than 5MB");
      return;
    }

    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  const handleUpdateName = async () => {
    if (!fullName.trim() || fullName === authUser?.fullName) {
      setIsEditingName(false);
      setFullName(authUser?.fullName);
      return;
    }
    await updateProfile({ fullName });
    setIsEditingName(false);
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("Please fill all password fields");
      return;
    }
    
    await updateProfile({ currentPassword, newPassword });
    setCurrentPassword("");
    setNewPassword("");
    setIsEditingPassword(false);
  };

  const cancelPasswordEdit = () => {
    setCurrentPassword("");
    setNewPassword("");
    setIsEditingPassword(false);
  };

  const cancelNameEdit = () => {
    setFullName(authUser?.fullName);
    setIsEditingName(false);
  };

  return (
    <div className="min-h-screen bg-[#042230] pt-4">
      <div className="max-w-xl mx-auto p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          <div className="relative h-26 bg-linear-to-r from-blue-600/20 via-purple-600/20 to-indigo-600/20">
            <div className="absolute inset-0 bg-linear-to-b from-transparent to-slate-800/50"></div>
          </div>

          <div className="px-4 pb-6">
            <div className="flex flex-col items-center -mt-12 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-600/30 rounded-full blur-xl"></div>
                <img
                  src={selectedImg || authUser.profilePic || "/avatar.png"}
                  alt="Profile"
                  className="relative size-24 rounded-full object-cover border-4 border-slate-800 shadow-xl"
                />
                <label
                  htmlFor="avatar-upload"
                  className={`
                    absolute bottom-0 right-0 
                    bg-[#125e8e] hover:opacity-80
                    p-2 rounded-full cursor-pointer 
                    transition-all duration-200 shadow-lg
                    hover:scale-110
                    ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}
                  `}
                >
                  <Camera className="w-4 h-4 text-white" />
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUpdatingProfile}
                  />
                </label>
              </div>
            </div>

            <div className="text-center mb-4">
              <p className="text-sm text-gray-400">
                Manage your account information
              </p>
            </div>

            {/* User Information Cards */}
            <div className="space-y-3 mb-4">
              {/* Full Name Card */}
              <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50 hover:border-blue-600/50 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-600/20 rounded-lg">
                      <User className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-sm text-gray-400 font-medium">
                      Full Name
                    </span>
                  </div>
                  {!isEditingName && (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors"
                      disabled={isUpdatingProfile}
                    >
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
                {isEditingName ? (
                  <div className="pl-12 space-y-2">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-800 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Enter your full name"
                      disabled={isUpdatingProfile}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateName}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        disabled={isUpdatingProfile}
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelNameEdit}
                        className="px-4 bg-slate-700 hover:bg-slate-600 text-white py-1.5 rounded-lg transition-colors"
                        disabled={isUpdatingProfile}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="pl-12 text-gray-200 font-medium">
                    {authUser?.fullName}
                  </p>
                )}
              </div>

              {/* Email Card */}
              <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50 hover:border-purple-600/50 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-2 bg-purple-600/20 rounded-lg">
                    <Mail className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-sm text-gray-400 font-medium">
                    Email Address
                  </span>
                </div>
                <p className="pl-12 text-gray-200 font-medium">
                  {authUser?.email}
                </p>
              </div>

              {/* Password Card */}
              <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50 hover:border-green-600/50 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-600/20 rounded-lg">
                      <Lock className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-sm text-gray-400 font-medium">
                      Password
                    </span>
                  </div>
                  {!isEditingPassword && (
                    <button
                      onClick={() => setIsEditingPassword(true)}
                      className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors"
                      disabled={isUpdatingProfile}
                    >
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
                {isEditingPassword ? (
                  <div className="pl-12 space-y-2">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-slate-800 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
                      placeholder="Current password"
                      disabled={isUpdatingProfile}
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-800 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
                      placeholder="New password (min 6 characters)"
                      disabled={isUpdatingProfile}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdatePassword}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        disabled={isUpdatingProfile}
                      >
                        Update Password
                      </button>
                      <button
                        onClick={cancelPasswordEdit}
                        className="px-4 bg-slate-700 hover:bg-slate-600 text-white py-1.5 rounded-lg transition-colors"
                        disabled={isUpdatingProfile}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="pl-12 text-gray-200 font-medium">
                    ••••••••
                  </p>
                )}
              </div>
            </div>

            {/* Account Information Section */}
            <div className="bg-linear-to-br from-slate-900/80 to-slate-800/80 rounded-xl p-4 border border-slate-700/50">
              <h2 className="text-base font-semibold text-gray-100 mb-3 flex items-center gap-2">
                <div className="w-1 h-5 bg-linear-to-b from-blue-600 to-purple-600 rounded-full"></div>
                Account Information
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                  <span className="text-gray-400">Member Since</span>
                  <span className="text-gray-200 font-medium">
                    {authUser.createdAt? formatDate(authUser.createdAt) : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-400">Account Status</span>
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
