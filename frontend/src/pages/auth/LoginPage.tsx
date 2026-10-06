import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, LogIn, AlertCircle, Sparkles, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [role, setRole] = useState<'teacher' | 'student'>(
    (searchParams.get('role') as 'teacher' | 'student') || 'teacher'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'teacher') {
        navigate('/teacher/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Invalid credentials. Please verify your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoRole: 'teacher' | 'student') => {
    setEmail(demoEmail);
    setPassword('password123');
    setRole(demoRole);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sign In to SmartAttend
          </h2>
          <p className="text-xs text-slate-500">
            Select your role to access your attendance workspace
          </p>
        </div>

        {/* Demo Fast-Fill Bar */}
        <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100 space-y-2">
          <div className="flex items-center gap-1.5 text-blue-900 text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Instant Demo Accounts (Click to Fill):</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemo('teacher@smartattend.edu', 'teacher')}
              className="py-1.5 px-2 bg-white hover:bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold rounded-lg shadow-sm transition text-left truncate"
            >
              👨‍🏫 Dr. Alan Turing (Teacher)
            </button>
            <button
              type="button"
              onClick={() => fillDemo('rahul@student.edu', 'student')}
              className="py-1.5 px-2 bg-white hover:bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold rounded-lg shadow-sm transition text-left truncate"
            >
              🎓 Rahul Sharma (Student)
            </button>
          </div>
        </div>

        {/* Role Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setRole('teacher')}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              role === 'teacher'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Teacher Portal
          </button>
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              role === 'student'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Student Portal
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Institutional Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === 'teacher' ? 'teacher@smartattend.edu' : 'student@student.edu'}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In as {role === 'teacher' ? 'Teacher' : 'Student'}</span>
              </>
            )}
          </button>
        </form>

        {/* Register Link */}
        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Don't have an account yet?{' '}
            <Link
              to={`/register?role=${role}`}
              className="font-bold text-blue-600 hover:underline"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

