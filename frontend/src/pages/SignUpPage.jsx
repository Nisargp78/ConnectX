import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const { signup, isSigningUp } = useAuthStore();

  const validateForm = () => {
    if (!formData.fullName.trim()) return toast.error("Full name is required");
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Invalid email format");
    if (!formData.password) return toast.error("Password is required");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const success = validateForm();

    if (success === true) signup(formData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/208856.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      <div className="relative z-10 w-full max-w-lg backdrop-blur-3xl rounded-3xl shadow-2xl border border-gray-400/20 overflow-hidden">        
        <div className="grid grid-cols-1 h-full">

          <div className="flex flex-col justify-center items-center p-8 sm:p-12 lg:p-14">
            <div className="w-full max-w-md space-y-6">
  
              <div className="text-center mb-4">
                <div className="flex flex-col items-center group">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
                    <div className="relative p-1 w-18 h-18 rounded-2xl bg-slate-50 flex items-center justify-center">
                      <img src="/CX.png" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-1">
                <h2 className="text-3xl font-bold text-gray-200">Create Account</h2>
                <p className="text-gray-400 tracking-wider">Welcome to ConnectX</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-sm text-gray-100 tracking-wide">Full Name</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-500 group-focus-within:text-white transition-colors" />
                    </div>
                    <input
                      type="text"
                      className="input input-bordered w-full pl-12 h-12 rounded-xl bg-white/5 border-gray-300 focus:ring-1 focus:ring-white/20 focus:shadow-lg transition-all outline-none"
                      placeholder="Full Name"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-sm text-gray-100 tracking-wide">Email Address</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-white transition-colors" />
                    </div>
                    <input
                      type="email"
                      className="input input-bordered w-full pl-12 h-12 rounded-xl bg-white/5 border-gray-300 focus:ring-1 focus:ring-white/20 focus:shadow-lg transition-all outline-none"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-sm text-gray-100 tracking-wide">Password</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-white transition-colors" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="input input-bordered w-full pl-12 h-12 rounded-xl bg-white/5 border-gray-300 focus:ring-1 focus:ring-white/5 transition-all outline-none"
                      placeholder="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* SignUp Button */}
                <button
                  type="submit"
                  className="w-full h-12 rounded-xl text-base font-semibold bg-linear-to-r from-[#5e5f1e]/80 to-[#3d1100]/80 hover:scale-[1.02] transition-all mt-3"
                  disabled={isSigningUp}
                >Sign Up
                </button>
              </form>

              {/* Login link */}
              <div className="text-center">
                <p className="text-gray-400">
                  Already have an account?{" "}
                  <Link to="/login" className="font-semibold text-amber-600 hover:text-amber-900 transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SignUpPage;
