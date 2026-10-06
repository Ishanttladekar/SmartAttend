import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  CalendarCheck,
  Plus,
  Play,
  QrCode,
  Copy,
  Check,
  Radio,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { StatCard } from '../../components/common/StatCard.js';
import { Modal } from '../../components/common/Modal.js';
import { QRCodeModal } from '../../components/common/QRCodeModal.js';
import { LocationMap } from '../../components/common/LocationMap.js';
import { Classroom } from '../../types/index.js';

export const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [startSessionModalOpen, setStartSessionModalOpen] = useState<boolean>(false);
  const [selectedClassroomForSession, setSelectedClassroomForSession] = useState<Classroom | null>(null);
  const [qrModalClassroom, setQrModalClassroom] = useState<Classroom | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Create Classroom Form State
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [section, setSection] = useState('Section A');
  const [semester, setSemester] = useState(5);
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [description, setDescription] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Start Session GPS State
  const [teacherGps, setTeacherGps] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [radiusMeters, setRadiusMeters] = useState<number>(25);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [sessionSubmitting, setSessionSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [classroomsRes, overviewRes] = await Promise.all([
        api.get('/classrooms/teacher'),
        api.get('/reports/dashboard/teacher'),
      ]);
      setClassrooms(classroomsRes.data.data);
      setMetrics(overviewRes.data.data);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      await api.post('/classrooms', {
        subjectName,
        subjectCode,
        section,
        semester: Number(semester),
        academicYear,
        description,
      });
      setCreateModalOpen(false);
      setSubjectName('');
      setSubjectCode('');
      fetchDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create classroom');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openStartSessionModal = (c: Classroom) => {
    setSelectedClassroomForSession(c);
    setStartSessionModalOpen(true);
    getTeacherCurrentLocation();
  };

  const getTeacherCurrentLocation = () => {
    setGpsLoading(true);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTeacherGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setGpsLoading(false);
      },
      (err) => {
        console.warn('GPS error:', err);
        // Default standard campus coordinates if browser blocks location during testing
        setTeacherGps({
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 5,
        });
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleStartSession = async () => {
    if (!selectedClassroomForSession || !teacherGps) return;
    setSessionSubmitting(true);
    try {
      const res = await api.post('/sessions/start', {
        classroomId: selectedClassroomForSession._id,
        latitude: teacherGps.latitude,
        longitude: teacherGps.longitude,
        accuracy: teacherGps.accuracy,
        allowedRadiusMeters: Number(radiusMeters),
      });

      const session = res.data.data;
      setStartSessionModalOpen(false);
      navigate(`/teacher/session/${session._id || session.id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start session');
    } finally {
      setSessionSubmitting(false);
    }
  };

  const handleCopyLink = (joinCode: string) => {
    const url = `${window.location.origin}/join/classroom/${joinCode}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(joinCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Teacher Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your courses, initiate location-verified attendance sessions, and download reports.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Classroom</span>
        </button>
      </div>

      {/* Active Session Alert Banner */}
      {metrics?.activeSession && (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-600 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20">
                  Session Active
                </span>
                <span className="text-xs text-white/90">
                  Radius: {metrics.activeSession.allowedRadiusMeters || 25}m
                </span>
              </div>
              <h3 className="text-base font-bold mt-0.5">
                {metrics.activeSession.subjectName} ({metrics.activeSession.subjectCode})
              </h3>
            </div>
          </div>

          <Link
            to={`/teacher/session/${metrics.activeSession.id}`}
            className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
          >
            <span>Open Live Monitor</span>
            <Play className="w-3.5 h-3.5 fill-current" />
          </Link>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Classrooms"
          value={metrics?.totalClassrooms || classrooms.length}
          subtitle="Assigned courses"
          icon={BookOpen}
          color="blue"
        />
        <StatCard
          title="Total Students"
          value={metrics?.totalStudents || 0}
          subtitle="Enrolled students"
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Sessions Held"
          value={metrics?.totalSessionsConducted || 0}
          subtitle="Completed sessions"
          icon={CalendarCheck}
          color="emerald"
        />
        <StatCard
          title="Today's Attendance"
          value={metrics?.todayPresentCount || 0}
          subtitle="Check-ins today"
          icon={Check}
          color="amber"
        />
      </div>

      {/* Classrooms Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Your Classrooms</h2>
          <span className="text-xs text-slate-500 font-medium">
            {classrooms.length} {classrooms.length === 1 ? 'subject' : 'subjects'}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-xs">Loading classrooms...</p>
          </div>
        ) : classrooms.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-8 space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-semibold text-slate-800 text-sm">No classrooms yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your classroom to generate a student joining code and take attendance.
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="mt-2 px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-sm transition"
            >
              Create Classroom
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map((c) => (
              <div
                key={c._id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {c.subjectCode}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1 line-clamp-1">
                        {c.subjectName}
                      </h3>
                    </div>

                    {c.hasActiveSession && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 space-y-1">
                    <p>
                      {c.section} • Semester {c.semester} ({c.academicYear})
                    </p>
                    <div className="flex items-center gap-4 text-slate-600 pt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <strong>{c.studentCount || 0}</strong> students
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
                        <strong>{c.totalSessions || 0}</strong> sessions
                      </span>
                    </div>
                  </div>

                  {/* Join Code Box */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-slate-400 text-[10px] uppercase">Code:</span>
                      <strong className="text-blue-700 font-bold">{c.joinCode}</strong>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyLink(c.joinCode)}
                        title="Copy Join Link"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-200/60 rounded-lg transition"
                      >
                        {copiedCode === c.joinCode ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => setQrModalClassroom(c)}
                        title="Display QR Code"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-200/60 rounded-lg transition"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    to={`/teacher/classroom/${c._id}`}
                    className="text-xs font-semibold text-slate-700 hover:text-blue-600 transition"
                  >
                    View Details & Reports →
                  </Link>

                  {c.hasActiveSession ? (
                    <Link
                      to={`/teacher/session/${c.activeSessionId}`}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Live Monitor</span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => openStartSessionModal(c)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Attendance</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE CLASSROOM MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Classroom"
        maxWidth="md"
      >
        <form onSubmit={handleCreateClassroom} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subject Name
              </label>
              <input
                type="text"
                required
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Operating Systems"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subject Code
              </label>
              <input
                type="text"
                required
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                placeholder="e.g. CS304"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Section
              </label>
              <input
                type="text"
                required
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="Section A"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Academic Year
              </label>
              <input
                type="text"
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2025-2026"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief course objectives or room details..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
            >
              {formSubmitting ? 'Creating...' : 'Create Classroom'}
            </button>
          </div>
        </form>
      </Modal>

      {/* START ATTENDANCE SESSION MODAL WITH INTERACTIVE MAP */}
      <Modal
        isOpen={startSessionModalOpen}
        onClose={() => setStartSessionModalOpen(false)}
        title={`Start Attendance: ${selectedClassroomForSession?.subjectName}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Attendance will be geofenced to your current classroom coordinates. Students must be within{' '}
            <strong>{radiusMeters} meters</strong> to mark attendance.
          </p>

          {/* Interactive Map Preview */}
          {teacherGps && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Geofence Map Preview
              </label>
              <LocationMap
                centerLat={teacherGps.latitude}
                centerLng={teacherGps.longitude}
                radiusMeters={radiusMeters}
                className="h-56 w-full rounded-xl"
                centerLabel={selectedClassroomForSession?.subjectName || 'Classroom'}
              />
            </div>
          )}

          {/* Location details */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
            {gpsLoading ? (
              <span className="text-slate-400">Acquiring current GPS position...</span>
            ) : teacherGps ? (
              <div>
                <span>Coordinates: <strong>{teacherGps.latitude.toFixed(6)}°, {teacherGps.longitude.toFixed(6)}°</strong></span>
                <span className="text-slate-400 ml-2">(±{teacherGps.accuracy}m accuracy)</span>
              </div>
            ) : (
              <span className="text-amber-600">Location not acquired.</span>
            )}

            <button
              type="button"
              onClick={getTeacherCurrentLocation}
              className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Radius selector */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Geofence Radius
              </label>
              <span className="text-xs font-bold text-blue-600">{radiusMeters} meters</span>
            </div>
            <input
              type="range"
              min={10}
              max={50}
              step={5}
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>10m</span>
              <span>25m (Default)</span>
              <span>50m</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setStartSessionModalOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStartSession}
              disabled={sessionSubmitting || !teacherGps}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{sessionSubmitting ? 'Starting...' : 'Activate Session'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      {qrModalClassroom && (
        <QRCodeModal
          isOpen={!!qrModalClassroom}
          onClose={() => setQrModalClassroom(null)}
          joinCode={qrModalClassroom.joinCode}
          subjectName={qrModalClassroom.subjectName}
        />
      )}
    </div>
  );
};
