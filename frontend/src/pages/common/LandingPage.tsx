import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Camera,
  Fingerprint,
  FileText,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Hero Section */}
      <section className="border-b border-slate-100 bg-slate-50/50 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6">
            <span>Academic Attendance & Verification Portal</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Smart Attendance Management for Modern Institutions
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            A reliable college attendance platform combining instructor-controlled sessions,
            physical location geofencing, and biometric identity verification.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            {user ? (
              <Link
                to={user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login?role=teacher"
                  className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                >
                  <span>Teacher Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login?role=student"
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                >
                  <span>Student Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Core Verification Features */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl font-bold text-slate-900">
            Attendance Verification System
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            Multi-stage validation ensuring verified classroom presence and accurate records.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              Location Geofencing
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sessions are anchored to the instructor's classroom coordinates with an interactive map, requiring students to be within the designated radius to mark attendance.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              Biometric Identity Check
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Live camera facial descriptor matching and platform passkeys (fingerprint/Touch ID) ensure only enrolled students mark their own attendance.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              Official PDF Reports
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Instructors can generate downloadable official PDF reports with roll numbers, attendance percentages, and shortage indicators.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-100 text-center text-xs text-slate-400">
        <p>SmartAttend — Academic Attendance Management System</p>
      </footer>
    </div>
  );
};
