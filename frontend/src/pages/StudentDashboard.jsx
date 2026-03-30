import NotificationBell from '../components/NotificationBell';
import PlacementSection from './PlacementSection';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import CVBuilder from './CVBuilder';
import { CVPreview } from './CVBuilder';
import { cvAPI } from '../utils/api';
import styles from './StudentDashboard.module.css';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [cvs, setCvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  // CV builder/viewer
  const [buildingCV, setBuildingCV] = useState(null); // null | 'new' | cvObject (editing)
  const [viewingCV, setViewingCV] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [submitting, setSubmitting] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [sRes, cvRes] = await Promise.all([
        axios.get('/students/me'),
        cvAPI.getMine().catch(() => ({ data: { cvs: [] } })),
      ]);
      setStudent(sRes.data.student);
      setCvs(cvRes.data.cvs || []);
    } catch { toast.error('Failed to load profile'); }
    finally { setLoading(false); }
  };

  const verifiedCV = cvs.find(c => c.status === 'verified');
  const pendingCV = cvs.find(c => c.status === 'pending');
  const isFullyVerified = !!verifiedCV;

  // Reminder — find any CV with unread reminder
  const reminderCV = cvs.find(c => c.reminderAt && !c.reminderDismissed);

  const handleDismissReminder = async () => {
    if (!reminderCV) return;
    try {
      await cvAPI.dismissReminder(reminderCV._id);
      setCvs(prev => prev.map(c => c._id === reminderCV._id ? { ...c, reminderDismissed: true } : c));
    } catch { /* silent */ }
  };

  const handleSubmitForVerification = async (cvId) => {
    if (pendingCV && pendingCV._id !== cvId) {
      toast.error('You already have a CV pending verification. Only 1 at a time.');
      return;
    }
    setSubmitting(cvId);
    try {
      await cvAPI.submit(cvId);
      toast.success('CV submitted for verification!');
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSubmitting(null); }
  };

  const handleDeleteCV = async (cvId) => {
    try {
      await cvAPI.delete(cvId);
      toast.success('CV deleted');
      setConfirmDelete(null);
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Cannot delete'); }
  };

  const handleCVSaved = () => {
    setBuildingCV(null);
    fetchAll();
  };

  // Status display config
  const statusConfig = {
    draft: { label: 'Draft', color: 'var(--text-muted)', bg: 'var(--bg-secondary)', border: 'var(--border)' },
    pending: { label: '⏳ Under Review', color: 'var(--warning)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)' },
    verified: { label: '✓ Verified', color: 'var(--success)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)' },
    rejected: { label: '✗ Changes Needed', color: 'var(--danger)', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.25)' },
  };

  if (buildingCV !== null) {
    return (
      <CVBuilder
        existingCV={buildingCV === 'new' ? null : buildingCV}
        isNew={buildingCV === 'new'}
        onSaved={handleCVSaved}
        onCancel={() => setBuildingCV(null)}
      />
    );
  }

  if (loading) return (
    <div className={styles.page}><Navbar />
      <div className={styles.loading}><span className="spinner" style={{ width: 32, height: 32 }} /><span>Loading...</span></div>
    </div>
  );

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>

        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroBg} />

          {/* ✅ NEW — Bell at top right */}
          <div className={styles.bellWrapper}>
            <NotificationBell />
          </div>

          <div className={styles.heroContent}>
            <div className={styles.heroLeft}>
              {student?.photo
                ? <img src={student.photo} alt="" className={styles.heroPhoto} />
                : <div className={styles.heroPhotoFallback}>{student?.name?.charAt(0)}</div>
              }
              <div className={styles.heroInfo}>
                <p className={styles.heroGreeting}>Student Dashboard</p>
                <h1 className={styles.heroName}>{student?.name}</h1>
                <div className={styles.heroBadges}>
                  {isFullyVerified
                    ? <span className={styles.heroBadge} style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)' }}>✓ CV Verified</span>
                    : pendingCV
                      ? <span className={styles.heroBadge} style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.3)' }}>⏳ CV Pending</span>
                      : <span className={styles.heroBadge} style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>📄 CV Required</span>
                  }
                  {student?.enrollmentNo && <span className={styles.heroBadge}>Roll: {student.enrollmentNo}</span>}
                  <span className={styles.heroBadge}>Sem {student?.semester}</span>
                </div>
              </div>

              <div className={styles.heroStat}><span>{student?.courseName}</span><small>Course</small></div>
              <div className={styles.heroStatDivider} />
              <div className={styles.heroStat}><span>{student?.batch}</span><small>Batch</small></div>
              <div className={styles.heroStatDivider} />
              <div className={styles.heroStat}><span>{student?.skillFacultyName || '—'}</span><small>Faculty</small></div>
            </div>
          </div>
        </div>

        {/* Reminder banner */}
        {reminderCV && (
          <div className={styles.reminderBanner}>
            <div className={styles.reminderLeft}>
              <span className={styles.reminderIcon}>🔔</span>
              <div>
                <div className={styles.reminderTitle}>Reminder from your Coordinator</div>
                <div className={styles.reminderSub}>
                  Your coordinator has sent a reminder to update and resubmit your CV.
                  {reminderCV.rejectionReason && <span> Reason: "<em>{reminderCV.rejectionReason}</em>"</span>}
                </div>
              </div>
            </div>
            <button className={styles.reminderDismiss} onClick={handleDismissReminder}>✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab === 'profile' ? styles.tabActive : ''}`} onClick={() => setActiveTab('profile')}>My CVs</button>
          <button className={`${styles.tab} ${activeTab === 'course' ? styles.tabActive : ''}`} onClick={() => setActiveTab('course')}>Course Info</button>
          <button className={`${styles.tab} ${activeTab === 'placements' ? styles.tabActive : ''}`} onClick={() => setActiveTab('placements')}>
            Placements {!isFullyVerified && <span className={styles.lockBadge}>🔒</span>}
          </button>
          <button className={`${styles.tab} ${activeTab === 'account' ? styles.tabActive : ''}`} onClick={() => setActiveTab('account')}>
            Account
          </button>
        </div>

        {/* ── MY CVs TAB ── */}
        {activeTab === 'profile' && (
          <div className={styles.tabContent}>
            {/* Build new CV button */}
            <div className={styles.cvTabHeader}>
              <div>
                <h3 className={styles.cvTabTitle}>Your CVs</h3>
                <p className={styles.cvTabSub}>
                  {pendingCV ? 'One CV is under review. You can still create others.' : 'Submit one CV for coordinator verification to unlock placements.'}
                </p>
              </div>
              <button className={styles.buildNewBtn} onClick={() => setBuildingCV('new')}>
                + Build New CV
              </button>
            </div>

            {cvs.length === 0 ? (
              <div className={styles.noCVState}>
                <div className={styles.noCVIcon}>📄</div>
                <h3>No CVs Yet</h3>
                <p>Build your first CV to get verified by your coordinator and unlock placement features.</p>
                <button className={styles.buildNewBtn} style={{ margin: '0 auto' }} onClick={() => setBuildingCV('new')}>
                  + Build Your First CV
                </button>
              </div>
            ) : (
              <div className={styles.cvGrid}>
                {cvs.map(cv => {
                  const sc = statusConfig[cv.status] || statusConfig.draft;
                  const isVerifiedCV = cv.status === 'verified';
                  const isPendingCV = cv.status === 'pending';
                  const isRejected = cv.status === 'rejected';
                  return (
                    <div key={cv._id} className={`${styles.cvCard} ${isVerifiedCV ? styles.cvCardVerified : ''}`}>
                      {/* Verified crown */}
                      {isVerifiedCV && <div className={styles.verifiedRibbon}>✓ VERIFIED</div>}

                      <div className={styles.cvCardTop}>
                        <div className={styles.cvCardTitle}>{cv.title || 'My CV'}</div>
                        <span className={styles.cvStatusPill} style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                      </div>

                      <div className={styles.cvCardMeta}>
                        <span>Created: {new Date(cv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        {cv.verifiedAt && <span>Verified: {new Date(cv.verifiedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                        {isPendingCV && cv.submittedAt && <span>Submitted: {new Date(cv.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}
                      </div>

                      {isRejected && cv.rejectionReason && (
                        <div className={styles.cvRejectionNote}>✗ "{cv.rejectionReason}"</div>
                      )}

                      <div className={styles.cvCardActions}>
                        {/* View/Download — always */}
                        <button className={styles.cvViewBtn} onClick={() => setViewingCV(cv)}>
                          <svg viewBox="0 0 20 20" fill="currentColor" width="13"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                          View
                        </button>

                        {/* Update — always (except pending) */}
                        {!isPendingCV && (
                          <button className={styles.cvEditBtn} onClick={() => setBuildingCV(cv)}>
                            <svg viewBox="0 0 20 20" fill="currentColor" width="13"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                            Update
                          </button>
                        )}

                        {/* Submit for verification — draft or rejected */}
                        {(cv.status === 'draft' || cv.status === 'rejected') && (
                          <button
                            className={styles.cvSubmitBtn}
                            onClick={() => handleSubmitForVerification(cv._id)}
                            disabled={submitting === cv._id}
                          >
                            {submitting === cv._id ? '...' : '→ Submit'}
                          </button>
                        )}

                        {/* Delete — only draft or rejected */}
                        {(cv.status === 'draft' || cv.status === 'rejected') && (
                          <button className={styles.cvDeleteBtn} onClick={() => setConfirmDelete(cv)}>🗑</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── COURSE INFO TAB ── */}
        {activeTab === 'course' && (
          <div className={styles.tabContent}>
            <div className={styles.courseDetailCard}>
              <div className={styles.courseDetailHeader}>
                {student?.courseCode && <span className={styles.courseCode}>{student.courseCode}</span>}
                <h2 className={styles.courseDetailName}>{student?.courseName}</h2>
              </div>
              <div className={styles.myBatchCard}>
                <div className={styles.myBatchGrid}>
                  <div className={styles.myBatchItem}><span>Batch</span><strong>{student?.batch}</strong></div>
                  <div className={styles.myBatchItem}><span>Current Semester</span><strong>Sem {student?.semester}</strong></div>
                  <div className={styles.myBatchItem}><span>Faculty</span><strong>{student?.skillFacultyName}</strong></div>
                  <div className={styles.myBatchItem}><span>Department</span><strong>{student?.departmentName || '—'}</strong></div>
                  <div className={styles.myBatchItem}><span>Enrollment No.</span><strong>{student?.enrollmentNo || '—'}</strong></div>
                  <div className={styles.myBatchItem}><span>Email</span><strong>{student?.email}</strong></div>
                  <div className={styles.myBatchItem}><span>Phone</span><strong>{student?.phone || '—'}</strong></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PLACEMENTS TAB ── */}
        {activeTab === 'placements' && (
          <div className={styles.tabContent}>
            {!isFullyVerified ? (
              <div className={styles.lockedPlacement}>
                <div className={styles.lockIcon}>🔒</div>
                <h3>Placements Locked</h3>
                <p>{!cvs.length || cvs.every(c => c.status === 'draft') ? 'Build and submit your CV for coordinator verification to unlock placements.' : pendingCV ? 'Your CV is under review. Placements unlock once coordinator verifies.' : 'Your CV needs changes. Update and resubmit to unlock placements.'}</p>
              </div>
            ) : (
              <PlacementSection studentId={student?._id} />
            )}
          </div>
        )}

        {/* ── ACCOUNT TAB ── */}
        {activeTab === 'account' && (
          <div className={styles.tabContent}>
            <ChangePasswordForm />
          </div>
        )}

      </main>

      {/* CV View Modal */}
      {viewingCV && (
        <div className={styles.cvViewOverlay} onClick={e => e.target === e.currentTarget && setViewingCV(null)}>
          <div className={styles.cvViewModal}>
            <div className={styles.cvViewHeader}>
              <div>
                <h3>{viewingCV.title || 'My CV'}</h3>
                {viewingCV.status === 'verified' && <span className={styles.verifiedTag}>✓ Verified</span>}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className={styles.downloadBtn} onClick={() => window.print()}>⬇ Download PDF</button>
                <button className={styles.closeBtn} onClick={() => setViewingCV(null)}>✕</button>
              </div>
            </div>
            <div className={styles.cvViewBody}><CVPreview data={viewingCV} /></div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className={styles.cvViewOverlay} onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className={styles.confirmBox}>
            <h3>Delete this CV?</h3>
            <p>"{confirmDelete.title || 'My CV'}" will be permanently deleted.</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className={styles.dangerBtn} onClick={() => handleDeleteCV(confirmDelete._id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Change Password Form ──────────────────────────────────────────────────────
function ChangePasswordForm() {
  const [form, setForm] = React.useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) { toast.error("New passwords don't match"); return; }
    if (form.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await axios.put('/student-auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password changed successfully!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to change password'); }
    finally { setLoading(false); }
  };

  const inputStyle = {
    width: '100%', padding: '10px 13px',
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
    fontSize: '0.875rem', fontFamily: 'var(--font-body)', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 };
  const fieldStyle = { display: 'flex', flexDirection: 'column', marginBottom: 14 };
  const passWrapStyle = { position: 'relative', display: 'flex' };
  const eyeStyle = { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', opacity: 0.6 };

  return (
    <div style={{ maxWidth: 460 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px 28px' }}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 5 }}>Change Password</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>You'll need your current password to set a new one.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Current Password</label>
            <div style={passWrapStyle}>
              <input style={{ ...inputStyle, paddingRight: 40 }} type={showCurrent ? 'text' : 'password'} value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="Your current password" required />
              <button type="button" style={eyeStyle} onClick={() => setShowCurrent(p => !p)}>{showCurrent ? '🙈' : '👁'}</button>
            </div>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>New Password <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(min 6 characters)</span></label>
            <div style={passWrapStyle}>
              <input style={{ ...inputStyle, paddingRight: 40 }} type={showNew ? 'text' : 'password'} value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="New password" required />
              <button type="button" style={eyeStyle} onClick={() => setShowNew(p => !p)}>{showNew ? '🙈' : '👁'}</button>
            </div>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Confirm New Password</label>
            <input style={inputStyle} type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repeat new password" required />
            {form.confirmPassword && form.newPassword !== form.confirmPassword && <span style={{ fontSize: '0.7rem', color: 'var(--danger)', marginTop: 4 }}>Passwords don't match</span>}
            {form.confirmPassword && form.newPassword === form.confirmPassword && form.newPassword.length >= 6 && <span style={{ fontSize: '0.7rem', color: 'var(--success)', marginTop: 4 }}>✓ Passwords match</span>}
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '10px 24px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: 'white', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font-body)', cursor: 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.15s' }}
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Student Placement Section ─────────────────────────────────────────────────
