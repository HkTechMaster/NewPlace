import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoadingScreen() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg-primary)', gap:'16px', color:'var(--text-muted)', fontFamily:'var(--font-body)' }}>
      <span className="spinner" style={{ width:32, height:32 }} />
      <span style={{ fontSize:'0.875rem' }}>Authenticating...</span>
    </div>
  );
}

const roleRedirect = (role) => {
  const map = {
    super_admin: '/admin/dashboard',
    dean: '/dean/dashboard',
    chairperson: '/chairperson/dashboard',
    coordinator: '/coordinator/dashboard',
    student: '/student/dashboard',
  };
  return map[role] || '/login';
};

export function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={roleRedirect(user.role)} replace />;
  }
  return children;
}

export function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to={roleRedirect(user.role)} replace />;
  return children;
}
