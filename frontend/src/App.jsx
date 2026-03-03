import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import Loading from "./pages/Loading";

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useEffect } from "react";

import { Toaster } from "react-hot-toast";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-[#061E29] text-slate-100 transition-colors">
      {authUser && <Navbar />}

      <div className={authUser ? "md:ml-20 pt-16 md:pt-0" : ""}>
        <Routes>
          <Route
            path="/"
            element={authUser ? <HomePage /> : <Navigate to="/login" />}
          />
          <Route
            path="/signup"
            element={!authUser ? <SignUpPage /> : <Navigate to="/" />}
          />
          <Route
            path="/login"
            element={!authUser ? <LoginPage /> : <Navigate to="/" />}
          />
          <Route
            path="/profile"
            element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
          />
        </Routes>
      </div>

      <Toaster
        position="top-center"
        gutter={10}
        toastOptions={{
          duration: 3200,
          style: {
            background: "#0b2434",
            color: "#F3F4F4",
            border: "1px solid rgba(95, 149, 152, 0.55)",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.35)",
            padding: "12px 14px",
            fontSize: "14px",
            maxWidth: "380px",
          },
          success: {
            iconTheme: {
              primary: "#27b588",
              secondary: "#051923",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#051923",
            },
          },
        }}
      />
    </div>
  );
};
export default App;
