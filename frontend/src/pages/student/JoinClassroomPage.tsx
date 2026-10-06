import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BookOpen, Users, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';

export const JoinClassroomPage: React.FC = () => {
  const { joinCode } = useParams<{ joinCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [joining, setJoining] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!joinCode) return;
    setJoining(true);
    setError(null);

    try {
      await api.post('/classrooms/join', { joinCode });
      setSuccess(true);
      setTimeout(() => {
        navigate('/student/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to join classroom. Please try again.'
      );
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-md">
          <BookOpen className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Classroom Enrollment
          </h2>
          <p className="text-xs text-slate-500">
            You were invited to join a course on SmartAttend
          </p>
        </div>

        {/* Join Code Display */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Classroom Code
          </p>
          <p className="font-mono text-2xl font-black text-blue-600 tracking-widest mt-1">
            {joinCode}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            <p className="font-bold text-sm">Successfully enrolled!</p>
            <p className="text-emerald-600">Redirecting to your dashboard...</p>
          </div>
        ) : !user ? (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-slate-600">
              Please sign in with your student account to join this classroom.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to={`/login?role=student&redirect=/join/classroom/${joinCode}`}
                className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Sign In to Join
              </Link>
              <Link
                to={`/register?role=student&redirect=/join/classroom/${joinCode}`}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Register Account
              </Link>
            </div>
          </div>
        ) : user.role !== 'student' ? (
          <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-xs">
            You are logged in as a <strong>Teacher</strong>. Classrooms can only be joined by students.
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2"
            >
              <span>{joining ? 'Enrolling...' : 'Confirm & Join Classroom'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-slate-400">
              Logged in as {user.name} ({user.email})
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

