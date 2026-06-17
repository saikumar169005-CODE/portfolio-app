import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, User, CheckCircle2, ArrowRight, Kanban, AlertCircle } from "lucide-react";
import { User as UserType } from "../types";

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: UserType) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!email || !password) {
      setError("Please fill out all required fields.");
      return false;
    }
    if (!isLogin && !username) {
      setError("Please specify a username.");
      return false;
    }
    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload = isLogin 
      ? { identity: email, password } 
      : { email, username, password };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An error occurred during authentication.");
      }

      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen-container" className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-12 md:py-16">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden"
      >
        <div className="p-8 pb-6 text-center border-b border-zinc-100 bg-zinc-50/50">
          <div className="inline-flex items-center justify-center p-3.5 bg-zinc-900 text-white rounded-xl mb-4">
            <Kanban size={24} className="stroke-[2.25]" />
          </div>
          <h1 id="auth-main-title" className="text-2xl font-bold font-display text-zinc-900 tracking-tight">
            TaskFlow Pro
          </h1>
          <p id="auth-subtitle" className="text-xs text-zinc-500 mt-1.5 max-w-[280px] mx-auto">
            {isLogin 
              ? "Welcome back. Log in to manage your active columns and task queues." 
              : "Create an account to start organizing your projects today."}
          </p>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-red-700 text-sm"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5" htmlFor="email-input">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                  <Mail size={16} />
                </span>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 focus:bg-white text-zinc-900 placeholder:text-zinc-400 border border-zinc-200 focus:border-zinc-900 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-zinc-900/10"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5" htmlFor="username-input">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                    <User size={16} />
                  </span>
                  <input
                    id="username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="yourusername"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 focus:bg-white text-zinc-900 placeholder:text-zinc-400 border border-zinc-200 focus:border-zinc-900 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-zinc-900/10"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5" htmlFor="password-input">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                  <Lock size={16} />
                </span>
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 focus:bg-white text-zinc-900 placeholder:text-zinc-400 border border-zinc-200 focus:border-zinc-900 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-zinc-900/10"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5" htmlFor="confirm-pass-input">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                    <CheckCircle2 size={16} />
                  </span>
                  <input
                    id="confirm-pass-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 focus:bg-white text-zinc-900 placeholder:text-zinc-400 border border-zinc-200 focus:border-zinc-900 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-zinc-900/10"
                    required
                  />
                </div>
              </div>
            )}

            <button
              id="auth-submit-button"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-zinc-900 hover:bg-zinc-855 text-white font-medium text-sm rounded-xl shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900/10 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? "Sign In" : "Create Account"}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-zinc-100 text-center">
            <button
              id="auth-toggle-mode"
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-xs font-semibold text-zinc-650 hover:text-zinc-900 transition-colors focus:outline-none cursor-pointer"
            >
              {isLogin 
                ? "Don't have an account? Sign up here" 
                : "Already have an account? Sign in instead"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
