import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoadingScreen() {
  return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:'var(--bg-primary)', gap:'16px',
      color:'var(--text-muted)', fontFamily:'var(--font-body)'
    }}>
      <span className="spinner" style={{width:32, height:32}}/>
      <span style={{fontSize:'0.875rem'}}>Loading...</span>
    </div>
  );
}

const roleRedirect = (role) => ({
  super_admin: '/admin/dashboard',
  dean:        '/dean/dashboard',
  chairperson: '/chairperson/dashboard',
  coordinator: '/coordinator/dashboard',
  student:     '/student/dashboard',
}[role] || '/');

// ── ProtectedRoute — requires login + correct role ───────────────
export function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) {
    // Students go to /, staff go to /admin
    return <Navigate to={requiredRole === 'student' ? '/' : '/admin'} replace />;
  }
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={roleRedirect(user.role)} replace />;
  }
  return children;
}

// ── PublicRoute — only for logged-OUT users ──────────────────────
// staffOnly    → /admin page: if student is logged in, send to student dashboard
// studentPublic → / page: if staff is logged in, send to their dashboard
export function PublicRoute({ children, staffOnly, studentPublic }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  if (user) {
    if (staffOnly) {
      // /admin page — logged-in student shouldn't be here
      if (user.role === 'student') return <Navigate to="/student/dashboard" replace />;
      // Staff already logged in → go to dashboard
      return <Navigate to={roleRedirect(user.role)} replace />;
    }
    if (studentPublic) {
      // / page — logged-in staff shouldn't be here
      if (user.role !== 'student') return <Navigate to={roleRedirect(user.role)} replace />;
      // Student already logged in → go to dashboard
      return <Navigate to="/student/dashboard" replace />;
    }
    // Default
    return <Navigate to={roleRedirect(user.role)} replace />;
  }

  return children;
}
