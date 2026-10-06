import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, User as UserIcon, BookOpen, Clock, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Smart<span className="text-blue-600">Attend</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Anti-Proxy
              </span>
            </div>
          </Link>

          {/* Navigation Links & Actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {user ? (
              <>
                {user.role === 'teacher' ? (
                  <nav className="flex items-center space-x-1 sm:space-x-2">
                    <Link
                      to="/teacher/dashboard"
                      className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      Dashboard
                    </Link>
                  </nav>
                ) : (
                  <nav className="flex items-center space-x-1 sm:space-x-2">
                    <Link
                      to="/student/dashboard"
                      className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition flex items-center gap-1.5"
                    >
                      <BookOpen className="w-4 h-4 text-slate-500" />
                      Subjects
                    </Link>
                    <Link
                      to="/student/history"
                      className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition flex items-center gap-1.5"
                    >
                      <Clock className="w-4 h-4 text-slate-500" />
                      History
                    </Link>
                    <Link
                      to="/student/biometrics"
                      className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition flex items-center gap-1.5"
                    >
                      <Shield className="w-4 h-4 text-slate-500" />
                      Biometrics
                    </Link>
                  </nav>
                )}

                {/* Role Pill */}
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    user.role === 'teacher'
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {user.role}
                </span>

                {/* Profile info & Logout */}
                <div className="flex items-center pl-2 border-l border-slate-200 space-x-2">
                  <div className="hidden md:flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-800 leading-tight">{user.name}</span>
                    <span className="text-[11px] text-slate-500">{user.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/20 transition"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

