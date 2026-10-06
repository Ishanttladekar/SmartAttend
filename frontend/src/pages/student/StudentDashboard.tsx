import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Play,
  Shield,
  Radio,
  RefreshCw,
  Camera,
  Fingerprint,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { StatCard } from '../../components/common/StatCard.js';
import { Modal } from '../../components/common/Modal.js';
import { MarkAttendanceModal } from '../../components/biometrics/MarkAttendanceModal.js';
import { FaceEnrollModal } from '../../components/biometrics/FaceEnrollModal.js';
import { StudentEnrolledClassroom } from '../../types/index.js';

export const StudentDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { socket } = useSocket();

  const [classrooms, setClassrooms] = useState<StudentEnrolledClassroom[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [biometricStatus, setBiometricStatus] = useState<any>(null);

  // Modals state
  const [joinModalOpen, setJoinModalOpen] = useState<boolean>(false);
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinSubmitting, setJoinSubmitting] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [attendanceModalSession, setAttendanceModalSession] = useState<any>(null);
  const [faceEnrollModalOpen, setFaceEnrollModalOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchStudentDashboard();
  }, []);

  // Real-time listener for session start / end
  useEffect(() => {
    if (!socket) return;

    const handleSessionStarted = () => {
      fetchStudentDashboard();
    };

    const handleSessionEnded = () => {
      fetchStudentDashboard();
    };

    socket.on('session_started', handleSessionStarted);
    socket.on('session_ended', handleSessionEnded);

    return () => {
      socket.off('session_started', handleSessionStarted);
      socket.off('session_ended', handleSessionEnded);
    };
  }, [socket]);

  const fetchStudentDashboard = async () => {
    setLoading(true);
    try {
      const [classesRes, statsRes, bioRes] = await Promise.all([
        api.get('/classrooms/student'),
        api.get('/reports/dashboard/student'),
        api.get('/biometrics/status'),
      ]);
      setClassrooms(classesRes.data.data);
      setMetrics(statsRes.data.data);
      setBiometricStatus(bioRes.data.data);
    } catch (err: any) {
      console.error('Failed to load student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    setJoinSubmitting(true);

    try {
      await api.post('/classrooms/join', { joinCode: joinCodeInput.trim() });
      setJoinModalOpen(false);
      setJoinCodeInput('');
      fetchStudentDashboard();
    } catch (err: any) {
      setJoinError(err.response?.data?.message || 'Failed to join classroom');
    } finally {
      setJoinSubmitting(false);
    }
  };

  const handleOpenAttendanceModal = async (classItem: StudentEnrolledClassroom) => {
    try {
      const res = await api.get(`/classrooms/${classItem.id}`);
      const activeSession = res.data.data.activeSession;
      if (!activeSession) {
        alert('This session has already ended.');
        fetchStudentDashboard();
        return;
      }

      setAttendanceModalSession({
        id: activeSession.id,
        sessionNonce: activeSession.sessionNonce,
        allowedRadiusMeters: activeSession.allowedRadiusMeters,
        authorizedLocation: activeSession.authorizedLocation,
        subjectName: classItem.subjectName,
        subjectCode: classItem.subjectCode,
      });
    } catch (err: any) {
      alert('Error fetching active session details');
    }
  };

  // Find active classroom with unsubmitted attendance
  const activeClassroom = classrooms.find(
    (c) => c.hasActiveSession && !c.alreadyMarkedForActiveSession
  );

  const isBiometricEnrolled =
    biometricStatus?.isFaceEnrolled || biometricStatus?.isPasskeyEnrolled;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Student Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Roll Number: <strong className="font-mono text-slate-700">{user?.profile?.rollNumber || 'CS-2023-01'}</strong> • Track subject eligibility and verify attendance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setJoinModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Join Classroom</span>
          </button>
        </div>
      </div>

      {/* BIOMETRIC SETUP NOTICE IF NOT ENROLLED */}
      {!isBiometricEnrolled && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                Biometric Setup Required for Attendance
              </h3>
              <p className="text-xs text-white/90">
                To prevent proxy attendance, enroll your face template or device passkey before class.
              </p>
            </div>
          </div>

          <button
            onClick={() => setFaceEnrollModalOpen(true)}
            className="px-5 py-2.5 bg-white text-amber-900 hover:bg-amber-50 text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Enroll Face Identity</span>
          </button>
        </div>
      )}

      {/* ACTIVE ATTENDANCE PROMINENT ALERT */}
      {activeClassroom && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white shadow-xl shadow-blue-900/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-white/20">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-400 text-emerald-950">
                <span className="w-2 h-2 rounded-full bg-emerald-900 animate-ping" />
                Live Attendance Session Open
              </span>
              <span className="text-xs text-blue-200">25m Geofence Active</span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black">
                {activeClassroom.subjectName} ({activeClassroom.subjectCode})
              </h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Instructor: {activeClassroom.teacherName} • Section {activeClassroom.section}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleOpenAttendanceModal(activeClassroom)}
            className="w-full sm:w-auto px-8 py-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-400/30 transition transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <Radio className="w-5 h-5 text-emerald-950" />
            <span>Mark Attendance Now</span>
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Overall Attendance"
          value={`${metrics?.overallPercentage || 0}%`}
          subtitle="All enrolled courses"
          icon={CalendarCheck}
          color={metrics?.overallPercentage < 75 ? 'rose' : 'emerald'}
          warning={metrics?.overallPercentage < 75}
        />
        <StatCard
          title="Classes Attended"
          value={metrics?.totalAttended || 0}
          subtitle="Verified check-ins"
          icon={CheckCircle2}
          color="blue"
        />
        <StatCard
          title="Classes Missed"
          value={metrics?.totalMissed || 0}
          subtitle="Unexcused absences"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Enrolled Subjects"
          value={classrooms.length}
          subtitle="Current semester"
          icon={BookOpen}
          color="purple"
        />
      </div>

      {/* Attendance Shortage Warning Alert */}
      {metrics?.overallPercentage < 75 && metrics?.totalClasses > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <p>
            <strong>Attendance Shortage Warning:</strong> Your aggregate attendance is currently{' '}
            <strong>{metrics?.overallPercentage}%</strong>, which is below the mandatory 75% institutional threshold. Please attend ongoing sessions to regain exam eligibility.
          </p>
        </div>
      )}

      {/* Enrolled Subjects List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Enrolled Courses</h2>
          <span className="text-xs text-slate-500 font-medium">
            {classrooms.length} {classrooms.length === 1 ? 'course' : 'courses'}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-xs">Loading course enrollments...</p>
          </div>
        ) : classrooms.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800">You haven't joined any classes yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Ask your teacher for their 6-character classroom code or scan their QR code to enroll.
            </p>
            <button
              onClick={() => setJoinModalOpen(true)}
              className="mt-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow transition"
            >
              Join a Classroom
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 flex flex-col justify-between hover:shadow-md transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {c.subjectCode}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1 line-clamp-1">
                        {c.subjectName}
                      </h3>
                    </div>

                    {c.hasActiveSession && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        SESSION OPEN
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">
                    Instructor: <strong>{c.teacherName}</strong> • {c.section}
                  </p>

                  {/* Attendance Percentage Progress Bar */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-600">Attendance</span>
                      <span
                        className={`font-black ${
                          c.stats.isLowAttendance ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {c.stats.percentage}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          c.stats.isLowAttendance ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, c.stats.percentage)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Attended: {c.stats.attendedSessions}</span>
                      <span>Missed: {c.stats.missedSessions}</span>
                      <span>Total: {c.stats.totalSessions}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="pt-2">
                  {c.hasActiveSession ? (
                    c.alreadyMarkedForActiveSession ? (
                      <div className="w-full py-2.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 text-center flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Attendance Marked for Today ✓</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenAttendanceModal(c)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-1.5 animate-bounce"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Mark Attendance</span>
                      </button>
                    )
                  ) : (
                    <div className="w-full py-2 bg-slate-50 text-slate-400 text-xs font-medium rounded-xl border border-slate-100 text-center">
                      No Active Session
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* JOIN CLASSROOM MODAL */}
      <Modal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        title="Join Classroom"
        maxWidth="sm"
      >
        <form onSubmit={handleJoinClassroom} className="space-y-4">
          <p className="text-xs text-slate-500">
            Enter the 6-character code provided by your course instructor to enroll in the subject.
          </p>

          {joinError && (
            <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs">
              {joinError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Classroom Code
            </label>
            <input
              type="text"
              required
              maxLength={10}
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. DSA2026"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-center font-mono text-lg font-bold uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setJoinModalOpen(false)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={joinSubmitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition"
            >
              {joinSubmitting ? 'Joining...' : 'Enroll in Classroom'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MARK ATTENDANCE MODAL */}
      {attendanceModalSession && (
        <MarkAttendanceModal
          isOpen={!!attendanceModalSession}
          onClose={() => setAttendanceModalSession(null)}
          session={attendanceModalSession}
          onSuccess={() => {
            fetchStudentDashboard();
          }}
        />
      )}

      {/* FACE ENROLL MODAL */}
      <FaceEnrollModal
        isOpen={faceEnrollModalOpen}
        onClose={() => setFaceEnrollModalOpen(false)}
        onSuccess={() => {
          fetchStudentDashboard();
        }}
      />
    </div>
  );
};

