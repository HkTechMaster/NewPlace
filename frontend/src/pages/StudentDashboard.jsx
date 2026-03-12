import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import styles from './StudentDashboard.module.css';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    axios.get('/students/me').then(res => {
      setStudent(res.data.student);
    }).catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.loading}><span className="spinner" style={{width:32,height:32}}/><span>Loading your profile...</span></div>
    </div>
  );

  if (!student) return (
    <div className={styles.page}><Navbar /><div className={styles.loading}>Profile not found.</div></div>
  );

  const course = student.course;
  const faculty = student.skillFaculty;

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>

        {/* Hero banner */}
        <div className={styles.hero}>
          <div className={styles.heroBg} />
          <div className={styles.heroContent}>
            <div className={styles.heroLeft}>
              {student.photo
                ? <img src={student.photo} alt="" className={styles.heroPhoto}/>
                : <div className={styles.heroPhotoFallback}>{student.name.charAt(0)}</div>
              }
              <div className={styles.heroInfo}>
                <div className={styles.heroGreeting}>Student Dashboard</div>
                <h1 className={styles.heroName}>{student.name}</h1>
                <div className={styles.heroBadges}>
                  <span className={styles.heroBadge} style={{background:'rgba(16,185,129,0.15)',color:'var(--success)',border:'1px solid rgba(16,185,129,0.3)'}}>● Active</span>
                  {student.enrollmentNo && <span className={styles.heroBadge}>Roll: {student.enrollmentNo}</span>}
                  <span className={styles.heroBadge}>Sem {student.semester}</span>
                </div>
              </div>
            </div>
            <div className={styles.heroRight}>
              <div className={styles.heroStat}><span>{course?.name || student.courseName}</span><small>Course</small></div>
              <div className={styles.heroStatDivider}/>
              <div className={styles.heroStat}><span>{student.batch}</span><small>Batch</small></div>
              <div className={styles.heroStatDivider}/>
              <div className={styles.heroStat}><span>{faculty?.code || '—'}</span><small>Faculty</small></div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab==='profile'?styles.tabActive:''}`} onClick={() => setActiveTab('profile')}>My Profile</button>
          <button className={`${styles.tab} ${activeTab==='course'?styles.tabActive:''}`} onClick={() => setActiveTab('course')}>Course Info</button>
          <button className={`${styles.tab} ${activeTab==='placements'?styles.tabActive:''}`} onClick={() => setActiveTab('placements')}>Placements</button>
        </div>

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionGrid}>

              {/* Personal Info */}
              <div className={styles.infoCard}>
                <div className={styles.infoCardTitle}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="16"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                  Personal Information
                </div>
                <div className={styles.infoList}>
                  <div className={styles.infoRow}><span>Full Name</span><strong>{student.name}</strong></div>
                  <div className={styles.infoRow}><span>Email</span><strong>{student.email}</strong></div>
                  <div className={styles.infoRow}><span>Phone</span><strong>{student.phone || '—'}</strong></div>
                  <div className={styles.infoRow}><span>Google Account</span><strong>{student.googleEmail || '—'}</strong></div>
                </div>
              </div>

              {/* Academic Info */}
              <div className={styles.infoCard}>
                <div className={styles.infoCardTitle}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="16"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/></svg>
                  Academic Details
                </div>
                <div className={styles.infoList}>
                  <div className={styles.infoRow}><span>Enrollment No.</span><strong>{student.enrollmentNo || '—'}</strong></div>
                  <div className={styles.infoRow}><span>Skill Faculty</span><strong>{faculty?.name || student.skillFacultyName}</strong></div>
                  <div className={styles.infoRow}><span>Department</span><strong>{student.departmentName || student.departmentCode || '—'}</strong></div>
                  <div className={styles.infoRow}><span>Course</span><strong>{student.courseName}</strong></div>
                  <div className={styles.infoRow}><span>Batch</span><strong>{student.batch}</strong></div>
                  <div className={styles.infoRow}><span>Current Semester</span><strong>Semester {student.semester}</strong></div>
                </div>
              </div>

              {/* Registration status */}
              <div className={styles.infoCard}>
                <div className={styles.infoCardTitle}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="16"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  Registration Status
                </div>
                <div className={styles.statusBlock}>
                  <div className={styles.statusBig}>✓ Approved</div>
                  <div className={styles.statusDate}>
                    {student.approvedAt
                      ? `Approved on ${new Date(student.approvedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}`
                      : 'Active student'
                    }
                  </div>
                </div>
                <div className={styles.infoList}>
                  <div className={styles.infoRow}><span>Registered On</span><strong>{new Date(student.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</strong></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── COURSE TAB ── */}
        {activeTab === 'course' && (
          <div className={styles.tabContent}>
            {!course ? (
              <div className={styles.empty}><div className={styles.emptyIcon}>📚</div><h3>Course info unavailable</h3></div>
            ) : (
              <div className={styles.courseDetailCard}>
                <div className={styles.courseDetailHeader}>
                  {student.courseCode && <span className={styles.courseCode}>{student.courseCode}</span>}
                  <h2 className={styles.courseDetailName}>{course.name}</h2>
                  <span className={styles.courseType}>{course.type}</span>
                </div>
                <div className={styles.courseStats}>
                  <div className={styles.courseStat}><div className={styles.courseStatVal}>{course.duration?.label}</div><div className={styles.courseStatLabel}>Duration</div></div>
                  <div className={styles.courseStat}><div className={styles.courseStatVal}>{course.totalBatches}</div><div className={styles.courseStatLabel}>Total Batches</div></div>
                  <div className={styles.courseStat}><div className={styles.courseStatVal}>{course.totalSeats || '—'}</div><div className={styles.courseStatLabel}>Seats</div></div>
                  <div className={styles.courseStat}><div className={styles.courseStatVal}>{course.currentBatch || '—'}</div><div className={styles.courseStatLabel}>Current Batch</div></div>
                </div>
                <div className={styles.myBatchCard}>
                  <div className={styles.myBatchTitle}>Your Batch Details</div>
                  <div className={styles.myBatchGrid}>
                    <div className={styles.myBatchItem}><span>Batch</span><strong>{student.batch}</strong></div>
                    <div className={styles.myBatchItem}><span>Current Semester</span><strong>Sem {student.semester}</strong></div>
                    <div className={styles.myBatchItem}><span>Faculty</span><strong>{faculty?.name || student.skillFacultyName}</strong></div>
                    <div className={styles.myBatchItem}><span>Department</span><strong>{student.departmentName || '—'}</strong></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PLACEMENTS TAB ── */}
        {activeTab === 'placements' && (
          <div className={styles.tabContent}>
            <div className={styles.comingSoon}>
              <div className={styles.comingSoonIcon}>🚀</div>
              <h3>Placements Coming Soon</h3>
              <p>Placement drives, company listings, and application tracking will be available here once your coordinator adds them.</p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
