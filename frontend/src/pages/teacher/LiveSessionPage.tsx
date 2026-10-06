import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Radio,
  CheckCircle2,
  Clock,
  MapPin,
  Square,
  RefreshCw,
  ArrowLeft,
  Camera,
  Fingerprint,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useSocket } from '../../context/SocketContext.js';
import { LocationMap } from '../../components/common/LocationMap.js';

export const LiveSessionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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

  useEffect(() => {
    if (!socket) return;

    const handleAttendanceMarked = (newRecord: any) => {
      setSessionData((prev: any) => {
        if (!prev) return prev;

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
      'Are you sure you want to stop this session? Students will no longer be able to submit attendance.'
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
        <p className="text-xs">Connecting to live attendance session...</p>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <Link
          to={`/teacher/classroom/${classroom.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {classroom.subjectName}</span>
        </Link>
      </div>

      {/* Session Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isActive ? 'SESSION ACTIVE' : 'COMPLETED'}
            </span>
            <span className="text-xs font-mono text-slate-500">{session.code}</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            {classroom.subjectName} ({classroom.subjectCode})
          </h1>
          <p className="text-xs text-slate-500">
            Section {classroom.section} • Started at {new Date(session.startTime).toLocaleTimeString()}
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-600 pt-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Duration: <strong className="font-mono text-slate-900">{durationTimer}</strong>
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Radius: <strong>{session.allowedRadiusMeters || 25} meters</strong>
            </span>
          </div>
        </div>

        <div>
          {isActive ? (
            <button
              onClick={handleStopSession}
              disabled={stopping}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{stopping ? 'Stopping...' : 'Stop Attendance Session'}</span>
            </button>
          ) : (
            <div className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl">
              Session Closed
            </div>
          )}
        </div>
      </div>

      {/* Live Counter Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase">Present</p>
          <h2 className="text-3xl font-extrabold text-emerald-600 mt-1">{stats.presentCount}</h2>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase">Absent / Pending</p>
          <h2 className="text-3xl font-extrabold text-rose-500 mt-1">{stats.absentCount}</h2>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase">Total Enrolled</p>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-1">{stats.totalEnrolled}</h2>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase">Attendance Rate</p>
          <h2 className="text-3xl font-extrabold text-blue-600 mt-1">{stats.attendancePercentage}%</h2>
        </div>
      </div>

      {/* Interactive Map & Feed Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Geofence Map */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Geofence Location Map</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              {session.allowedRadiusMeters || 25}m radius
            </span>
          </div>

          <LocationMap
            centerLat={session.authorizedLocation.latitude}
            centerLng={session.authorizedLocation.longitude}
            radiusMeters={session.allowedRadiusMeters || 25}
            className="h-72 w-full rounded-xl"
            centerLabel="Classroom Session"
          />

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Blue perimeter shows the active 25-meter radius. Students outside this circle are automatically blocked from checking in.
          </p>
        </div>

        {/* Right: Live Checked-in Students Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Live Attendance Feed
              </h3>
              <p className="text-[11px] text-slate-400">
                Updates in real-time as students verify location and biometric checks
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              {stats.presentCount} / {stats.totalEnrolled}
            </span>
          </div>

          {presentStudents.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-1">
              <Radio className="w-6 h-6 mx-auto text-slate-300 animate-pulse" />
              <p className="text-xs font-medium">Waiting for student check-ins...</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Roll No</th>
                    <th className="py-2.5 px-3">Distance</th>
                    <th className="py-2.5 px-3">Verification</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {presentStudents.map((record: any) => (
                    <tr key={record.recordId || record.studentId} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {record.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {record.rollNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {record.distanceMeters}m
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium text-[10px]">
                            GPS
                          </span>
                          {record.verificationMethods?.faceVerified && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium text-[10px]">
                              Face
                            </span>
                          )}
                          {record.verificationMethods?.passkeyVerified && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium text-[10px]">
                              Passkey
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {new Date(record.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Present</span>
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
    </div>
  );
};
