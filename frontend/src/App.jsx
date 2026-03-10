import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import DeanDashboard from './pages/DeanDashboard';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole="super_admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dean/dashboard"
          element={
            <ProtectedRoute requiredRole="dean">
              <DeanDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chairperson/dashboard"
          element={
            <ProtectedRoute requiredRole="chairperson">
              <ChairpersonDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
