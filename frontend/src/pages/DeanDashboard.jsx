import React, { useState, useEffect } from 'react';import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { skillFacultyAPI, departmentAPI, courseAPI } from '../utils/api';
import styles from './DeanDashboard.module.css';

const BLANK_DEPT = { name: '', code: '', chairpersonName: '', chairpersonEmail: '' };
const TYPE_LABELS = { fulltime: 'Full Time', parttime: 'Part Time', online: 'Online', hybrid: 'Hybrid' };

export default function DeanDashboard() {
  const { user } = useAuth();
  const [faculty, setFaculty] = useState(null);
  const [requests, setRequests] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('departments');

  // Add dept
  const [showAddDept, setShowAddDept] = useState(false);
  const [deptForm, setDeptForm] = useState(BLANK_DEPT);
  const [deptLoading, setDeptLoading] = useState(false);

  // Edit dept
  const [editDeptModal, setEditDeptModal] = useState(null); // { dept, index }
  const [editDeptForm, setEditDeptForm] = useState(BLANK_DEPT);
  const [editDeptLoading, setEditDeptLoading] = useState(false);

  // View dept
  const [viewDept, setViewDept] = useState(null); // { dept, index }

  // Reject request
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const id = user?.skillFaculty?._id || user?.skillFaculty;
      const [facRes, reqRes, courseRes] = await Promise.all([
        id ? skillFacultyAPI.getById(id) : Promise.resolve(null),
        departmentAPI.getRequests(),
        courseAPI.getAll(),
      ]);
      if (facRes) setFaculty(facRes.data.faculty);
      setRequests(reqRes.data.requests || []);
      setCourses(courseRes.data.courses || []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  // Courses for a specific department
  const coursesForDept = (dept) => courses.filter(c =>
    c.departmentCode === dept.code || c.departmentName === dept.name
  );

  // ── Add dept ──────────────────────────────────────────────────────
  const handleAddDept = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim()) return;
    setDeptLoading(true);
    try {
      await departmentAPI.addDirect(deptForm);
      toast.success(`"${deptForm.name}" added!`);
      setDeptForm(BLANK_DEPT); setShowAddDept(false); fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setDeptLoading(false); }
  };

  // ── Edit dept ─────────────────────────────────────────────────────
  const openEditDept = (dept, index) => {
    setEditDeptModal({ dept, index });
    setEditDeptForm({ name: dept.name, code: dept.code || '', chairpersonName: dept.chairpersonName || '', chairpersonEmail: dept.chairpersonEmail || '' });
  };

  const handleEditDept = async (e) => {
    e.preventDefault();
    setEditDeptLoading(true);
    try {
      await departmentAPI.editDirect(faculty._id, editDeptModal.index, editDeptForm);
      toast.success('Department updated!');
      setEditDeptModal(null); fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setEditDeptLoading(false); }
  };

  // ── Delete dept ───────────────────────────────────────────────────
  const handleDeleteDept = async (idx, name) => {
    if (!window.confirm(`Remove department "${name}"? Courses inside it will remain.`)) return;
    try {
      await departmentAPI.deleteDept(faculty._id, idx);
      toast.success(`"${name}" removed`); fetchAll();
    } catch { toast.error('Failed to remove'); }
  };

  // ── Approve/reject requests ───────────────────────────────────────
  const handleApprove = async (id, name) => {
    try { await departmentAPI.approve(id); toast.success(`"${name}" approved!`); fetchAll(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  const handleReject = async () => {
    try { await departmentAPI.reject(rejectModal._id, rejectReason); toast.success('Rejected'); setRejectModal(null); setRejectReason(''); fetchAll(); }
    catch { toast.error('Failed'); }
  };

  const statusColor = { pending: 'orange', approved: 'green', rejected: 'red' };

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {user?.avatar ? <img src={user.avatar} alt="" className={styles.avatar} /> : <div className={styles.avatarFallback}>{user?.name?.charAt(0)}</div>}
            <div>
              <p className={styles.greeting}>Dean Dashboard</p>
              <h1 className={styles.title}>{user?.name}</h1>
              {faculty && <p className={styles.facultyTag}>{faculty.code} — {faculty.name}</p>}
            </div>
          </div>
          <button className={styles.addBtn} onClick={() => setShowAddDept(true)}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="15"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
            Add Department
          </button>
        </div>

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}><div className={styles.statVal}>{faculty?.departments?.length || 0}</div><div className={styles.statLabel}>Departments</div></div>
          <div className={`${styles.statCard} ${pendingCount > 0 ? styles.statHighlight : ''}`}><div className={styles.statVal}>{pendingCount}</div><div className={styles.statLabel}>Pending Requests</div></div>
          <div className={styles.statCard}><div className={styles.statVal}>{courses.length}</div><div className={styles.statLabel}>Courses</div></div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab==='departments'?styles.tabActive:''}`} onClick={() => setActiveTab('departments')}>Departments ({faculty?.departments?.length||0})</button>
          <button className={`${styles.tab} ${activeTab==='requests'?styles.tabActive:''}`} onClick={() => setActiveTab('requests')}>
            Requests {pendingCount>0 && <span className={styles.badge}>{pendingCount}</span>}
          </button>
          <button className={`${styles.tab} ${activeTab==='courses'?styles.tabActive:''}`} onClick={() => setActiveTab('courses')}>Courses ({courses.length})</button>
          <button className={`${styles.tab} ${activeTab==='info'?styles.tabActive:''}`} onClick={() => setActiveTab('info')}>Faculty Info</button>
        </div>

        {loading ? (
          <div className={styles.loading}><span className="spinner" style={{width:28,height:28}}/><span>Loading...</span></div>
        ) : (<>

          {/* ── DEPARTMENTS TAB ── */}
          {activeTab === 'departments' && (
            <div className={styles.tabContent}>
              {!faculty?.departments?.length ? (
                <div className={styles.empty}><div className={styles.emptyIcon}>◫</div><h3>No Departments Yet</h3><p>Add your first department above.</p></div>
              ) : (
                <div className={styles.deptGrid}>
                  {faculty.departments.map((dept, i) => {
                    const deptCourses = coursesForDept(dept);
                    return (
                      <div key={i} className={styles.deptCard}>
                        <div className={styles.deptCardTop}>
                          <div className={styles.deptMeta}>
                            {dept.code && <span className={styles.deptCode}>{dept.code}</span>}
                            <span className={styles.deptName}>{dept.name}</span>
                          </div>
                          <div className={styles.deptActions}>
                            <button className={styles.viewDeptBtn} onClick={() => setViewDept({ dept, index: i })} title="View details">
                              <svg viewBox="0 0 20 20" fill="currentColor" width="13"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
                            </button>
                            <button className={styles.editDeptBtn} onClick={() => openEditDept(dept, i)} title="Edit">
                              <svg viewBox="0 0 20 20" fill="currentColor" width="13"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                            </button>
                            <button className={styles.removeDeptBtn} onClick={() => handleDeleteDept(i, dept.name)} title="Delete">
                              <svg viewBox="0 0 20 20" fill="currentColor" width="13"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                            </button>
                          </div>
                        </div>
                        {(dept.chairpersonName || dept.chairpersonEmail) && (
                          <div className={styles.chairRow}>
                            <svg viewBox="0 0 20 20" fill="currentColor" width="12"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                            <div><span className={styles.chairName}>{dept.chairpersonName}</span>{dept.chairpersonEmail && <span className={styles.chairEmail}> · {dept.chairpersonEmail}</span>}</div>
                          </div>
                        )}
                        <div className={styles.deptFooter}>
                          <span className={styles.deptStat}>{deptCourses.length} course{deptCourses.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── REQUESTS TAB ── */}
          {activeTab === 'requests' && (
            <div className={styles.tabContent}>
              {!requests.length ? (
                <div className={styles.empty}><div className={styles.emptyIcon}>📬</div><h3>No Requests</h3><p>Department requests from Super Admin appear here.</p></div>
              ) : (
                <div className={styles.requestsList}>
                  {requests.map(req => (
                    <div key={req._id} className={`${styles.requestCard} ${styles[statusColor[req.status]]}`}>
                      <div className={styles.requestTop}>
                        <div>
                          <div className={styles.requestDeptName}>
                            {req.isEdit && <span className={styles.editTag}>EDIT REQUEST</span>}
                            {req.department.name}
                          </div>
                          {req.department.code && <span className={styles.requestCode}>{req.department.code}</span>}
                        </div>
                        <span className={`${styles.statusPill} ${styles[req.status]}`}>{req.status}</span>
                      </div>
                      {(req.department.chairpersonName || req.department.chairpersonEmail) && (
                        <div className={styles.requestChair}>
                          <svg viewBox="0 0 20 20" fill="currentColor" width="12"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                          <span>{req.department.chairpersonName}</span>
                          {req.department.chairpersonEmail && <span className={styles.chairEmail}> · {req.department.chairpersonEmail}</span>}
                        </div>
                      )}
                      <div className={styles.requestMeta}>
                        <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                      {req.status === 'rejected' && req.rejectionReason && <div className={styles.rejectionNote}>Reason: {req.rejectionReason}</div>}
                      {req.status === 'pending' && (
                        <div className={styles.requestActions}>
                          <button className={styles.approveBtn} onClick={() => handleApprove(req._id, req.department.name)}>✓ Approve</button>
                          <button className={styles.rejectBtn} onClick={() => { setRejectModal(req); setRejectReason(''); }}>✕ Reject</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── COURSES TAB (read-only, filtered by dept) ── */}
          {activeTab === 'courses' && (
            <DeanCoursesTab courses={courses} faculty={faculty} />
          )}

          {/* ── FACULTY INFO TAB ── */}
          {activeTab === 'info' && faculty && (
            <div className={styles.tabContent}>
              <div className={styles.infoCard}>
                <div className={styles.infoCardBadge}>{faculty.code}</div>
                <h2 className={styles.infoCardTitle}>{faculty.name}</h2>
                {faculty.description && <p className={styles.infoCardDesc}>{faculty.description}</p>}
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}><span className={styles.infoLabel}>Status</span><span className={faculty.isActive ? styles.active : styles.inactive}>{faculty.isActive ? '● Active' : '● Inactive'}</span></div>
                  <div className={styles.infoItem}><span className={styles.infoLabel}>Departments</span><span className={styles.infoValue}>{faculty.departments?.length || 0}</span></div>
                  <div className={styles.infoItem}><span className={styles.infoLabel}>Courses</span><span className={styles.infoValue}>{courses.length}</span></div>
                </div>
              </div>
            </div>
          )}
        </>)}
      </main>

      {/* ── Add Dept Panel ── */}
      {showAddDept && (
        <div className={styles.panelOverlay} onClick={e => e.target===e.currentTarget && setShowAddDept(false)}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}><h3>Add Department</h3><button className={styles.panelClose} onClick={() => setShowAddDept(false)}>✕</button></div>
            <form onSubmit={handleAddDept} className={styles.panelForm}>
              <div className={styles.panelNotice}>Adding directly to <strong>{faculty?.name}</strong>. No approval required.</div>
              <div className={styles.formRow}>
                <div className={styles.field}><label className={styles.label}>Department Name *</label><input className={styles.input} value={deptForm.name} onChange={e => setDeptForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Computer Science" required /></div>
                <div className={styles.field}><label className={styles.label}>Code</label><input className={styles.input} value={deptForm.code} onChange={e => setDeptForm(f=>({...f,code:e.target.value}))} placeholder="e.g. CSE" /></div>
              </div>
              <div className={styles.formSectionTitle}><span className={styles.dot} style={{background:'var(--gold)'}}/> Chairperson</div>
              <div className={styles.deptNotice}><svg viewBox="0 0 20 20" fill="currentColor" width="12"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>Chairperson will be auto-registered for Google login.</div>
              <div className={styles.formRow}>
                <div className={styles.field}><label className={styles.label}>Chairperson Name</label><input className={styles.input} value={deptForm.chairpersonName} onChange={e => setDeptForm(f=>({...f,chairpersonName:e.target.value}))} placeholder="Prof. Full Name" /></div>
                <div className={styles.field}><label className={styles.label}>Chairperson Email</label><input className={styles.input} type="email" value={deptForm.chairpersonEmail} onChange={e => setDeptForm(f=>({...f,chairpersonEmail:e.target.value}))} placeholder="chair@institution.edu" /></div>
              </div>
              <div className={styles.panelActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowAddDept(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={deptLoading}>{deptLoading ? <><span className="spinner" style={{width:14,height:14}}/> Adding...</> : '+ Add Department'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Dept Panel ── */}
      {editDeptModal && (
        <div className={styles.panelOverlay} onClick={e => e.target===e.currentTarget && setEditDeptModal(null)}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}><h3>Edit Department</h3><button className={styles.panelClose} onClick={() => setEditDeptModal(null)}>✕</button></div>
            <form onSubmit={handleEditDept} className={styles.panelForm}>
              <div className={styles.panelNotice} style={{borderColor:'rgba(245,158,11,0.3)',background:'rgba(245,158,11,0.06)'}}>
                ✏️ You can update name, code, or chairperson. Courses inside this department are <strong>not affected</strong>.
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}><label className={styles.label}>Department Name *</label><input className={styles.input} value={editDeptForm.name} onChange={e => setEditDeptForm(f=>({...f,name:e.target.value}))} required /></div>
                <div className={styles.field}><label className={styles.label}>Code</label><input className={styles.input} value={editDeptForm.code} onChange={e => setEditDeptForm(f=>({...f,code:e.target.value}))} /></div>
              </div>
              <div className={styles.formSectionTitle}><span className={styles.dot} style={{background:'var(--gold)'}}/> Chairperson</div>
              <div className={styles.deptNotice}><svg viewBox="0 0 20 20" fill="currentColor" width="12"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>Changing email creates a new chairperson account.</div>
              <div className={styles.formRow}>
                <div className={styles.field}><label className={styles.label}>Chairperson Name</label><input className={styles.input} value={editDeptForm.chairpersonName} onChange={e => setEditDeptForm(f=>({...f,chairpersonName:e.target.value}))} placeholder="Prof. Full Name" /></div>
                <div className={styles.field}><label className={styles.label}>Chairperson Email</label><input className={styles.input} type="email" value={editDeptForm.chairpersonEmail} onChange={e => setEditDeptForm(f=>({...f,chairpersonEmail:e.target.value}))} placeholder="chair@institution.edu" /></div>
              </div>
              <div className={styles.panelActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setEditDeptModal(null)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={editDeptLoading} style={{background:'var(--gold)',color:'#000'}}>{editDeptLoading ? <><span className="spinner" style={{width:14,height:14}}/> Saving...</> : '✓ Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Dept Modal ── */}
      {viewDept && (
        <div className={styles.panelOverlay} onClick={e => e.target===e.currentTarget && setViewDept(null)}>
          <div className={styles.viewModal}>
            <div className={styles.viewModalHeader}>
              <div>
                {viewDept.dept.code && <span className={styles.deptCode}>{viewDept.dept.code}</span>}
                <h2 className={styles.viewModalTitle}>{viewDept.dept.name}</h2>
              </div>
              <button className={styles.panelClose} onClick={() => setViewDept(null)}>✕</button>
            </div>
            {(viewDept.dept.chairpersonName || viewDept.dept.chairpersonEmail) && (
              <div className={styles.viewChairRow}>
                <div className={styles.viewChairAvatar}>{(viewDept.dept.chairpersonName||'C').charAt(0)}</div>
                <div>
                  <div className={styles.viewChairName}>{viewDept.dept.chairpersonName}</div>
                  <div className={styles.viewChairEmail}>{viewDept.dept.chairpersonEmail}</div>
                  <div className={styles.viewChairRole}>Chairperson</div>
                </div>
              </div>
            )}
            <div className={styles.viewCoursesSection}>
              <div className={styles.viewSectionTitle}>Courses ({coursesForDept(viewDept.dept).length})</div>
              {coursesForDept(viewDept.dept).length === 0 ? (
                <div className={styles.viewEmpty}>No courses added yet for this department.</div>
              ) : coursesForDept(viewDept.dept).map(c => (
                <div key={c._id} className={styles.viewCourseCard}>
                  <div className={styles.viewCourseTop}>
                    {c.code && <span className={styles.courseCode}>{c.code}</span>}
                    <span className={styles.viewCourseName}>{c.name}</span>
                  </div>
                  <div className={styles.viewCourseStats}>
                    <span>⏱ {c.duration?.label}</span>
                    <span>🔄 {c.totalBatches} batches</span>
                    <span>💺 {c.totalSeats || 0} seats</span>
                    <span>📅 {c.currentBatch || '—'}</span>
                  </div>
                  {c.coordinators?.length > 0 && (
                    <div className={styles.viewCoordList}>
                      {c.coordinators.map((co, i) => (
                        <div key={i} className={styles.viewCoordItem}>
                          <div className={styles.viewCoordAvatar}>{(co.name||'C').charAt(0)}</div>
                          <div><div className={styles.viewCoordName}>{co.name}</div><div className={styles.viewCoordSub}>{co.subject || co.email}</div></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{padding:'0 24px 24px',display:'flex',justifyContent:'flex-end',gap:10}}>
              <button className={styles.cancelBtn} onClick={() => setViewDept(null)}>Close</button>
              <button className={styles.submitBtn} style={{background:'var(--gold)',color:'#000'}} onClick={() => { openEditDept(viewDept.dept, viewDept.index); setViewDept(null); }}>✏️ Edit This Dept</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <div className={styles.panelOverlay} onClick={e => e.target===e.currentTarget && setRejectModal(null)}>
          <div className={styles.rejectBox}>
            <h3 className={styles.rejectTitle}>Reject Request</h3>
            <p className={styles.rejectSub}>Rejecting: <strong>{rejectModal.department.name}</strong></p>
            <textarea className={styles.rejectInput} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Optional: reason..." rows={3} />
            <div className={styles.rejectActions}>
              <button className={styles.cancelBtn} onClick={() => setRejectModal(null)}>Cancel</button>
              <button className={styles.dangerBtn} onClick={handleReject}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dean Courses Tab — department pill buttons + filtered course cards ────────
function DeanCoursesTab({ courses, faculty }) {
  const [activeDept, setActiveDept] = React.useState('all');
  const TYPE_LABELS = { fulltime:'Full Time', parttime:'Part Time', online:'Online', hybrid:'Hybrid' };

  // Build department list from faculty + courses
  const depts = React.useMemo(() => {
    const fromFaculty = (faculty?.departments || []).map(d => ({ name: d.name, code: d.code || d.name }));
    const fromCourses = courses
      .filter(c => c.departmentName || c.departmentCode)
      .map(c => ({ name: c.departmentName || c.departmentCode, code: c.departmentCode || c.departmentName }));
    const all = [...fromFaculty, ...fromCourses];
    const seen = new Set();
    return all.filter(d => { if (seen.has(d.code)) return false; seen.add(d.code); return true; });
  }, [faculty, courses]);

  const filtered = activeDept === 'all'
    ? courses
    : courses.filter(c => c.departmentCode === activeDept || c.departmentName === activeDept);

  return (
    <div>
      {/* Read-only banner */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.15)',borderRadius:'var(--radius-sm)',marginBottom:16,fontSize:'0.78rem',color:'var(--text-muted)'}}>
        <svg viewBox="0 0 20 20" fill="currentColor" width="13"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
        View only — courses are managed by Chairpersons
      </div>

      {/* Department pill buttons */}
      {depts.length > 0 && (
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
          <button
            onClick={() => setActiveDept('all')}
            style={{
              padding:'6px 16px', borderRadius:20, border:'1px solid', cursor:'pointer',
              fontSize:'0.8rem', fontWeight:700, fontFamily:'var(--font-body)', transition:'all 0.15s',
              background: activeDept==='all' ? 'var(--accent)' : 'var(--bg-secondary)',
              color: activeDept==='all' ? 'white' : 'var(--text-muted)',
              borderColor: activeDept==='all' ? 'var(--accent)' : 'var(--border)',
            }}
          >
            All Courses ({courses.length})
          </button>
          {depts.map(d => {
            const count = courses.filter(c => c.departmentCode===d.code || c.departmentName===d.name).length;
            const isActive = activeDept === d.code;
            return (
              <button key={d.code} onClick={() => setActiveDept(d.code)}
                style={{
                  padding:'6px 16px', borderRadius:20, border:'1px solid', cursor:'pointer',
                  fontSize:'0.8rem', fontWeight:700, fontFamily:'var(--font-body)', transition:'all 0.15s',
                  background: isActive ? 'var(--gold)' : 'var(--bg-secondary)',
                  color: isActive ? '#000' : 'var(--text-muted)',
                  borderColor: isActive ? 'var(--gold)' : 'var(--border)',
                }}
              >
                {d.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Course cards */}
      {!filtered.length ? (
        <div style={{textAlign:'center',padding:'48px 0',color:'var(--text-muted)',fontSize:'0.875rem'}}>
          {activeDept === 'all' ? 'No courses yet.' : 'No courses in this department yet.'}
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
          {filtered.map(course => (
            <div key={course._id} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'16px 18px',display:'flex',flexDirection:'column',gap:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                {course.code && <span style={{fontSize:'0.65rem',fontWeight:800,letterSpacing:'0.1em',color:'var(--success)',background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.2)',padding:'2px 8px',borderRadius:4}}>{course.code}</span>}
                <span style={{fontSize:'0.65rem',fontWeight:700,textTransform:'uppercase',color:'#a78bfa',background:'rgba(139,92,246,0.1)',border:'1px solid rgba(139,92,246,0.2)',padding:'2px 8px',borderRadius:4}}>{TYPE_LABELS[course.type]||course.type}</span>
              </div>
              <div style={{fontFamily:'var(--font-display)',fontSize:'0.95rem',fontWeight:700,color:'var(--text-primary)'}}>{course.name}</div>
              {course.departmentName && <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Dept: {course.departmentName}</div>}
              <div style={{display:'flex',gap:14,flexWrap:'wrap',fontSize:'0.75rem',color:'var(--text-muted)'}}>
                <span>⏱ {course.duration?.label}</span>
                <span>🔄 {course.totalBatches} batches</span>
                <span>💺 {course.totalSeats||'—'} seats</span>
                {course.currentBatch && <span>📅 {course.currentBatch}</span>}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.75rem',color:'var(--text-muted)',paddingTop:8,borderTop:'1px solid var(--border)'}}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="11"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                <strong style={{color:'var(--text-secondary)'}}>{course.chairperson?.name||'—'}</strong>
                {course.coordinators?.length>0 && <span style={{marginLeft:'auto'}}>👥 {course.coordinators.length} coord.</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
