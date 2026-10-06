import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Radio,
  Users,
  CheckCircle2,
  Clock,
  MapPin,
  Square,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  Camera,
  Fingerprint,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useSocket } from '../../context/SocketContext.js';

export const LiveSessionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket, joinSessionRoom, leaveSessionRoom } = useSocket();

  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [stopping, setStopping] = useState<boolean>(false);
  const [durationTimer, setDurationTimer] = useState<string>('00:00');

  useEffect(() => {
    fetchSessionDetails();

    if (id) {
      joinSessionRoom(id);
    }

    return () => {
      if (id) {
        leaveSessionRoom(id);
      }
    };
  }, [id]);

  // Real-time listener for marked attendance
  useEffect(() => {
    if (!socket) return;

    const handleAttendanceMarked = (newRecord: any) => {
      setSessionData((prev: any) => {
        if (!prev) return prev;

        // Check if student already in present list to prevent duplicate additions
        const alreadyPresent = prev.presentStudents.some(
          (s: any) => s.studentId === newRecord.studentId
        );
        if (alreadyPresent) return prev;

        const updatedPresent = [newRecord, ...prev.presentStudents];
        const newPresentCount = prev.stats.presentCount + 1;
        const newAbsentCount = Math.max(0, prev.stats.totalEnrolled - newPresentCount);
        const newPercentage =
          prev.stats.totalEnrolled > 0
            ? Math.round((newPresentCount / prev.stats.totalEnrolled) * 100)
            : 100;

        return {
          ...prev,
          stats: {
            ...prev.stats,
            presentCount: newPresentCount,
            absentCount: newAbsentCount,
            attendancePercentage: newPercentage,
          },
          presentStudents: updatedPresent,
        };
      });
    };

    socket.on('attendance_marked', handleAttendanceMarked);

    return () => {
      socket.off('attendance_marked', handleAttendanceMarked);
    };
  }, [socket]);

  // Live duration timer
  useEffect(() => {
    if (!sessionData?.session?.startTime) return;

    const start = new Date(sessionData.session.startTime).getTime();
    const interval = setInterval(() => {
      const now = sessionData.session.endTime
        ? new Date(sessionData.session.endTime).getTime()
        : Date.now();
      const diffSecs = Math.max(0, Math.floor((now - start) / 1000));
      const mins = Math.floor(diffSecs / 60);
      const secs = diffSecs % 60;
      setDurationTimer(
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionData]);

  const fetchSessionDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/sessions/${id}/status`);
      setSessionData(res.data.data);
    } catch (err: any) {
      console.error('Failed to fetch session status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStopSession = async () => {
    if (!id) return;
    const confirmStop = window.confirm(
      'Are you sure you want to stop this attendance session? Students will no longer be able to submit attendance.'
    );
    if (!confirmStop) return;

    setStopping(true);
    try {
      await api.post(`/sessions/${id}/stop`);
      await fetchSessionDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to stop session');
    } finally {
      setStopping(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
        <p className="text-xs">Connecting to live attendance stream...</p>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <h2 className="text-xl font-bold text-slate-800">Session not found</h2>
        <Link to="/teacher/dashboard" className="text-blue-600 text-xs mt-2 inline-block">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const { session, classroom, stats, presentStudents } = sessionData;
  const isActive = session.status === 'ACTIVE';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to={`/teacher/classroom/${classroom.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {classroom.subjectName}</span>
        </Link>
      </div>

      {/* ACTIVE ATTENDANCE LIVE BANNER */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border ${
          isActive
            ? 'bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white border-emerald-500/30 shadow-xl shadow-emerald-950/20'
            : 'bg-white text-slate-900 border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
                {isActive ? 'ACTIVE ATTENDANCE SESSION' : 'SESSION COMPLETED'}
              </span>
              <span
                className={`text-xs font-mono ${
                  isActive ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {session.code}
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {classroom.subjectName} ({classroom.subjectCode})
              </h1>
              <p
                className={`text-xs mt-1 ${
                  isActive ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                Section {classroom.section} • Started at{' '}
                {new Date(session.startTime).toLocaleTimeString()}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Clock className="w-4 h-4 text-amber-400" />
                Duration: <strong className="font-mono text-white">{durationTimer}</strong>
              </span>

              <span className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-4 h-4 text-blue-400" />
                Geofence: <strong>{session.allowedRadiusMeters || 25} meters</strong>
              </span>
            </div>
          </div>

          {/* Action Button: Stop Session */}
          <div>
            {isActive ? (
              <button
                onClick={handleStopSession}
                disabled={stopping}
                className="w-full sm:w-auto px-6 py-3.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>{stopping ? 'Stopping...' : 'Stop Attendance Session'}</span>
              </button>
            ) : (
              <div className="px-5 py-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-200">
                Session Finished
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LIVE STATS COUNTER GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm text-center space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Present
          </p>
          <h2 className="text-4xl font-black text-emerald-600">
            {stats.presentCount}
          </h2>
          <p className="text-[11px] text-slate-500">Live verified check-ins</p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm text-center space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Absent / Not Marked
          </p>
          <h2 className="text-4xl font-black text-rose-500">
            {stats.absentCount}
          </h2>
          <p className="text-[11px] text-slate-500">Pending submissions</p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm text-center space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Enrolled
          </p>
          <h2 className="text-4xl font-black text-slate-900">
            {stats.totalEnrolled}
          </h2>
          <p className="text-[11px] text-slate-500">Classroom roster</p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm text-center space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Attendance Rate
          </p>
          <h2 className="text-4xl font-black text-blue-600">
            {stats.attendancePercentage}%
          </h2>
          <p className="text-[11px] text-slate-500">Session turnout</p>
        </div>
      </div>

      {/* LIVE FEED: MARKED STUDENTS LIST */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Live Attendance Log</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </h3>
            <p className="text-xs text-slate-500">
              Students appearing in real-time as physical location and biometric checks pass
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
            Count: {stats.presentCount} / {stats.totalEnrolled}
          </span>
        </div>

        {presentStudents.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Radio className="w-8 h-8 mx-auto text-slate-300 animate-pulse" />
            <p className="text-xs font-medium">Awaiting student submissions...</p>
            <p className="text-[11px] text-slate-400">
              Students near the classroom can mark attendance using the SmartAttend mobile portal.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Distance (Geofence)</th>
                  <th className="py-3 px-4">Anti-Proxy Verifications</th>
                  <th className="py-3 px-4">Time Recorded</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {presentStudents.map((record: any) => (
                  <tr key={record.recordId || record.studentId} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{record.name}</div>
                      <div className="text-[11px] text-slate-400">{record.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {record.rollNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-mono">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        {record.distanceMeters}m away
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                          <MapPin className="w-2.5 h-2.5" />
                          GPS (25m)
                        </span>

                        {record.verificationMethods?.faceVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                            <Camera className="w-2.5 h-2.5" />
                            Face Vector
                          </span>
                        )}

                        {record.verificationMethods?.passkeyVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">
                            <Fingerprint className="w-2.5 h-2.5" />
                            Passkey
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(record.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Present ✓</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

