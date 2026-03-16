import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import DeanDashboard from './pages/DeanDashboard';
import ChairpersonDashboard from './pages/ChairpersonDashboard';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import StudentDashboard from './pages/StudentDashboard';
import StudentLogin from './pages/StudentLogin';

export default function App() {
  return (
    <AuthProvider>
      <Routes>

        {/* ── PUBLIC: Student login (Instagram-style) ── */}
        <Route path="/" element={
          <PublicRoute studentPublic><StudentLogin /></PublicRoute>
        } />

        {/* ── STAFF: Google login (internal) ── */}
        <Route path="/admin" element={
          <PublicRoute staffOnly><Login /></PublicRoute>
        } />

        {/* Legacy redirects */}
        <Route path="/login" element={<Navigate to="/admin" replace />} />
        <Route path="/student-login" element={<Navigate to="/" replace />} />

        {/* ── STAFF DASHBOARDS ── */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute requiredRole="super_admin"><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/dean/dashboard" element={
          <ProtectedRoute requiredRole="dean"><DeanDashboard /></ProtectedRoute>
        } />
        <Route path="/chairperson/dashboard" element={
          <ProtectedRoute requiredRole="chairperson"><ChairpersonDashboard /></ProtectedRoute>
        } />
        <Route path="/coordinator/dashboard" element={
          <ProtectedRoute requiredRole="coordinator"><CoordinatorDashboard /></ProtectedRoute>
        } />

        {/* ── STUDENT DASHBOARD ── */}
        <Route path="/student/dashboard" element={
          <ProtectedRoute requiredRole="student"><StudentDashboard /></ProtectedRoute>
        } />

        {/* 404 → student login */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </AuthProvider>
  );
}
