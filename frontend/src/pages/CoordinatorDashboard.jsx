import React, { useState, useEffect } from 'react';import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { studentAPI, courseAPI, cvAPI } from '../utils/api';
import { CVPreview } from './CVBuilder';
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

  // CV state
  const [cvRequests, setCvRequests] = useState({ pendingCVs: [], pendingUpdates: [] });
  const [studentsList, setStudentsList] = useState({});
  const [viewCV, setViewCV] = useState(null); // { cv, isUpdate }
  const [cvRejectModal, setCvRejectModal] = useState(null); // { id, isUpdate, name }
  const [cvRejectReason, setCvRejectReason] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [pendRes, groupRes, courseRes, cvReqRes, cvListRes] = await Promise.all([
        studentAPI.getPending(),
        studentAPI.getByCourse(),
        courseAPI.getAll(),
        cvAPI.getRequests().catch(() => ({ data: { pendingCVs: [], pendingUpdates: [] } })),
        cvAPI.getStudentsList().catch(() => ({ data: { grouped: {} } })),
      ]);
      setPendingStudents(pendRes.data.students || []);
      setGrouped(groupRes.data.grouped || {});
      setCourses(courseRes.data.courses || []);
      setCvRequests(cvReqRes.data);
      setStudentsList(cvListRes.data.grouped || {});
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleRemind = async (cvId, name) => {
    try { await cvAPI.remind(cvId); toast.success(`Reminder sent to ${name}!`); fetchAll(); }
    catch { toast.error('Failed'); }
  };

  const totalApproved = Object.values(grouped).reduce((a, c) => a + Object.values(c.batches).reduce((b, s) => b + s.length, 0), 0);
  const totalCvRequests = (cvRequests.pendingCVs?.length || 0) + (cvRequests.pendingUpdates?.length || 0);

  const handleCvVerify = async (id) => {
    try { await cvAPI.verify(id); toast.success('CV Verified!'); fetchAll(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const handleCvReject = async () => {
    try {
      await cvAPI.reject(cvRejectModal.id, cvRejectReason);
      toast.success('CV rejected'); setCvRejectModal(null); setCvRejectReason(''); fetchAll();
    } catch { toast.error('Failed'); }
  };
  const openCVView = async (cvId, cvStatus) => {
    try {
      const res = await cvAPI.getById(cvId);
      setViewCV({ data: res.data.cv, id: cvId, status: cvStatus || res.data.cv.status });
    } catch { toast.error('Failed to load CV'); }
  };

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
          <button className={`${styles.tab} ${activeTab==='cv'?styles.tabActive:''}`} onClick={() => setActiveTab('cv')}>
            CV Requests {totalCvRequests > 0 && <span className={styles.badge}>{totalCvRequests}</span>}
          </button>
          <button className={`${styles.tab} ${activeTab==='cvlist'?styles.tabActive:''}`} onClick={() => setActiveTab('cvlist')}>
            Students CV Status
          </button>
          <button className={`${styles.tab} ${activeTab==='students'?styles.tabActive:''}`} onClick={() => setActiveTab('students')}>
            Login Students
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

          {/* ── CV REQUESTS TAB ── */}
          {activeTab === 'cv' && (
            <div className={styles.tabContent}>
              {!cvRequests.pendingCVs?.length ? (
                <div className={styles.empty}><div className={styles.emptyIcon}>📋</div><h3>No Pending CV Requests</h3><p>Student CV submissions will appear here.</p></div>
              ) : (
                <div className={styles.pendingList}>
                  {cvRequests.pendingCVs.map(cv => (
                    <div key={cv._id} className={`${styles.pendingCard} ${styles.cvCard}`}>
                      <div className={styles.pendingLeft}>
                        {cv.student?.photo ? <img src={cv.student.photo} alt="" className={styles.studentPhoto}/> : <div className={styles.studentPhotoFallback}>{cv.student?.name?.charAt(0)}</div>}
                        <div className={styles.pendingInfo}>
                          <div className={styles.pendingName}>{cv.student?.name}</div>
                          <div className={styles.pendingEmail}>{cv.student?.email}</div>
                          <div className={styles.pendingMeta}>
                            <span className={styles.metaTag}>{cv.student?.courseName}</span>
                            <span className={styles.metaTag}>Batch {cv.student?.batch}</span>
                            <span className={styles.metaTag}>Sem {cv.student?.semester}</span>
                          </div>
                          {cv.submittedAt && <div className={styles.enrollNo}>Submitted: {new Date(cv.submittedAt).toLocaleDateString('en-IN')}</div>}
                        </div>
                      </div>
                      <div className={styles.pendingRight}>
                        <button className={styles.viewBtn} onClick={() => openCVView(cv._id, 'pending')}>View CV</button>
                        <button className={styles.approveBtn} onClick={() => handleCvVerify(cv._id)}>✓ Verify</button>
                        <button className={styles.rejectBtn} onClick={() => { setCvRejectModal({ id: cv._id, name: cv.student?.name }); setCvRejectReason(''); }}>✕ Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CV STATUS LIST TAB ── */}
          {activeTab === 'cvlist' && (
            <div className={styles.tabContent}>
              {!Object.keys(studentsList).length ? (
                <div className={styles.empty}><div className={styles.emptyIcon}>📊</div><h3>No students yet</h3></div>
              ) : Object.entries(studentsList).map(([courseName, batches]) => (
                <div key={courseName} className={styles.courseGroup}>
                  <div className={styles.courseGroupHeader}>
                    <div className={styles.courseGroupTitle}>{courseName}</div>
                    <span className={styles.totalStudents}>{Object.values(batches).reduce((a,b)=>a+b.length,0)} students</span>
                  </div>
                  {/* Batch tabs */}
                  <BatchTabs
                    batches={batches}
                    onViewCV={(cvId, status) => openCVView(cvId, status)}
                    onRemind={(cvId, name) => handleRemind(cvId, name)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── LOGIN STUDENTS TAB ── */}
          {activeTab === 'students' && (
            <div className={styles.tabContent}>
              {!Object.keys(grouped).length ? (
                <div className={styles.empty}><div className={styles.emptyIcon}>👥</div><h3>No Active Students</h3><p>Approved students appear here organized by course and batch.</p></div>
              ) : Object.values(grouped).map(courseGroup => (
                <div key={courseGroup.courseId} className={styles.courseGroup}>
                  <div className={styles.courseGroupHeader}>
                    <div className={styles.courseGroupTitle}>
                      {courseGroup.courseCode && <span className={styles.courseCode}>{courseGroup.courseCode}</span>}
                      {courseGroup.courseName}
                    </div>
                    <span className={styles.totalStudents}>{Object.values(courseGroup.batches).reduce((a,b)=>a+b.length,0)} students</span>
                  </div>
                  <LoginStudentsBatchTabs batches={courseGroup.batches} onView={setViewStudent}/>
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

      {/* ── CV View Modal ── */}
      {viewCV && (
        <div className={styles.overlay} onClick={e => e.target===e.currentTarget && setViewCV(null)}>
          <div className={styles.studentModal} style={{maxWidth:780}}>
            <div className={styles.studentModalHeader}>
              <h3>Student CV {viewCV.status === 'verified' && <span style={{fontSize:'0.65rem',color:'var(--success)',background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.25)',padding:'2px 8px',borderRadius:6,marginLeft:8}}>✓ Verified</span>}</h3>
              <button className={styles.closeBtn} onClick={() => setViewCV(null)}>✕</button>
            </div>
            <div style={{overflow:'auto',padding:24,maxHeight:'70vh'}}>
              <CVPreview data={viewCV.data}/>
            </div>
            {/* Only show verify/reject if CV is pending */}
            {viewCV.status === 'pending' && (
              <div className={styles.studentModalFooter}>
                <button className={styles.approveBtn} onClick={() => { handleCvVerify(viewCV.id); setViewCV(null); }}>✓ Verify CV</button>
                <button className={styles.rejectBtn} onClick={() => { setCvRejectModal({ id: viewCV.id, name: '' }); setViewCV(null); }}>✕ Reject</button>
                <button className={styles.cancelBtn} onClick={() => setViewCV(null)}>Close</button>
              </div>
            )}
            {viewCV.status !== 'pending' && (
              <div className={styles.studentModalFooter}>
                <button className={styles.cancelBtn} onClick={() => setViewCV(null)}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CV Reject Modal ── */}
      {cvRejectModal && (
        <div className={styles.overlay} onClick={e => e.target===e.currentTarget && setCvRejectModal(null)}>
          <div className={styles.rejectBox}>
            <h3 className={styles.rejectTitle}>Reject CV</h3>
            {cvRejectModal.name && <p className={styles.rejectSub}>Student: <strong>{cvRejectModal.name}</strong></p>}
            <textarea className={styles.rejectInput} value={cvRejectReason} onChange={e => setCvRejectReason(e.target.value)} placeholder="Tell the student what needs to be changed..." rows={4}/>
            <div className={styles.rejectActions}>
              <button className={styles.cancelBtn} onClick={() => setCvRejectModal(null)}>Cancel</button>
              <button className={styles.dangerBtn} onClick={handleCvReject}>Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Student Reject Modal ── */}
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

// ── CV Status BatchTabs ──────────────────────────────────────────────────────
function BatchTabs({ batches, onViewCV, onRemind }) {
  const batchKeys = Object.keys(batches);
  const [active, setActive] = React.useState(batchKeys[0] || '');
  const students = batches[active] || [];
  const statusMap = {
    no_cv:   { label:'No CV',      color:'var(--text-muted)' },
    draft:   { label:'Draft',      color:'var(--text-muted)' },
    pending: { label:'⏳ Pending', color:'var(--warning)'    },
    verified:{ label:'✓ Verified', color:'var(--success)'    },
    rejected:{ label:'✗ Rejected', color:'var(--danger)'     },
  };
  const pill = (b) => ({
    padding:'5px 14px', borderRadius:20, fontFamily:'var(--font-body)',
    fontSize:'0.78rem', fontWeight:700, border:'1px solid', cursor:'pointer', transition:'all 0.15s',
    background: active===b ? 'var(--accent)' : 'var(--bg-secondary)',
    color: active===b ? 'white' : 'var(--text-muted)',
    borderColor: active===b ? 'var(--accent)' : 'var(--border)',
  });
  return (
    <div>
      <div style={{display:'flex',gap:8,padding:'12px 16px',borderBottom:'1px solid var(--border)',flexWrap:'wrap'}}>
        {batchKeys.map(b => <button key={b} onClick={()=>setActive(b)} style={pill(b)}>{b} <span style={{opacity:0.7,fontWeight:400}}>({batches[b].length})</span></button>)}
      </div>
      {!students.length ? <div style={{padding:'20px',textAlign:'center',fontSize:'0.825rem',color:'var(--text-muted)'}}>No students in this batch</div> : (
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{fontSize:'0.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text-muted)',borderBottom:'1px solid var(--border)'}}>
            <th style={{padding:'8px 16px',textAlign:'left'}}>Student</th>
            <th style={{padding:'8px 16px',textAlign:'left'}}>Sem</th>
            <th style={{padding:'8px 16px',textAlign:'left'}}>CV Status</th>
            <th style={{padding:'8px 16px',textAlign:'left'}}>Actions</th>
          </tr></thead>
          <tbody>{students.map(s => {
            const st = statusMap[s.cvStatus]||statusMap.no_cv;
            return (<tr key={s._id} style={{borderBottom:'1px solid var(--border)'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <td style={{padding:'10px 16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  {s.photo ? <img src={s.photo} alt="" style={{width:30,height:30,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/> : <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',fontWeight:700,flexShrink:0}}>{s.name?.charAt(0)}</div>}
                  <div><div style={{fontSize:'0.875rem',fontWeight:600,color:'var(--text-primary)'}}>{s.name}</div><div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{s.email}</div></div>
                </div>
              </td>
              <td style={{padding:'10px 16px',fontSize:'0.825rem',color:'var(--text-secondary)'}}>Sem {s.semester}</td>
              <td style={{padding:'10px 16px',fontSize:'0.825rem',fontWeight:600,color:st.color}}>{st.label}</td>
              <td style={{padding:'10px 16px'}}>
                <div style={{display:'flex',gap:6}}>
                  {s.cvId && <button onClick={()=>onViewCV(s.cvId,s.cvStatus)} style={{padding:'5px 12px',background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:'var(--radius-sm)',color:'var(--accent)',fontSize:'0.75rem',fontFamily:'var(--font-body)',cursor:'pointer'}}>View CV</button>}
                  {s.cvStatus==='rejected' && s.cvId && <button onClick={()=>onRemind(s.cvId,s.name)} style={{padding:'5px 12px',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'var(--radius-sm)',color:'var(--gold)',fontSize:'0.75rem',fontFamily:'var(--font-body)',cursor:'pointer'}}>🔔 Remind</button>}
                </div>
              </td>
            </tr>);
          })}</tbody>
        </table>
      )}
    </div>
  );
}

// ── Login Students BatchTabs ─────────────────────────────────────────────────
function LoginStudentsBatchTabs({ batches, onView }) {
  const batchKeys = Object.keys(batches);
  const [active, setActive] = React.useState(batchKeys[0] || '');
  const students = batches[active] || [];
  const pill = (b) => ({
    padding:'5px 14px', borderRadius:20, fontFamily:'var(--font-body)',
    fontSize:'0.78rem', fontWeight:700, border:'1px solid', cursor:'pointer', transition:'all 0.15s',
    background: active===b ? 'rgba(139,92,246,0.2)' : 'var(--bg-secondary)',
    color: active===b ? '#a78bfa' : 'var(--text-muted)',
    borderColor: active===b ? 'rgba(139,92,246,0.4)' : 'var(--border)',
  });
  return (
    <div>
      <div style={{display:'flex',gap:8,padding:'12px 16px',borderBottom:'1px solid var(--border)',flexWrap:'wrap'}}>
        {batchKeys.map(b => <button key={b} onClick={()=>setActive(b)} style={pill(b)}>{b} <span style={{opacity:0.7,fontWeight:400}}>({batches[b].length})</span></button>)}
      </div>
      {!students.length ? <div style={{padding:'20px',textAlign:'center',fontSize:'0.825rem',color:'var(--text-muted)'}}>No students in this batch</div> : (
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{fontSize:'0.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text-muted)',borderBottom:'1px solid var(--border)'}}>
            <th style={{padding:'8px 16px',textAlign:'left'}}>Student</th>
            <th style={{padding:'8px 16px',textAlign:'left'}}>Semester</th>
            <th style={{padding:'8px 16px',textAlign:'left'}}>Phone</th>
            <th style={{padding:'8px 16px',textAlign:'left'}}>Enroll No.</th>
            <th style={{padding:'8px 16px'}}></th>
          </tr></thead>
          <tbody>{students.map(s => (
            <tr key={s._id} style={{borderBottom:'1px solid var(--border)'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <td style={{padding:'10px 16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  {s.photo ? <img src={s.photo} alt="" style={{width:30,height:30,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/> : <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',fontWeight:700,flexShrink:0}}>{s.name?.charAt(0)}</div>}
                  <div><div style={{fontSize:'0.875rem',fontWeight:600,color:'var(--text-primary)'}}>{s.name}</div><div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{s.email}</div></div>
                </div>
              </td>
              <td style={{padding:'10px 16px',fontSize:'0.825rem',color:'var(--text-secondary)'}}>Sem {s.semester}</td>
              <td style={{padding:'10px 16px',fontSize:'0.825rem',color:'var(--text-secondary)'}}>{s.phone||'—'}</td>
              <td style={{padding:'10px 16px',fontSize:'0.825rem',color:'var(--text-secondary)'}}>{s.enrollmentNo||'—'}</td>
              <td style={{padding:'10px 16px'}}><button onClick={()=>onView(s)} style={{padding:'5px 12px',background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:'var(--radius-sm)',color:'var(--accent)',fontSize:'0.75rem',fontFamily:'var(--font-body)',cursor:'pointer'}}>View</button></td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}