import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css';

export default function Login() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const result = await loginWithGoogle(credentialResponse.credential);
      if (result.success) {
        toast.success(result.message || 'Welcome!');
        if (result.user.role === 'super_admin') {
          navigate('/admin/dashboard');
        } else if (result.user.role === 'dean') {
          navigate('/dean/dashboard');
        } else if (result.user.role === 'chairperson') {
          navigate('/chairperson/dashboard');
        }
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Background grid */}
      <div className={styles.grid} aria-hidden="true" />
      {/* Glow blobs */}
      <div className={styles.blob1} aria-hidden="true" />
      <div className={styles.blob2} aria-hidden="true" />

      <div className={styles.container}>
        {/* Logo / Brand */}
        <div className={styles.brand}>
          <div className={styles.logoMark}>
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="20,2 38,11 38,29 20,38 2,29 2,11" stroke="#3b82f6" strokeWidth="2" fill="none"/>
              <polygon points="20,8 32,14 32,26 20,32 8,26 8,14" stroke="#3b82f6" strokeWidth="1" fill="rgba(59,130,246,0.08)"/>
              <circle cx="20" cy="20" r="5" fill="#3b82f6"/>
            </svg>
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>PlacePro</span>
            <span className={styles.brandTagline}>Placement Management System</span>
          </div>
        </div>

        {/* Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.subtitle}>
              Sign in with your institutional Google account to continue
            </p>
          </div>

          <div className={styles.divider}>
            <span>Secure Access Portal</span>
          </div>

          <div className={styles.googleWrapper}>
            {loading ? (
              <div className={styles.loadingBtn}>
                <span className="spinner" />
                <span>Verifying your account...</span>
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error('Google sign-in failed. Please try again.')}
                useOneTap={false}
                theme="filled_black"
                size="large"
                width="100%"
                text="signin_with"
                shape="rectangular"
              />
            )}
          </div>

          <div className={styles.notice}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>Only registered institutional emails can access this portal. Contact your Super Admin if you don't have access.</span>
          </div>
        </div>

        {/* Roles info */}
        <div className={styles.rolesRow}>
          {[
            { icon: '⬡', label: 'Super Admin', desc: 'Manages faculties & deans' },
            { icon: '◆', label: 'Dean', desc: 'Faculty oversight & placements' },
          ].map((r) => (
            <div key={r.label} className={styles.roleChip}>
              <span className={styles.roleIcon}>{r.icon}</span>
              <div>
                <div className={styles.roleLabel}>{r.label}</div>
                <div className={styles.roleDesc}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <p className={styles.footer}>
          Placement System v1.0 &nbsp;·&nbsp; Powered by MERN Stack
        </p>
      </div>
    </div>
  );
}
