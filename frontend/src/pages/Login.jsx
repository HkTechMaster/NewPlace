import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import StudentRegistrationForm from '../components/StudentRegistrationForm';
import styles from './Login.module.css';

export default function Login() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  // 'login' | 'register' | 'pending' | 'rejected'
  const [screen, setScreen] = useState('login');
  const [googleUser, setGoogleUser] = useState(null); // { googleId, googleEmail, googleName, googleAvatar }
  const [statusMsg, setStatusMsg] = useState('');

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const result = await loginWithGoogle(credentialResponse.credential);

      if (result.success) {
        toast.success(`Welcome, ${result.user.name}!`);
        const map = {
          super_admin: '/admin/dashboard',
          dean: '/dean/dashboard',
          chairperson: '/chairperson/dashboard',
          coordinator: '/coordinator/dashboard',
          student: '/student/dashboard',
        };
        navigate(map[result.user.role] || '/login');
        return;
      }

      // Not logged in — check status
      if (result.status === 'needs_registration') {
        setGoogleUser(result.googleUser);
        setScreen('register');
        return;
      }
      if (result.status === 'pending') {
        setStatusMsg(result.message);
        setScreen('pending');
        return;
      }
      if (result.status === 'rejected') {
        setStatusMsg(result.message);
        setScreen('rejected');
        return;
      }

      toast.error(result.message || 'Access denied');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistered = () => {
    setScreen('pending');
    setStatusMsg('Registration submitted! Your coordinator will review and approve your request.');
  };

  // ── PENDING screen ──────────────────────────────────────────────────
  if (screen === 'pending') {
    return (
      <div className={styles.page}>
        <div className={styles.grid} aria-hidden="true" />
        <div className={styles.blob1} aria-hidden="true" />
        <div className={styles.blob2} aria-hidden="true" />
        <div className={styles.container}>
          <div className={styles.brand}>
            <div className={styles.logoMark}>
              <svg viewBox="0 0 40 40" fill="none"><polygon points="20,2 38,11 38,29 20,38 2,29 2,11" stroke="#3b82f6" strokeWidth="2" fill="none"/><circle cx="20" cy="20" r="5" fill="#3b82f6"/></svg>
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>PlacePro</span>
              <span className={styles.brandTagline}>Placement Management System</span>
            </div>
          </div>
          <div className={styles.statusCard}>
            <div className={styles.statusIcon} style={{background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.3)'}}>⏳</div>
            <h2 className={styles.statusTitle}>Registration Under Review</h2>
            <p className={styles.statusMsg}>{statusMsg}</p>
            <div className={styles.statusSteps}>
              <div className={styles.step}><span className={styles.stepDot} style={{background:'var(--success)'}}/> Form submitted</div>
              <div className={styles.step}><span className={styles.stepDot} style={{background:'var(--warning)'}}/> Awaiting coordinator approval</div>
              <div className={styles.step}><span className={styles.stepDot} style={{background:'var(--border)'}}/> Login access granted</div>
            </div>
            <button className={styles.backBtn} onClick={() => setScreen('login')}>← Back to Login</button>
          </div>
        </div>
      </div>
    );
  }

  // ── REJECTED screen ─────────────────────────────────────────────────
  if (screen === 'rejected') {
    return (
      <div className={styles.page}>
        <div className={styles.grid} aria-hidden="true" />
        <div className={styles.blob1} aria-hidden="true" />
        <div className={styles.blob2} aria-hidden="true" />
        <div className={styles.container}>
          <div className={styles.brand}>
            <div className={styles.logoMark}>
              <svg viewBox="0 0 40 40" fill="none"><polygon points="20,2 38,11 38,29 20,38 2,29 2,11" stroke="#3b82f6" strokeWidth="2" fill="none"/><circle cx="20" cy="20" r="5" fill="#3b82f6"/></svg>
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>PlacePro</span>
              <span className={styles.brandTagline}>Placement Management System</span>
            </div>
          </div>
          <div className={styles.statusCard}>
            <div className={styles.statusIcon} style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)'}}>✕</div>
            <h2 className={styles.statusTitle} style={{color:'var(--danger)'}}>Registration Rejected</h2>
            <p className={styles.statusMsg}>{statusMsg}</p>
            <p className={styles.statusHint}>Please contact your coordinator or try registering again with correct details.</p>
            <button className={styles.backBtn} onClick={() => setScreen('login')}>← Back to Login</button>
          </div>
        </div>
      </div>
    );
  }

  // ── REGISTRATION FORM screen ────────────────────────────────────────
  if (screen === 'register') {
    return (
      <StudentRegistrationForm
        googleUser={googleUser}
        onSuccess={handleRegistered}
        onBack={() => setScreen('login')}
      />
    );
  }

  // ── DEFAULT: LOGIN screen ───────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.blob1} aria-hidden="true" />
      <div className={styles.blob2} aria-hidden="true" />

      <div className={styles.container}>
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

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.subtitle}>Sign in with your Google account to continue</p>
          </div>
          <div className={styles.divider}><span>Secure Access Portal</span></div>
          <div className={styles.googleWrapper}>
            {loading ? (
              <div className={styles.loadingBtn}>
                <span className="spinner" />
                <span>Verifying your account...</span>
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error('Google sign-in failed.')}
                useOneTap={false} theme="filled_black" size="large"
                width="100%" text="signin_with" shape="rectangular"
              />
            )}
          </div>
          <div className={styles.notice}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="14"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
            <span>Staff use institutional email. Students — sign in with any Google account to register.</span>
          </div>
        </div>

        <div className={styles.rolesRow}>
          {[
            { icon: '⬡', label: 'Super Admin', desc: 'Manages faculties & deans' },
            { icon: '◆', label: 'Dean', desc: 'Faculty oversight & placements' },
            { icon: '◉', label: 'Chairperson', desc: 'Courses & coordinators' },
            { icon: '◈', label: 'Student', desc: 'Register & track placements' },
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

        <p className={styles.footer}>Placement System v1.0 &nbsp;·&nbsp; Powered by MERN Stack</p>
      </div>
    </div>
  );
}
