import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { SocketProvider } from './context/SocketContext.js';
import { Navbar } from './components/common/Navbar.js';

// Pages
import { LandingPage } from './pages/common/LandingPage.js';
import { LoginPage } from './pages/auth/LoginPage.js';
import { RegisterPage } from './pages/auth/RegisterPage.js';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard.js';
import { ClassroomDetailPage } from './pages/teacher/ClassroomDetailPage.js';
import { LiveSessionPage } from './pages/teacher/LiveSessionPage.js';
import { StudentDashboard } from './pages/student/StudentDashboard.js';
import { JoinClassroomPage } from './pages/student/JoinClassroomPage.js';
import { StudentHistoryPage } from './pages/student/StudentHistoryPage.js';
import { BiometricSettingsPage } from './pages/student/BiometricSettingsPage.js';

// Route Guards
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: ('teacher' | 'student')[];
}> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to={user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'}
        replace
      />
    );
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/join/classroom/:joinCode" element={<JoinClassroomPage />} />

                {/* Teacher Routes */}
                <Route
                  path="/teacher/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <TeacherDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/classroom/:id"
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <ClassroomDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/session/:id"
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <LiveSessionPage />
                    </ProtectedRoute>
                  }
                />

                {/* Student Routes */}
                <Route
                  path="/student/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/history"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <StudentHistoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/biometrics"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <BiometricSettingsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

