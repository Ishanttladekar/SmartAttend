import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, BookOpen, Clock, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                Smart<span className="text-blue-600">Attend</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-slate-400 font-medium">
                Attendance Portal
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
                      Courses
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

                {/* Role Badge */}
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                    user.role === 'teacher'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
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
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
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
