import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Navbar from './components/layout/Navbar';

// Pages
import LoginPage from './pages/LoginPage';
import PublicReportPage from './pages/PublicReportPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageTeachers from './pages/admin/ManageTeachers';
import ManageClasses from './pages/admin/ManageClasses';
import AdminClassDetailPage from './pages/admin/AdminClassDetailPage';
import MqttSettingsPage from './pages/admin/MqttSettingsPage';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ManageStudents from './pages/teacher/ManageStudents';
import AttendanceHistory from './pages/teacher/AttendanceHistory';
import FeedbackNotes from './pages/teacher/FeedbackNotes';
import ClassReports from './pages/teacher/ClassReports';
import TeacherPerformancePage from './pages/teacher/TeacherPerformancePage';

const ProtectedLayout = ({ allowedRole }) => {
  const token = localStorage.getItem('access_token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole && !(allowedRole === 'ADMIN' && user.is_superuser)) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : '/teacher/dashboard'} replace />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main className="app-container">
        <Outlet />
      </main>
    </div>
  );
};

export function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/report/:token" element={<PublicReportPage />} />

        {/* Protected Admin Routes */}
        <Route element={<ProtectedLayout allowedRole="ADMIN" />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/teachers" element={<ManageTeachers />} />
          <Route path="/admin/classes" element={<ManageClasses />} />
          <Route path="/admin/classes/:id" element={<AdminClassDetailPage />} />
          <Route path="/admin/mqtt" element={<MqttSettingsPage />} />
        </Route>

        {/* Protected Teacher Routes */}
        <Route element={<ProtectedLayout allowedRole="WALI_KELAS" />}>
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/students" element={<ManageStudents />} />
          <Route path="/teacher/performance" element={<TeacherPerformancePage />} />
          <Route path="/teacher/attendance" element={<AttendanceHistory />} />
          <Route path="/teacher/feedback" element={<FeedbackNotes />} />
          <Route path="/teacher/reports" element={<ClassReports />} />
        </Route>

        {/* Default Redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
