import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import FacultyModal from '../components/FacultyModal';
import { skillFacultyAPI, usersAPI, departmentAPI, courseAPI, placementOfficerAPI } from '../utils/api';
import styles from './AdminDashboard.module.css';

const BLANK_DEPT_EDIT = { name:'', code:'', chairpersonName:'', chairpersonEmail:'' };

export default function AdminDashboard() {
  const { user } = useAuth();
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({ totalFaculties:0, activeFaculties:0, totalDeans:0, activeDeans:0 });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('faculties');

  // Dept view/edit
  const [viewDeptModal, setViewDeptModal] = useState(null);
  const [editDeptModal, setEditDeptModal] = useState(null);
  const [editDeptForm, setEditDeptForm] = useState(BLANK_DEPT_EDIT);
  const [editDeptLoading, setEditDeptLoading] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState(null);
  const [requestHistory, setRequestHistory] = useState([]);

  // Placement Officers state
  const [officers, setOfficers] = useState([]);
  const [showPOForm, setShowPOForm] = useState(false);
  const [poForm, setPoForm] = useState({ name:'', email:'', skillFacultyId:'' });
  const [poLoading, setPoLoading] = useState(false);
  const [deletePoConfirm, setDeletePoConfirm] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [facRes, statsRes, courseRes, histRes, poRes] = await Promise.all([
        skillFacultyAPI.getAll(),
        usersAPI.getStats(),
        courseAPI.getAll(),
        departmentAPI.getAdminHistory().catch(() => ({ data: { requests: [] } })),
        placementOfficerAPI.getAll().catch(() => ({ data: { officers: [] } })),
      ]);
      setFaculties(facRes.data.faculties);
      setStats(statsRes.data.stats);
      setCourses(courseRes.data.courses || []);
      setRequestHistory(histRes.data.requests || []);
      setOfficers(poRes.data.officers || []);
      if (facRes.data.faculties?.length && !selectedFacultyId) {
        setSelectedFacultyId(facRes.data.faculties[0]._id);
      }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  // ── PO Handlers ──────────────────────────────────────────────
  const handleAddPO = async (e) => {
    e.preventDefault();
    setPoLoading(true);
    try {
      await placementOfficerAPI.create({
        name: poForm.name,
        email: poForm.email,
        skillFacultyId: poForm.skillFacultyId || null,
      });
      toast.success(`${poForm.name} added as Placement Officer!`);
      setShowPOForm(false);
      setPoForm({ name:'', email:'', skillFacultyId:'' });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setPoLoading(false); }
  };

  const handleDeletePO = async (id, name) => {
    try {
      await placementOfficerAPI.delete(id);
      toast.success(`${name} removed`);
      setDeletePoConfirm(null);
      fetchData();
    } catch { toast.error('Delete failed'); }
  };

  const coursesForDept = (dept) => courses.filter(c =>
    c.departmentCode === dept.code || c.departmentName === dept.name
  );

  const handleOpenCreate = () => { setEditData(null); setModalOpen(true); };
  const handleEdit = (faculty) => { setEditData(faculty); setModalOpen(true); };

  const handleSubmit = async (formData) => {
    setSubmitLoading(true);
    try {
      if (editData) { await skillFacultyAPI.update(editData._id, formData); toast.success('Updated!'); }
      else { await skillFacultyAPI.create(formData); toast.success('Faculty created!'); }
      setModalOpen(false); fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitLoading(false); }
  };

  const handleDelete = async (id) => {
    try { await skillFacultyAPI.delete(id); toast.success('Removed'); setDeleteConfirm(null); fetchData(); }
    catch { toast.error('Delete failed'); }
  };

  // Open dept edit modal — prefill form
  const openDeptEdit = (faculty, dept, index) => {
    setEditDeptModal({ faculty, dept, index });
    setEditDeptForm({ name: dept.name, code: dept.code||'', chairpersonName: dept.chairpersonName||'', chairpersonEmail: dept.chairpersonEmail||'' });
  };

  // Send edit request to dean
  const handleDeptEditRequest = async (e) => {
    e.preventDefault();
    setEditDeptLoading(true);
    try {
      await departmentAPI.sendEditRequest({
        facultyId: editDeptModal.faculty._id,
        deptIndex: editDeptModal.index,
        ...editDeptForm,
      });
      toast.success(`Edit request sent to Dean of ${editDeptModal.faculty.name}!`);
      setEditDeptModal(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setEditDeptLoading(false); }
  };

  const STAT_CARDS = [
    { label:'Skill Faculties', value:stats.totalFaculties, icon:'⬡', color:'blue', sub:`${stats.activeFaculties} active` },
    { label:'Total Deans',     value:stats.totalDeans,     icon:'◆', color:'gold', sub:`${stats.activeDeans} active` },
    { label:'Total Courses',   value:courses.length,       icon:'◉', color:'green', sub:'across all faculties' },
    { label:'Placement Officers', value:officers.length,   icon:'🎯', color:'blue', sub:'managing placements' },
  ];

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Welcome back, <span className={styles.nameHighlight}>{user?.name?.split(' ')[0]}</span></h1>
            <p className={styles.pageSubtitle}>Manage skill faculties, departments and dean accounts</p>
          </div>
          <button className={styles.primaryBtn} onClick={handleOpenCreate}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
            Add Skill Faculty
          </button>
        </div>

        {/* Stats */}
        <div className={styles.statsRow}>
          {STAT_CARDS.map(s => (
            <div key={s.label} className={`${styles.statCard} ${styles[s.color]}`}>
              <div className={styles.statIcon}>{s.icon}</div>
              <div>
                <div className={styles.statValue}>{loading ? '—' : s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
                <div className={styles.statSub}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab==='faculties'?styles.tabActive:''}`} onClick={() => setActiveTab('faculties')}>Skill Faculties ({faculties.length})</button>
          <button className={`${styles.tab} ${activeTab==='departments'?styles.tabActive:''}`} onClick={() => setActiveTab('departments')}>All Departments</button>
          <button className={`${styles.tab} ${activeTab==='officers'?styles.tabActive:''}`} onClick={() => setActiveTab('officers')}>Placement Officers ({officers.length})</button>
        </div>

        {loading ? (
          <div className={styles.loadingState}><span className="spinner" style={{width:28,height:28}}/><span>Loading...</span></div>
        ) : (<>

          {/* ── FACULTIES TAB ── */}
          {activeTab === 'faculties' && (
            faculties.length === 0 ? (
              <div className={styles.emptyState}><div className={styles.emptyIcon}>⬡</div><h3>No Skill Faculties Yet</h3><p>Create your first faculty to get started.</p><button className={styles.primaryBtn} onClick={handleOpenCreate}>Create First Faculty</button></div>
            ) : (
              <div className={styles.grid}>
                {faculties.map((faculty, i) => (
                  <div key={faculty._id} className={styles.card} style={{animationDelay:`${i*0.06}s`}}>
                    <div className={styles.cardTop}>
                      <div className={styles.facultyCode}>{faculty.code}</div>
                      <div className={`${styles.statusBadge} ${faculty.isActive?styles.active:styles.inactive}`}>{faculty.isActive?'Active':'Inactive'}</div>
                    </div>
                    <h3 className={styles.facultyName}>{faculty.name}</h3>
                    {faculty.description && <p className={styles.facultyDesc}>{faculty.description}</p>}
                    <div className={styles.deanBox}>
                      <div className={styles.deanLabel}><svg viewBox="0 0 20 20" fill="currentColor" width="12"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>Dean</div>
                      <div className={styles.deanName}>{faculty.deanName || 'Not assigned'}</div>
                      {faculty.deanEmail && <div className={styles.deanEmail}>{faculty.deanEmail}</div>}
                    </div>
                    {faculty.departments?.length > 0 && (
                      <div className={styles.deptRow}>
                        {faculty.departments.slice(0,3).map((d,i) => <span key={i} className={styles.deptBadge}>{d.code||d.name}</span>)}
                        {faculty.departments.length > 3 && <span className={styles.deptMore}>+{faculty.departments.length-3}</span>}
                      </div>
                    )}
                    <div className={styles.cardActions}>
                      <button className={styles.editBtn} onClick={() => handleEdit(faculty)}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="13"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>Edit
                      </button>
                      <button className={styles.deleteBtn} onClick={() => setDeleteConfirm(faculty)}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="13"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── DEPARTMENTS TAB ── */}
          {activeTab === 'departments' && (
            <div>
              {faculties.length === 0 ? (
                <div className={styles.emptyState}><div className={styles.emptyIcon}>◫</div><h3>No Faculties Yet</h3><p>Create a skill faculty first to manage departments.</p></div>
              ) : (<>
                {/* Faculty selector boxes */}
                <div className={styles.facultyBoxRow}>
                  {faculties.map(f => (
                    <button
                      key={f._id}
                      className={`${styles.facultyBox} ${selectedFacultyId===f._id ? styles.facultyBoxActive : ''}`}
                      onClick={() => setSelectedFacultyId(f._id)}
                    >
                      <span className={styles.facultyBoxCode}>{f.code}</span>
                      <span className={styles.facultyBoxName}>{f.name}</span>
                      <span className={styles.facultyBoxCount}>{f.departments?.length||0} dept{f.departments?.length!==1?'s':''}</span>
                    </button>
                  ))}
                </div>

                {/* Selected faculty departments */}
                {(() => {
                  const selFac = faculties.find(f => f._id === selectedFacultyId);
                  if (!selFac) return null;
                  return (
                    <div className={styles.selectedFacSection}>
                      <div className={styles.selectedFacHeader}>
                        <div>
                          <span className={styles.selectedFacCode}>{selFac.code}</span>
                          <span className={styles.selectedFacName}>{selFac.name}</span>
                        </div>
                        <span className={styles.deptCountBadge}>{selFac.departments?.length||0} departments</span>
                      </div>
                      {!selFac.departments?.length ? (
                        <div className={styles.emptyState} style={{padding:'30px',border:'none'}}><p style={{margin:0}}>No departments in this faculty yet. Ask the Dean to add them.</p></div>
                      ) : (
                        <div className={styles.deptCards}>
                          {selFac.departments.map((dept, idx) => {
                            const deptCourses = coursesForDept(dept);
                            return (
                              <div key={idx} className={styles.deptCard}>
                                <div className={styles.deptCardTop}>
                                  <div className={styles.deptMeta}>
                                    {dept.code && <span className={styles.deptCode}>{dept.code}</span>}
                                    <span className={styles.deptName}>{dept.name}</span>
                                  </div>
                                  <div className={styles.deptCardActions}>
                                    <button className={styles.viewDeptBtn} onClick={() => setViewDeptModal({ faculty:selFac, dept, index:idx })} title="View">
                                      <svg viewBox="0 0 20 20" fill="currentColor" width="13"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
                                    </button>
                                    <button className={styles.editDeptBtn} onClick={() => openDeptEdit(selFac, dept, idx)} title="Request edit">
                                      <svg viewBox="0 0 20 20" fill="currentColor" width="13"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                                    </button>
                                  </div>
                                </div>
                                {(dept.chairpersonName||dept.chairpersonEmail) && (
                                  <div className={styles.chairRow}>
                                    <svg viewBox="0 0 20 20" fill="currentColor" width="11"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                                    <span className={styles.chairName}>{dept.chairpersonName}</span>
                                    {dept.chairpersonEmail && <span className={styles.chairEmail}> · {dept.chairpersonEmail}</span>}
                                  </div>
                                )}
                                <div className={styles.deptFooter}>
                                  <span className={styles.deptStat}>{deptCourses.length} course{deptCourses.length!==1?'s':''}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Request history for this faculty */}
                      {(() => {
                        const facHistory = requestHistory.filter(r => (r.skillFaculty?._id||r.skillFaculty) === selFac._id);
                        if (!facHistory.length) return null;
                        return (
                          <div className={styles.reqHistorySection}>
                            <div className={styles.reqHistoryTitle}>Edit Request History</div>
                            {facHistory.map(req => (
                              <div key={req._id} className={`${styles.reqHistoryRow} ${styles[req.status]}`}>
                                <div className={styles.reqHistoryLeft}>
                                  <div className={styles.reqHistoryDept}>
                                    {req.isEdit && <span className={styles.editTag}>EDIT</span>}
                                    {req.department?.name}
                                    {req.department?.code && <span className={styles.reqCode}> ({req.department.code})</span>}
                                  </div>
                                  {req.department?.chairpersonName && <div className={styles.reqChair}>Chair: {req.department.chairpersonName} · {req.department.chairpersonEmail}</div>}
                                  <div className={styles.reqDate}>{new Date(req.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
                                </div>
                                <div className={styles.reqHistoryRight}>
                                  <span className={`${styles.reqStatusPill} ${styles[req.status]}`}>{req.status}</span>
                                  {req.status==='rejected' && req.rejectionReason && (
                                    <div className={styles.reqRejectionReason}>Dean said: "{req.rejectionReason}"</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </>)}
            </div>
          )}
          {/* ── PLACEMENT OFFICERS TAB ── */}
          {activeTab === 'officers' && (
            <div>
              <div className={styles.poTabHeader}>
                <div>
                  <h3 className={styles.poTabTitle}>Placement Officers</h3>
                  <p className={styles.poTabSub}>Placement Officers manage job postings, drives and student placement. They login via Google at /admin.</p>
                </div>
                <button className={styles.primaryBtn} onClick={() => setShowPOForm(true)}>+ Add Placement Officer</button>
              </div>

              {!officers.length ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🎯</div>
                  <h3>No Placement Officers Yet</h3>
                  <p>Add a Placement Officer by entering their name, email and faculty. They can login with Google at /admin.</p>
                  <button className={styles.primaryBtn} onClick={() => setShowPOForm(true)}>Add First Officer</button>
                </div>
              ) : (
                <div className={styles.poGrid}>
                  {officers.map(po => (
                    <div key={po._id} className={styles.poCard}>
                      <div className={styles.poCardTop}>
                        <div className={styles.poAvatar}>
                          {po.avatar ? <img src={po.avatar} alt="" className={styles.poAvatarImg}/> : <span>{po.name?.charAt(0)}</span>}
                        </div>
                        <div className={styles.poInfo}>
                          <div className={styles.poName}>{po.name}</div>
                          <div className={styles.poEmail}>{po.email}</div>
                          {po.skillFaculty && <div className={styles.poFaculty}>{po.skillFaculty.code} — {po.skillFaculty.name}</div>}
                        </div>
                        <button className={styles.deleteBtn} onClick={() => setDeletePoConfirm(po)} title="Remove">
                          <svg viewBox="0 0 20 20" fill="currentColor" width="13"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                        </button>
                      </div>
                      <div className={styles.poBadge}>
                        {po.googleId
                          ? <span className={styles.poLoggedIn}>✓ Logged in before</span>
                          : <span className={styles.poNotLoggedIn}>⏳ Never logged in</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </>)}
      </main>

      {/* Faculty Modal */}
      <FacultyModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit} editData={editData} loading={submitLoading}/>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className={styles.confirmOverlay} onClick={() => setDeleteConfirm(null)}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmIcon}>⚠</div>
            <h3 className={styles.confirmTitle}>Delete Skill Faculty?</h3>
            <p className={styles.confirmMsg}>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This will also remove dean access for <strong>{deleteConfirm.deanEmail}</strong>.</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className={styles.dangerBtn} onClick={() => handleDelete(deleteConfirm._id)}>Delete Faculty</button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Dept Modal ── */}
      {viewDeptModal && (
        <div className={styles.confirmOverlay} onClick={e => e.target===e.currentTarget && setViewDeptModal(null)}>
          <div className={styles.viewModal}>
            <div className={styles.viewModalHeader}>
              <div>
                {viewDeptModal.dept.code && <span className={styles.deptCode}>{viewDeptModal.dept.code}</span>}
                <h2 className={styles.viewModalTitle}>{viewDeptModal.dept.name}</h2>
                <div className={styles.viewModalFaculty}>Faculty: {viewDeptModal.faculty.name}</div>
              </div>
              <button className={styles.closeXBtn} onClick={() => setViewDeptModal(null)}>✕</button>
            </div>
            {(viewDeptModal.dept.chairpersonName || viewDeptModal.dept.chairpersonEmail) && (
              <div className={styles.viewChairRow}>
                <div className={styles.viewChairAvatar}>{(viewDeptModal.dept.chairpersonName||'C').charAt(0)}</div>
                <div>
                  <div className={styles.viewChairName}>{viewDeptModal.dept.chairpersonName}</div>
                  <div className={styles.viewChairEmail}>{viewDeptModal.dept.chairpersonEmail}</div>
                  <div className={styles.viewChairRole}>Chairperson</div>
                </div>
              </div>
            )}
            <div className={styles.viewCoursesSection}>
              <div className={styles.viewSectionTitle}>Courses ({coursesForDept(viewDeptModal.dept).length})</div>
              {coursesForDept(viewDeptModal.dept).length === 0
                ? <div className={styles.viewEmpty}>No courses in this department yet.</div>
                : coursesForDept(viewDeptModal.dept).map(c => (
                  <div key={c._id} className={styles.viewCourseCard}>
                    <div className={styles.viewCourseTop}>
                      {c.code && <span className={styles.deptCode}>{c.code}</span>}
                      <span className={styles.viewCourseName}>{c.name}</span>
                    </div>
                    <div className={styles.viewCourseStats}>
                      <span>⏱ {c.duration?.label}</span>
                      <span>🔄 {c.totalBatches} batches</span>
                      <span>💺 {c.totalSeats||0} seats</span>
                    </div>
                    {c.coordinators?.length > 0 && (
                      <div className={styles.viewCoordList}>
                        {c.coordinators.map((co,i) => (
                          <div key={i} className={styles.viewCoordItem}>
                            <div className={styles.viewCoordAvatar}>{(co.name||'C').charAt(0)}</div>
                            <div><div className={styles.viewCoordName}>{co.name}</div><div className={styles.viewCoordSub}>{co.subject||co.email}</div></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
            <div style={{padding:'0 24px 24px',display:'flex',justifyContent:'flex-end',gap:10}}>
              <button className={styles.cancelBtn} onClick={() => setViewDeptModal(null)}>Close</button>
              <button className={styles.editDeptSubmitBtn} onClick={() => { openDeptEdit(viewDeptModal.faculty, viewDeptModal.dept, viewDeptModal.index); setViewDeptModal(null); }}>✏️ Request Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Dept Modal (sends request to dean) ── */}
      {editDeptModal && (
        <div className={styles.confirmOverlay} onClick={e => e.target===e.currentTarget && setEditDeptModal(null)}>
          <div className={styles.confirmBox} style={{maxWidth:540}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h3 className={styles.confirmTitle} style={{margin:0}}>Request Department Edit</h3>
              <button className={styles.closeXBtn} onClick={() => setEditDeptModal(null)}>✕</button>
            </div>
            <div className={styles.editRequestNotice}>
              📤 This will send an <strong>edit request</strong> to the Dean of <strong>{editDeptModal.faculty.name}</strong>. The Dean must approve before changes take effect.
            </div>
            <form onSubmit={handleDeptEditRequest}>
              <div className={styles.editDeptGrid}>
                <div className={styles.editField}><label>Department Name</label><input className={styles.editInput} value={editDeptForm.name} onChange={e=>setEditDeptForm(f=>({...f,name:e.target.value}))}/></div>
                <div className={styles.editField}><label>Code</label><input className={styles.editInput} value={editDeptForm.code} onChange={e=>setEditDeptForm(f=>({...f,code:e.target.value}))}/></div>
                <div className={styles.editField}><label>Chairperson Name</label><input className={styles.editInput} value={editDeptForm.chairpersonName} onChange={e=>setEditDeptForm(f=>({...f,chairpersonName:e.target.value}))} placeholder="Prof. Full Name"/></div>
                <div className={styles.editField}><label>Chairperson Email</label><input className={styles.editInput} type="email" value={editDeptForm.chairpersonEmail} onChange={e=>setEditDeptForm(f=>({...f,chairpersonEmail:e.target.value}))} placeholder="chair@institution.edu"/></div>
              </div>
              <div className={styles.confirmActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setEditDeptModal(null)}>Cancel</button>
                <button type="submit" className={styles.editDeptSubmitBtn} disabled={editDeptLoading}>{editDeptLoading ? '...' : '📤 Send Edit Request to Dean'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Placement Officer Modal ── */}
      {showPOForm && (
        <div className={styles.confirmOverlay} onClick={e => e.target===e.currentTarget && setShowPOForm(false)}>
          <div className={styles.confirmBox} style={{maxWidth:480}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h3 className={styles.confirmTitle} style={{margin:0}}>Add Placement Officer</h3>
              <button className={styles.closeXBtn} onClick={() => setShowPOForm(false)}>✕</button>
            </div>
            <div className={styles.editRequestNotice}>
              🎯 Placement Officers manage job postings and drives. They will login with Google at <strong>/admin</strong>.
            </div>
            <form onSubmit={handleAddPO}>
              <div className={styles.editDeptGrid}>
                <div className={styles.editField}>
                  <label>Full Name *</label>
                  <input className={styles.editInput} value={poForm.name} onChange={e=>setPoForm(f=>({...f,name:e.target.value}))} placeholder="Prof. Full Name" required/>
                </div>
                <div className={styles.editField}>
                  <label>Google Email *</label>
                  <input className={styles.editInput} type="email" value={poForm.email} onChange={e=>setPoForm(f=>({...f,email:e.target.value}))} placeholder="officer@institution.edu" required/>
                </div>
              </div>
              <div className={styles.editField} style={{marginBottom:18}}>
                <label>Skill Faculty (optional)</label>
                <select className={styles.editInput} value={poForm.skillFacultyId} onChange={e=>setPoForm(f=>({...f,skillFacultyId:e.target.value}))}>
                  <option value="">— All Faculties —</option>
                  {faculties.map(f => <option key={f._id} value={f._id}>{f.code} — {f.name}</option>)}
                </select>
              </div>
              <div className={styles.confirmActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowPOForm(false)}>Cancel</button>
                <button type="submit" className={styles.editDeptSubmitBtn} disabled={poLoading} style={{background:'var(--gold)'}}>
                  {poLoading ? 'Adding...' : '🎯 Add Placement Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete PO Confirm ── */}
      {deletePoConfirm && (
        <div className={styles.confirmOverlay} onClick={() => setDeletePoConfirm(null)}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmIcon}>⚠</div>
            <h3 className={styles.confirmTitle}>Remove Placement Officer?</h3>
            <p className={styles.confirmMsg}>Remove <strong>{deletePoConfirm.name}</strong> ({deletePoConfirm.email})? They will lose access immediately.</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setDeletePoConfirm(null)}>Cancel</button>
              <button className={styles.dangerBtn} onClick={() => handleDeletePO(deletePoConfirm._id, deletePoConfirm.name)}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
