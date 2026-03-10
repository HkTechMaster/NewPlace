import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { studentAPI, courseAPI } from '../utils/api';
import styles from './CoordinatorDashboard.module.css';

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingStudents, setPendingStudents] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewStudent, setViewStudent] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedBatch, setExpandedBatch] = useState({});

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [pendRes, groupRes, courseRes] = await Promise.all([
        studentAPI.getPending(),
        studentAPI.getByCourse(),
        courseAPI.getAll(),
      ]);
      setPendingStudents(pendRes.data.students || []);
      setGrouped(groupRes.data.grouped || {});
      setCourses(courseRes.data.courses || []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const totalApproved = Object.values(grouped).reduce((a, c) => a + Object.values(c.batches).reduce((b, s) => b + s.length, 0), 0);

  const handleApprove = async (id, name) => {
    try { await studentAPI.approve(id); toast.success(`${name} approved!`); fetchAll(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleReject = async () => {
    try {
      await studentAPI.reject(rejectModal._id, rejectReason);
      toast.success('Student rejected'); setRejectModal(null); setRejectReason(''); fetchAll();
    } catch { toast.error('Failed'); }
  };

  const toggleBatch = (courseId, batch) => {
    const key = `${courseId}_${batch}`;
    setExpandedBatch(p => ({ ...p, [key]: !p[key] }));
  };

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {user?.avatar ? <img src={user.avatar} alt="" className={styles.avatar}/> : <div className={styles.avatarFallback}>{user?.name?.charAt(0)}</div>}
            <div>
              <p className={styles.greeting}>Coordinator Dashboard</p>
              <h1 className={styles.title}>{user?.name}</h1>
              {user?.departmentCode && <p className={styles.deptTag}>{user.departmentCode}</p>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={`${styles.statCard} ${pendingStudents.length > 0 ? styles.statHighlight : ''}`}>
            <div className={styles.statVal}>{pendingStudents.length}</div>
            <div className={styles.statLabel}>Pending Approvals</div>
          </div>
          <div className={styles.statCard}><div className={styles.statVal}>{totalApproved}</div><div className={styles.statLabel}>Active Students</div></div>
          <div className={styles.statCard}><div className={styles.statVal}>{courses.length}</div><div className={styles.statLabel}>Courses</div></div>
          <div className={styles.statCard}><div className={styles.statVal}>{Object.keys(grouped).length}</div><div className={styles.statLabel}>Active Course Groups</div></div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab==='pending'?styles.tabActive:''}`} onClick={() => setActiveTab('pending')}>
            Pending Approvals {pendingStudents.length > 0 && <span className={styles.badge}>{pendingStudents.length}</span>}
          </button>
          <button className={`${styles.tab} ${activeTab==='students'?styles.tabActive:''}`} onClick={() => setActiveTab('students')}>
            Students by Course
          </button>
          <button className={`${styles.tab} ${activeTab==='courses'?styles.tabActive:''}`} onClick={() => setActiveTab('courses')}>
            My Courses ({courses.length})
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}><span className="spinner" style={{width:28,height:28}}/><span>Loading...</span></div>
        ) : (<>

          {/* ── PENDING TAB ── */}
          {activeTab === 'pending' && (
            <div className={styles.tabContent}>
              {!pendingStudents.length ? (
                <div className={styles.empty}><div className={styles.emptyIcon}>✅</div><h3>No Pending Requests</h3><p>All student registrations are reviewed.</p></div>
              ) : (
                <div className={styles.pendingList}>
                  {pendingStudents.map(s => (
                    <div key={s._id} className={styles.pendingCard}>
                      <div className={styles.pendingLeft}>
                        {s.photo
                          ? <img src={s.photo} alt="" className={styles.studentPhoto}/>
                          : <div className={styles.studentPhotoFallback}>{s.name.charAt(0)}</div>
                        }
                        <div className={styles.pendingInfo}>
                          <div className={styles.pendingName}>{s.name}</div>
                          <div className={styles.pendingEmail}>{s.email}</div>
                          <div className={styles.pendingMeta}>
                            <span className={styles.metaTag}>{s.courseName}</span>
                            <span className={styles.metaTag}>Batch {s.batch}</span>
                            <span className={styles.metaTag}>Sem {s.semester}</span>
                          </div>
                          {s.enrollmentNo && <div className={styles.enrollNo}>Roll: {s.enrollmentNo}</div>}
                        </div>
                      </div>
                      <div className={styles.pendingRight}>
                        <button className={styles.viewBtn} onClick={() => setViewStudent(s)}>View</button>
                        <button className={styles.approveBtn} onClick={() => handleApprove(s._id, s.name)}>✓ Approve</button>
                        <button className={styles.rejectBtn} onClick={() => { setRejectModal(s); setRejectReason(''); }}>✕ Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STUDENTS BY COURSE TAB ── */}
          {activeTab === 'students' && (
            <div className={styles.tabContent}>
              {!Object.keys(grouped).length ? (
                <div className={styles.empty}><div className={styles.emptyIcon}>👥</div><h3>No Active Students</h3><p>Approved students will appear here organized by course and batch.</p></div>
              ) : Object.values(grouped).map(courseGroup => (
                <div key={courseGroup.courseId} className={styles.courseGroup}>
                  <div className={styles.courseGroupHeader}>
                    <div className={styles.courseGroupTitle}>
                      {courseGroup.courseCode && <span className={styles.courseCode}>{courseGroup.courseCode}</span>}
                      {courseGroup.courseName}
                    </div>
                    <span className={styles.totalStudents}>{Object.values(courseGroup.batches).reduce((a,b)=>a+b.length,0)} students</span>
                  </div>
                  {Object.entries(courseGroup.batches).map(([batch, students]) => {
                    const key = `${courseGroup.courseId}_${batch}`;
                    const isOpen = expandedBatch[key] !== false; // open by default
                    return (
                      <div key={batch} className={styles.batchSection}>
                        <button className={styles.batchHeader} onClick={() => toggleBatch(courseGroup.courseId, batch)}>
                          <div className={styles.batchLeft}>
                            <span className={styles.batchIcon}>📋</span>
                            <span className={styles.batchName}>Batch {batch}</span>
                          </div>
                          <div className={styles.batchRight}>
                            <span className={styles.batchCount}>{students.length} student{students.length!==1?'s':''}</span>
                            <svg viewBox="0 0 20 20" fill="currentColor" width="14" style={{transform:isOpen?'rotate(180deg)':'none',transition:'0.2s'}}><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                          </div>
                        </button>
                        {isOpen && (
                          <div className={styles.studentTable}>
                            <div className={styles.tableHeader}>
                              <span>Student</span>
                              <span>Semester</span>
                              <span>Phone</span>
                              <span>Enroll No.</span>
                              <span></span>
                            </div>
                            {students.map(s => (
                              <div key={s._id} className={styles.tableRow}>
                                <div className={styles.tableStudent}>
                                  {s.photo
                                    ? <img src={s.photo} alt="" className={styles.tablePhoto}/>
                                    : <div className={styles.tablePhotoFallback}>{s.name.charAt(0)}</div>
                                  }
                                  <div>
                                    <div className={styles.tableName}>{s.name}</div>
                                    <div className={styles.tableEmail}>{s.email}</div>
                                  </div>
                                </div>
                                <span className={styles.tableCell}>Sem {s.semester}</span>
                                <span className={styles.tableCell}>{s.phone || '—'}</span>
                                <span className={styles.tableCell}>{s.enrollmentNo || '—'}</span>
                                <button className={styles.viewBtn} onClick={() => setViewStudent(s)}>View</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* ── COURSES TAB ── */}
          {activeTab === 'courses' && (
            <div className={styles.tabContent}>
              {!courses.length ? (
                <div className={styles.empty}><div className={styles.emptyIcon}>📚</div><h3>No Courses</h3><p>You haven't been assigned to any courses yet.</p></div>
              ) : (
                <div className={styles.courseCards}>
                  {courses.map(c => (
                    <div key={c._id} className={styles.myCourseCard}>
                      <div className={styles.myCourseTop}>
                        {c.code && <span className={styles.courseCode}>{c.code}</span>}
                        <span className={styles.courseType}>{c.type}</span>
                      </div>
                      <div className={styles.myCourseName}>{c.name}</div>
                      {c.description && <div className={styles.myCourseDesc}>{c.description}</div>}
                      <div className={styles.myCourseDetails}>
                        <div className={styles.myCourseDetail}><span>Duration</span><strong>{c.duration?.label}</strong></div>
                        <div className={styles.myCourseDetail}><span>Batches</span><strong>{c.totalBatches}</strong></div>
                        <div className={styles.myCourseDetail}><span>Current</span><strong>{c.currentBatch || '—'}</strong></div>
                        <div className={styles.myCourseDetail}><span>Seats</span><strong>{c.totalSeats || '—'}</strong></div>
                      </div>
                      {c.coordinators?.length > 0 && (
                        <div className={styles.myCoordList}>
                          {c.coordinators.map((co, i) => (
                            <div key={i} className={styles.myCoordItem}>
                              <div className={styles.myCoordAvatar}>{(co.name||'C').charAt(0)}</div>
                              <div><div className={styles.myCoordName}>{co.name}</div><div className={styles.myCoordSub}>{co.subject || 'Coordinator'}</div></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>)}
      </main>

      {/* ── Student Profile Modal ── */}
      {viewStudent && (
        <div className={styles.overlay} onClick={e => e.target===e.currentTarget && setViewStudent(null)}>
          <div className={styles.studentModal}>
            <div className={styles.studentModalHeader}>
              <h3>Student Profile</h3>
              <button className={styles.closeBtn} onClick={() => setViewStudent(null)}>✕</button>
            </div>
            <div className={styles.studentModalBody}>
              <div className={styles.profileTop}>
                {viewStudent.photo
                  ? <img src={viewStudent.photo} alt="" className={styles.profilePhoto}/>
                  : <div className={styles.profilePhotoFallback}>{viewStudent.name.charAt(0)}</div>
                }
                <div>
                  <div className={styles.profileName}>{viewStudent.name}</div>
                  <div className={styles.profileEmail}>{viewStudent.email}</div>
                  <div className={styles.profilePhone}>{viewStudent.phone || 'No phone'}</div>
                  <span className={`${styles.profileStatus} ${styles[viewStudent.status]}`}>{viewStudent.status}</span>
                </div>
              </div>
              <div className={styles.profileGrid}>
                <div className={styles.profileItem}><span>Skill Faculty</span><strong>{viewStudent.skillFacultyName}</strong></div>
                <div className={styles.profileItem}><span>Course</span><strong>{viewStudent.courseName} {viewStudent.courseCode ? `(${viewStudent.courseCode})` : ''}</strong></div>
                <div className={styles.profileItem}><span>Department</span><strong>{viewStudent.departmentName || viewStudent.departmentCode || '—'}</strong></div>
                <div className={styles.profileItem}><span>Batch</span><strong>{viewStudent.batch}</strong></div>
                <div className={styles.profileItem}><span>Semester</span><strong>Semester {viewStudent.semester}</strong></div>
                <div className={styles.profileItem}><span>Enrollment No.</span><strong>{viewStudent.enrollmentNo || '—'}</strong></div>
                <div className={styles.profileItem}><span>Registered Email</span><strong>{viewStudent.email}</strong></div>
                <div className={styles.profileItem}><span>Google Email</span><strong>{viewStudent.googleEmail || '—'}</strong></div>
                <div className={styles.profileItem}><span>Registered On</span><strong>{new Date(viewStudent.createdAt).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'})}</strong></div>
                {viewStudent.approvedAt && <div className={styles.profileItem}><span>Approved On</span><strong>{new Date(viewStudent.approvedAt).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'})}</strong></div>}
              </div>
            </div>
            <div className={styles.studentModalFooter}>
              {viewStudent.status === 'pending' && (<>
                <button className={styles.approveBtn} onClick={() => { handleApprove(viewStudent._id, viewStudent.name); setViewStudent(null); }}>✓ Approve</button>
                <button className={styles.rejectBtn} onClick={() => { setRejectModal(viewStudent); setViewStudent(null); }}>✕ Reject</button>
              </>)}
              <button className={styles.cancelBtn} onClick={() => setViewStudent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <div className={styles.overlay} onClick={e => e.target===e.currentTarget && setRejectModal(null)}>
          <div className={styles.rejectBox}>
            <h3 className={styles.rejectTitle}>Reject Student</h3>
            <p className={styles.rejectSub}>Rejecting: <strong>{rejectModal.name}</strong></p>
            <textarea className={styles.rejectInput} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection (optional)..." rows={3}/>
            <div className={styles.rejectActions}>
              <button className={styles.cancelBtn} onClick={() => setRejectModal(null)}>Cancel</button>
              <button className={styles.dangerBtn} onClick={handleReject}>Reject Student</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
