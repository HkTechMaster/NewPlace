import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import StudentRegistrationForm from '../components/StudentRegistrationForm';
import styles from './StudentLogin.module.css';

// Screens: 'login' | 'register' | 'pending' | 'rejected' | 'forgot' | 'otp'
export default function StudentLogin() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState('login');
  const [loading, setLoading] = useState(false);

  // Login form
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]      = useState(false);

  // Forgot password
  const [fpIdentifier, setFpIdentifier] = useState('');
  const [maskedEmail, setMaskedEmail]   = useState('');
  const [otp, setOtp]                   = useState('');
  const [newPass, setNewPass]           = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');

  // Misc
  const [statusMsg, setStatusMsg]   = useState('');
  const [googleUser, setGoogleUser] = useState(null);

  // ── Password login ───────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier || !password) { toast.error('Enter your Roll No./Email and password'); return; }
    setLoading(true);
    try {
      const { data } = await axios.post('/student-auth/login', { identifier, password });
      if (data.success) {
        loginWithToken(data.token, data.user);
        navigate('/student/dashboard');
      } else {
        if (data.status === 'pending') { setStatusMsg(data.message); setScreen('pending'); }
        else if (data.status === 'rejected') { setStatusMsg(data.message); setScreen('rejected'); }
        else toast.error(data.message || 'Login failed');
      }
    } catch (e) { toast.error(e.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  // ── Google login ─────────────────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const { data } = await axios.post('/student-auth/google-login', { credential: credentialResponse.credential });
      if (data.success) {
        loginWithToken(data.token, data.user);
        navigate('/student/dashboard');
      } else if (data.status === 'needs_registration') {
        setGoogleUser(data.googleUser);
        setScreen('register');
      } else if (data.status === 'pending') {
        setStatusMsg(data.message); setScreen('pending');
      } else if (data.status === 'rejected') {
        setStatusMsg(data.message); setScreen('rejected');
      } else {
        toast.error(data.message || 'Google login failed');
      }
    } catch (e) { toast.error('Google login failed'); }
    finally { setLoading(false); }
  };

  // ── Forgot password — send OTP ────────────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!fpIdentifier) { toast.error('Enter your email or roll number'); return; }
    setLoading(true);
    try {
      const { data } = await axios.post('/student-auth/forgot-password', { identifier: fpIdentifier });
      if (data.success) { setMaskedEmail(data.maskedEmail); setScreen('otp'); toast.success('OTP sent!'); }
      else toast.error(data.message);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  // ── OTP verify + reset ────────────────────────────────────────
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (newPass !== confirmNewPass) { toast.error("Passwords don't match"); return; }
    if (newPass.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { data } = await axios.post('/student-auth/verify-otp', { identifier: fpIdentifier, otp, newPassword: newPass });
      if (data.success) { toast.success('Password reset! Please login.'); setScreen('login'); setOtp(''); setNewPass(''); setConfirmNewPass(''); }
      else toast.error(data.message);
    } catch (e) { toast.error(e.response?.data?.message || 'Invalid OTP'); }
    finally { setLoading(false); }
  };

  // ── REGISTRATION ─────────────────────────────────────────────
  if (screen === 'register') return <StudentRegistrationForm googleUser={googleUser} onSuccess={() => { setScreen('pending'); setStatusMsg('Registration submitted! Wait for coordinator approval.'); }} onBack={() => setScreen('login')}/>;

  // ── PENDING ───────────────────────────────────────────────────
  if (screen === 'pending') return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>PlacePro</div>
        <div className={styles.statusIcon}>⏳</div>
        <h2 className={styles.statusTitle}>Registration Under Review</h2>
        <p className={styles.statusMsg}>{statusMsg}</p>
        <div className={styles.steps}>
          <div className={styles.step}><span className={styles.stepDot} style={{background:'var(--success)'}}/> Form submitted</div>
          <div className={styles.step}><span className={styles.stepDot} style={{background:'var(--warning)'}}/> Awaiting coordinator approval</div>
          <div className={styles.step}><span className={styles.stepDot} style={{background:'var(--border)'}}/> Login access granted</div>
        </div>
        <button className={styles.backLink} onClick={() => setScreen('login')}>← Back to Login</button>
      </div>
    </div>
  );

  // ── REJECTED ──────────────────────────────────────────────────
  if (screen === 'rejected') return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>PlacePro</div>
        <div className={styles.statusIcon} style={{color:'var(--danger)'}}>✗</div>
        <h2 className={styles.statusTitle} style={{color:'var(--danger)'}}>Registration Rejected</h2>
        <p className={styles.statusMsg}>{statusMsg}</p>
        <button className={styles.backLink} onClick={() => setScreen('login')}>← Back to Login</button>
      </div>
    </div>
  );

  // ── FORGOT PASSWORD ───────────────────────────────────────────
  if (screen === 'forgot') return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>PlacePro</div>
        <h2 className={styles.cardTitle}>Reset Password</h2>
        <p className={styles.cardSub}>Enter your email or roll number. We'll send an OTP.</p>
        <form onSubmit={handleForgotPassword} className={styles.form}>
          <input className={styles.input} value={fpIdentifier} onChange={e => setFpIdentifier(e.target.value)} placeholder="Email or Roll Number" required/>
          <button type="submit" className={styles.submitBtn} disabled={loading}>{loading ? 'Sending...' : 'Send OTP'}</button>
        </form>
        <button className={styles.backLink} onClick={() => setScreen('login')}>← Back to Login</button>
      </div>
    </div>
  );

  // ── OTP SCREEN ────────────────────────────────────────────────
  if (screen === 'otp') return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>PlacePro</div>
        <h2 className={styles.cardTitle}>Enter OTP</h2>
        <p className={styles.cardSub}>OTP sent to <strong>{maskedEmail}</strong>. Valid for 10 minutes.</p>
        <form onSubmit={handleVerifyOTP} className={styles.form}>
          <input className={`${styles.input} ${styles.otpInput}`} value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6} required/>
          <input className={styles.input} type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New Password" required/>
          <input className={styles.input} type="password" value={confirmNewPass} onChange={e => setConfirmNewPass(e.target.value)} placeholder="Confirm New Password" required/>
          {confirmNewPass && newPass !== confirmNewPass && <span style={{fontSize:'0.75rem',color:'var(--danger)'}}>Passwords don't match</span>}
          <button type="submit" className={styles.submitBtn} disabled={loading}>{loading ? 'Verifying...' : 'Reset Password'}</button>
        </form>
        <button className={styles.backLink} onClick={() => setScreen('forgot')}>← Resend OTP</button>
      </div>
    </div>
  );

  // ── MAIN LOGIN ────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>PlacePro</div>
        <p className={styles.logoSub}>Student Portal</p>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputWrap}>
            <input className={styles.input} value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="Roll No. or Email" autoComplete="username" required/>
          </div>
          <div className={styles.inputWrap}>
            <input className={styles.input} type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" required/>
            <button type="button" className={styles.eyeInner} onClick={() => setShowPass(p=>!p)}>{showPass?'🙈':'👁'}</button>
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>{loading ? 'Logging in...' : 'Log in'}</button>
        </form>

        <button className={styles.forgotLink} onClick={() => setScreen('forgot')}>Forgot password?</button>

        <div className={styles.divider}><span>or</span></div>

        <div className={styles.googleWrap}>
          {loading ? (
            <div className={styles.googleLoading}><span className="spinner" style={{width:16,height:16}}/> Signing in...</div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google sign-in failed')}
              useOneTap={false}
              theme="filled_black"
              size="large"
              width="100%"
              text="continue_with"
              shape="rectangular"
            />
          )}
        </div>

        <div className={styles.divider}><span/></div>

        <div className={styles.registerBox}>
          <span>Don't have an account?</span>
          <button className={styles.createAccountBtn} onClick={() => { setGoogleUser(null); setScreen('register'); }}>
            Create new account
          </button>
        </div>

      </div>
    </div>
  );
}
