import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen,
  Users,
  CalendarCheck,
  Download,
  QrCode,
  Copy,
  Check,
  Search,
  Radio,
  Play,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { QRCodeModal } from '../../components/common/QRCodeModal.js';
import { StudentAttendanceSummary } from '../../types/index.js';

export const ClassroomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [classroom, setClassroom] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'shortage' | 'eligible'>('all');

  useEffect(() => {
    fetchClassroomData();
  }, [id]);

  const fetchClassroomData = async () => {
    setLoading(true);
    try {
      const [classRes, statsRes] = await Promise.all([
        api.get(`/classrooms/${id}`),
        api.get(`/reports/classroom/${id}`),
      ]);
      setClassroom(classRes.data.data.classroom);
      setStats(statsRes.data.data);
    } catch (err: any) {
      console.error('Failed to fetch classroom data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!id || !classroom) return;
    setPdfDownloading(true);
    try {
      const response = await api.get(`/reports/pdf/${id}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Attendance_Report_${classroom.subjectCode}_${classroom.section}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to generate attendance PDF: ' + (err.message || 'Error'));
    } finally {
      setPdfDownloading(false);
    }
  };

  const handleCopyLink = () => {
    if (!classroom) return;
    const url = `${window.location.origin}/join/classroom/${classroom.joinCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
        <p className="text-xs">Loading classroom details...</p>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <h2 className="text-xl font-bold text-slate-800">Classroom not found</h2>
        <Link to="/teacher/dashboard" className="text-blue-600 text-xs mt-2 inline-block">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const filteredStudents = (stats?.students || []).filter((s: StudentAttendanceSummary) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'shortage') {
      return matchesSearch && s.isLowAttendance;
    }
    if (statusFilter === 'eligible') {
      return matchesSearch && !s.isLowAttendance;
    }
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/teacher/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Teacher Dashboard</span>
        </Link>
      </div>

      {/* Classroom Hero Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              {classroom.subjectCode}
            </span>
            <span className="text-xs text-slate-500">
              {classroom.section} • Semester {classroom.semester} ({classroom.academicYear})
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {classroom.subjectName}
          </h1>

          {classroom.description && (
            <p className="text-xs text-slate-500 max-w-xl">{classroom.description}</p>
          )}

          {/* Join Link Controls */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl font-mono text-xs font-bold text-slate-800 border border-slate-200">
              <span className="text-slate-400 uppercase text-[10px]">Code:</span>
              <span>{classroom.joinCode}</span>
            </div>

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied Link!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <button
              onClick={() => setQrModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Show QR</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-3">
          <button
            onClick={handleDownloadPDF}
            disabled={pdfDownloading}
            className="px-5 py-3 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/20 transition flex items-center justify-center gap-2"
          >
            {pdfDownloading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Generate Attendance PDF</span>
          </button>
        </div>
      </div>

      {/* Classroom Analytics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">Sessions Held</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">
            {stats?.totalSessions || 0}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Completed attendance calls</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">Enrolled Students</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">
            {stats?.students?.length || 0}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Active classroom learners</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">Class Average</p>
          <h3 className="text-2xl font-black text-blue-600 mt-1">
            {stats?.classAveragePercentage || 0}%
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Overall attendance rate</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">Low Attendance Alert</p>
          <h3 className="text-2xl font-black text-amber-600 mt-1">
            {stats?.lowAttendanceCount || 0}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Students below 75% threshold</p>
        </div>
      </div>

      {/* Attendance Records & Breakdown Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Student Attendance Performance
            </h2>
            <p className="text-xs text-slate-500">
              Calculated automatically using official formula: (Attended / Total Classes) × 100
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name or roll no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-48"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white font-medium text-slate-700"
            >
              <option value="all">All Students</option>
              <option value="shortage">Shortage (&lt;75%)</option>
              <option value="eligible">Eligible (≥75%)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Present</th>
                <th className="py-3 px-4">Absent</th>
                <th className="py-3 px-4">Attendance %</th>
                <th className="py-3 px-4">Eligibility Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No students match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s: StudentAttendanceSummary) => (
                  <tr key={s.studentId} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {s.rollNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-400">{s.email}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600">
                      {s.attendedClasses}
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-500">
                      {s.missedClasses}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">
                          {s.attendancePercentage}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              s.isLowAttendance ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, s.attendancePercentage)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {s.isLowAttendance ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span>Shortage (&lt;75%)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-500" />
                          <span>Eligible</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code Modal */}
      {qrModalOpen && (
        <QRCodeModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          joinCode={classroom.joinCode}
          subjectName={classroom.subjectName}
        />
      )}
    </div>
  );
};

