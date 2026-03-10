import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      gap: '16px',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-body)',
    }}>
      <span className="spinner" style={{ width: 32, height: 32 }} />
      <span style={{ fontSize: '0.875rem' }}>Authenticating...</span>
    </div>
  );
}

export function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole && user.role !== requiredRole) {
    if (user.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'dean') return <Navigate to="/dean/dashboard" replace />;
    return <Navigate to="/chairperson/dashboard" replace />;
  }

  return children;
}

export function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) {
    if (user.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'dean') return <Navigate to="/dean/dashboard" replace />;
    return <Navigate to="/chairperson/dashboard" replace />;
  }

  return children;
}
