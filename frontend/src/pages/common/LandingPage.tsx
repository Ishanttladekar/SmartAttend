import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  MapPin,
  Camera,
  Fingerprint,
  FileText,
  Users,
  CheckCircle2,
  ArrowRight,
  Lock,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6 animate-pulse">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            Next-Gen Anti-Proxy Attendance System
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.1]">
            Eliminate Proxy Attendance with{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              SmartAttend
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            A zero-trust attendance management platform combining teacher-controlled
            sessions, <strong>25-meter GPS geofencing</strong>, and{' '}
            <strong>biometric identity verification</strong>.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link
                to={user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'}
                className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 group"
              >
                <span>Go to {user.role === 'teacher' ? 'Teacher' : 'Student'} Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login?role=teacher"
                  className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <span>Teacher Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login?role=student"
                  className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2"
                >
                  <span>Student Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 3-Pillar Security Architecture */}
      <section className="py-16 bg-slate-100/60 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Zero-Trust Verification Architecture
            </h2>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">
              How SmartAttend Guarantees Physical Presence
            </h3>
            <p className="text-slate-600 text-sm mt-3">
              Standard QR codes and roll calls are easily bypassed by forwarding links or taking screenshots. SmartAttend solves this at three independent security layers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                <MapPin className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">
                1. 25-Meter GPS Geofence
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Teacher starts an attendance session capturing their live coordinates. Students must be physically located within 25 meters, computed authoritatively on the server via the Haversine formula with GPS accuracy verification.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5">
                <li className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Server-side distance calculation</span>
                </li>
                <li className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Rejects spoofed GPS circles (&gt;35m error)</span>
                </li>
              </ul>
            </div>

            {/* Pillar 2 */}
            <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
                <Camera className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">
                2. Live Facial Vector Matching
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Students must verify identity using a live camera capture. A 128-float biometric descriptor is extracted and compared against their enrolled identity, paired with liveness checks to block static photo spoofing.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5">
                <li className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Privacy guarantee: Zero raw photos stored</span>
                </li>
                <li className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>High-confidence Euclidean distance match</span>
                </li>
              </ul>
            </div>

            {/* Pillar 3 */}
            <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6">
                <Fingerprint className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">
                3. Platform Biometrics (Passkeys)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Full WebAuthn / FIDO2 integration allows students to authenticate via their device's built-in fingerprint scanner, Touch ID, or Windows Hello, binding attendance submissions to the enrolled physical hardware.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5">
                <li className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Cryptographically signed challenges</span>
                </li>
                <li className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Prevents remote account sharing</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900">
              Built for Modern Academic Institutions
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Everything instructors and students need for frictionless, accurate attendance auditing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <div className="p-3 w-fit rounded-xl bg-blue-50 text-blue-600 mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-900 text-sm mb-1">
                Classroom Management
              </h5>
              <p className="text-xs text-slate-500 leading-relaxed">
                Generate unique join codes and instant QR codes for frictionless student enrollment without manual roll entry.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <div className="p-3 w-fit rounded-xl bg-emerald-50 text-emerald-600 mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-900 text-sm mb-1">
                Real-Time Live Monitor
              </h5>
              <p className="text-xs text-slate-500 leading-relaxed">
                Teacher dashboard receives live push events via WebSockets as students verify attendance, with live meters and presence logs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <div className="p-3 w-fit rounded-xl bg-purple-50 text-purple-600 mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-900 text-sm mb-1">
                Official PDF Reports
              </h5>
              <p className="text-xs text-slate-500 leading-relaxed">
                Download formatted attendance reports with university headers, roll call statistics, and low-attendance warnings.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <div className="p-3 w-fit rounded-xl bg-amber-50 text-amber-600 mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-900 text-sm mb-1">
                Anti-Replay Nonce Security
              </h5>
              <p className="text-xs text-slate-500 leading-relaxed">
                Every session generates cryptographic dynamic tokens and atomic unique database indexes to prevent replay attacks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-900 text-slate-400 text-xs text-center border-t border-slate-800">
        <p>© 2026 SmartAttend Anti-Proxy Attendance Management System. All rights reserved.</p>
      </footer>
    </div>
  );
};

