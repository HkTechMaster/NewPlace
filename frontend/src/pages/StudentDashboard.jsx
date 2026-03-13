import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import CVBuilder from './CVBuilder';
import { CVPreview } from './CVBuilder';
import styles from './StudentDashboard.module.css';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [cvData, setCvData] = useState({ cv: null, hasPending: false, pending: null });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [showCVBuilder, setShowCVBuilder] = useState(false);
  const [showCVView, setShowCVView] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [sRes, cvRes] = await Promise.all([
        axios.get('/students/me'),
        axios.get('/cv/mine').catch(() => ({ data: { cv: null } })),
      ]);
      setStudent(sRes.data.student);
      setCvData(cvRes.data);
    } catch { toast.error('Failed to load profile'); }
    finally { setLoading(false); }
  };

  const handleCVSaved = () => { setShowCVBuilder(false); fetchAll(); };

  if (loading) return (
    <div className={styles.page}><Navbar />
      <div className={styles.loading}><span className="spinner" style={{width:32,height:32}}/><span>Loading...</span></div>
    </div>
  );
  if (!student) return <div className={styles.page}><Navbar /><div className={styles.loading}>Profile not found.</div></div>;

  const cv = cvData.cv;
  const cvStatus = cv?.status || 'no_cv';
  const isVerified = cvStatus === 'verified' && !cvData.hasPending;
  const hasPendingUpdate = cvData.hasPending;

  // Derive CV status display
  const cvStatusInfo = {
    no_cv:    { label:'No CV',           color:'var(--text-muted)',    bg:'var(--bg-secondary)',           border:'var(--border)',                      emoji:'📝' },
    draft:    { label:'Draft saved',     color:'var(--text-muted)',    bg:'var(--bg-secondary)',           border:'var(--border)',                      emoji:'💾' },
    pending:  { label:'Pending Review',  color:'var(--warning)',       bg:'rgba(245,158,11,0.08)',         border:'rgba(245,158,11,0.25)',              emoji:'⏳' },
    verified: { label: hasPendingUpdate ? 'Verified (Update Pending)' : 'Verified ✓', color:'var(--success)', bg:'rgba(16,185,129,0.08)', border:'rgba(16,185,129,0.25)', emoji:'✅' },
    rejected: { label:'Changes Needed',  color:'var(--danger)',        bg:'rgba(239,68,68,0.07)',          border:'rgba(239,68,68,0.2)',                emoji:'✗' },
  }[cvStatus] || {};

  if (showCVBuilder) {
    return <CVBuilder existingCV={cv} onSaved={handleCVSaved} />;
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>

        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroBg}/>
          <div className={styles.heroContent}>
            <div className={styles.heroLeft}>
              {student.photo
                ? <img src={student.photo} alt="" className={styles.heroPhoto}/>
                : <div className={styles.heroPhotoFallback}>{student.name.charAt(0)}</div>
              }
              <div className={styles.heroInfo}>
                <p className={styles.heroGreeting}>Student Dashboard</p>
                <h1 className={styles.heroName}>{student.name}</h1>
                <div className={styles.heroBadges}>
                  <span className={styles.heroBadge} style={{background:cvStatusInfo.bg,color:cvStatusInfo.color,border:`1px solid ${cvStatusInfo.border}`}}>
                    {cvStatusInfo.emoji} {cvStatusInfo.label}
                  </span>
                  {student.enrollmentNo && <span className={styles.heroBadge}>Roll: {student.enrollmentNo}</span>}
                  <span className={styles.heroBadge}>Sem {student.semester}</span>
                </div>
              </div>
            </div>
            <div className={styles.heroRight}>
              <div className={styles.heroStat}><span>{student.courseName}</span><small>Course</small></div>
              <div className={styles.heroStatDivider}/>
              <div className={styles.heroStat}><span>{student.batch}</span><small>Batch</small></div>
              <div className={styles.heroStatDivider}/>
              <div className={styles.heroStat}><span>{student.skillFacultyName || '—'}</span><small>Faculty</small></div>
            </div>
          </div>
        </div>

        {/* CV Action Banner */}
        {cvStatus === 'no_cv' && (
          <div className={styles.cvBanner} style={{borderColor:'rgba(59,130,246,0.3)',background:'rgba(59,130,246,0.06)'}}>
            <div className={styles.cvBannerLeft}>
              <div className={styles.cvBannerIcon}>📄</div>
              <div><div className={styles.cvBannerTitle}>Complete Your Profile — Build Your CV</div><div className={styles.cvBannerSub}>Create your CV to get verified by your coordinator and unlock full dashboard access.</div></div>
            </div>
            <button className={styles.cvBannerBtn} onClick={() => setShowCVBuilder(true)}>Start Building →</button>
          </div>
        )}
        {cvStatus === 'draft' && (
          <div className={styles.cvBanner} style={{borderColor:'var(--border)',background:'var(--bg-secondary)'}}>
            <div className={styles.cvBannerLeft}><div className={styles.cvBannerIcon}>💾</div><div><div className={styles.cvBannerTitle}>CV Draft Saved</div><div className={styles.cvBannerSub}>You have an unsaved draft. Complete and submit for coordinator verification.</div></div></div>
            <button className={styles.cvBannerBtn} onClick={() => setShowCVBuilder(true)}>Continue Editing →</button>
          </div>
        )}
        {cvStatus === 'pending' && (
          <div className={styles.cvBanner} style={{borderColor:'rgba(245,158,11,0.3)',background:'rgba(245,158,11,0.06)'}}>
            <div className={styles.cvBannerLeft}><div className={styles.cvBannerIcon}>⏳</div><div><div className={styles.cvBannerTitle}>CV Under Review</div><div className={styles.cvBannerSub}>Your coordinator is reviewing your CV. You'll be notified once it's verified.</div></div></div>
            <button className={styles.cvBannerBtnSecondary} onClick={() => setShowCVView(true)}>View Submitted CV</button>
          </div>
        )}
        {cvStatus === 'rejected' && (
          <div className={styles.cvBanner} style={{borderColor:'rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.06)'}}>
            <div className={styles.cvBannerLeft}><div className={styles.cvBannerIcon}>✗</div><div><div className={styles.cvBannerTitle}>CV Needs Changes</div>{cv?.rejectionReason && <div className={styles.rejectionReason}>Coordinator said: "{cv.rejectionReason}"</div>}</div></div>
            <button className={styles.cvBannerBtn} style={{background:'var(--danger)'}} onClick={() => setShowCVBuilder(true)}>Update & Resubmit →</button>
          </div>
        )}
        {cvStatus === 'verified' && hasPendingUpdate && (
          <div className={styles.cvBanner} style={{borderColor:'rgba(245,158,11,0.3)',background:'rgba(245,158,11,0.06)'}}>
            <div className={styles.cvBannerLeft}><div className={styles.cvBannerIcon}>🔄</div><div><div className={styles.cvBannerTitle}>Updated CV Under Review</div><div className={styles.cvBannerSub}>Your updated CV is being reviewed. Your old verified CV stays active until then.</div></div></div>
            <button className={styles.cvBannerBtnSecondary} onClick={() => setShowCVView(true)}>View Current CV</button>
          </div>
        )}
        {cvStatus === 'verified' && !hasPendingUpdate && (
          <div className={styles.cvBanner} style={{borderColor:'rgba(16,185,129,0.3)',background:'rgba(16,185,129,0.06)'}}>
            <div className={styles.cvBannerLeft}><div className={styles.cvBannerIcon}>✅</div><div><div className={styles.cvBannerTitle}>CV Verified — You're placement ready!</div><div className={styles.cvBannerSub}>You can update your CV anytime. Old verified status stays until coordinator re-reviews.</div></div></div>
            <div style={{display:'flex',gap:10}}>
              <button className={styles.cvBannerBtnSecondary} onClick={() => setShowCVView(true)}>View CV</button>
              <button className={styles.cvBannerBtn} onClick={() => setShowCVBuilder(true)}>Update CV</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab==='home'?styles.tabActive:''}`} onClick={() => setActiveTab('home')}>My Profile</button>
          <button className={`${styles.tab} ${activeTab==='course'?styles.tabActive:''}`} onClick={() => setActiveTab('course')}>Course Info</button>
          <button className={`${styles.tab} ${activeTab==='placements'?styles.tabActive:''}`} onClick={() => setActiveTab('placements')}>
            Placements
            {!isVerified && <span className={styles.lockBadge}>🔒</span>}
          </button>
        </div>

        {activeTab === 'home' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionGrid}>
              <div className={styles.infoCard}>
                <div className={styles.infoCardTitle}><svg viewBox="0 0 20 20" fill="currentColor" width="14"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>Personal Information</div>
                <div className={styles.infoList}>
                  <div className={styles.infoRow}><span>Full Name</span><strong>{student.name}</strong></div>
                  <div className={styles.infoRow}><span>Email</span><strong>{student.email}</strong></div>
                  <div className={styles.infoRow}><span>Phone</span><strong>{student.phone || '—'}</strong></div>
                  <div className={styles.infoRow}><span>Google Account</span><strong>{student.googleEmail || '—'}</strong></div>
                </div>
              </div>
              <div className={styles.infoCard}>
                <div className={styles.infoCardTitle}><svg viewBox="0 0 20 20" fill="currentColor" width="14"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/></svg>Academic Details</div>
                <div className={styles.infoList}>
                  <div className={styles.infoRow}><span>Enrollment No.</span><strong>{student.enrollmentNo || '—'}</strong></div>
                  <div className={styles.infoRow}><span>Skill Faculty</span><strong>{student.skillFacultyName}</strong></div>
                  <div className={styles.infoRow}><span>Course</span><strong>{student.courseName}</strong></div>
                  <div className={styles.infoRow}><span>Batch</span><strong>{student.batch}</strong></div>
                  <div className={styles.infoRow}><span>Semester</span><strong>Semester {student.semester}</strong></div>
                </div>
              </div>
              <div className={styles.infoCard}>
                <div className={styles.infoCardTitle}>CV Status</div>
                <div className={styles.statusBlock} style={{borderColor:cvStatusInfo.border,background:cvStatusInfo.bg}}>
                  <div className={styles.statusBig} style={{color:cvStatusInfo.color}}>{cvStatusInfo.emoji} {cvStatusInfo.label}</div>
                  {cv?.verifiedAt && <div className={styles.statusDate}>Verified on {new Date(cv.verifiedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</div>}
                  {cv?.submittedAt && cvStatus==='pending' && <div className={styles.statusDate}>Submitted on {new Date(cv.submittedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>}
                </div>
                {!isVerified && cvStatus !== 'pending' && (
                  <button className={styles.buildCvBtn} onClick={() => setShowCVBuilder(true)}>
                    {cvStatus === 'no_cv' ? '📄 Build Your CV' : cvStatus === 'draft' ? '✏️ Continue Building' : '🔄 Update & Resubmit'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'course' && (
          <div className={styles.tabContent}>
            <div className={styles.courseDetailCard}>
              <div className={styles.courseDetailHeader}>
                {student.courseCode && <span className={styles.courseCode}>{student.courseCode}</span>}
                <h2 className={styles.courseDetailName}>{student.courseName}</h2>
              </div>
              <div className={styles.myBatchCard}>
                <div className={styles.myBatchGrid}>
                  <div className={styles.myBatchItem}><span>Batch</span><strong>{student.batch}</strong></div>
                  <div className={styles.myBatchItem}><span>Current Semester</span><strong>Sem {student.semester}</strong></div>
                  <div className={styles.myBatchItem}><span>Faculty</span><strong>{student.skillFacultyName}</strong></div>
                  <div className={styles.myBatchItem}><span>Department</span><strong>{student.departmentName || '—'}</strong></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'placements' && (
          <div className={styles.tabContent}>
            {!isVerified ? (
              <div className={styles.lockedPlacement}>
                <div className={styles.lockIcon}>🔒</div>
                <h3>Placements Locked</h3>
                <p>{cvStatus === 'no_cv' || cvStatus === 'draft' ? 'Build and submit your CV to unlock placement features.' : cvStatus === 'pending' ? 'Your CV is under review. Placements unlock once coordinator verifies your CV.' : 'Your CV was rejected. Update and resubmit to unlock placements.'}</p>
                {(cvStatus === 'no_cv' || cvStatus === 'draft' || cvStatus === 'rejected') && (
                  <button className={styles.buildCvBtn} onClick={() => setShowCVBuilder(true)}>{cvStatus === 'rejected' ? '🔄 Fix & Resubmit CV' : '📄 Build Your CV'}</button>
                )}
              </div>
            ) : (
              <div className={styles.comingSoon}>
                <div className={styles.comingSoonIcon}>🚀</div>
                <h3>Placements Coming Soon</h3>
                <p>Placement drives, company listings, and application tracking will appear here.</p>
              </div>
            )}
          </div>
        )}

      </main>

      {/* CV View Modal */}
      {showCVView && cv && (
        <div className={styles.cvViewOverlay} onClick={e=>e.target===e.currentTarget&&setShowCVView(false)}>
          <div className={styles.cvViewModal}>
            <div className={styles.cvViewHeader}>
              <h3>Your CV</h3>
              <div style={{display:'flex',gap:10}}>
                <button className={styles.downloadBtn} onClick={() => window.print()}>⬇ Download PDF</button>
                <button className={styles.closeBtn} onClick={() => setShowCVView(false)}>✕</button>
              </div>
            </div>
            <div className={styles.cvViewBody}><CVPreview data={cv}/></div>
          </div>
        </div>
      )}
    </div>
  );
}
