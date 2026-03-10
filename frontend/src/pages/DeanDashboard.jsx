import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { skillFacultyAPI, departmentAPI } from '../utils/api';
import styles from './DeanDashboard.module.css';

const BLANK_DEPT = { name: '', code: '', chairpersonName: '', chairpersonEmail: '' };

export default function DeanDashboard() {
  const { user } = useAuth();
  const [faculty, setFaculty] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('departments');
  const [showAddDept, setShowAddDept] = useState(false);
  const [deptForm, setDeptForm] = useState(BLANK_DEPT);
  const [deptLoading, setDeptLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const promises = [];
      if (user?.skillFaculty) {
        const id = user.skillFaculty._id || user.skillFaculty;
        promises.push(skillFacultyAPI.getById(id));
      }
      promises.push(departmentAPI.getRequests());
      const results = await Promise.all(promises);
      if (user?.skillFaculty) setFaculty(results[0].data.faculty);
      setRequests(results[user?.skillFaculty ? 1 : 0]?.data?.requests || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const handleAddDept = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim()) return;
    setDeptLoading(true);
    try {
      await departmentAPI.addDirect(deptForm);
      toast.success(`Department "${deptForm.name}" added!`);
      setDeptForm(BLANK_DEPT);
      setShowAddDept(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add department');
    } finally {
      setDeptLoading(false);
    }
  };

  const handleApprove = async (id, name) => {
    try {
      await departmentAPI.approve(id);
      toast.success(`"${name}" approved and added!`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    }
  };

  const handleReject = async () => {
    try {
      await departmentAPI.reject(rejectModal._id, rejectReason);
      toast.success('Request rejected');
      setRejectModal(null);
      setRejectReason('');
      fetchAll();
    } catch (err) {
      toast.error('Rejection failed');
    }
  };

  const handleDeleteDept = async (idx, name) => {
    if (!window.confirm(`Remove department "${name}"?`)) return;
    try {
      const facultyId = faculty._id;
      await departmentAPI.deleteDept(facultyId, idx);
      toast.success(`"${name}" removed`);
      fetchAll();
    } catch (err) {
      toast.error('Failed to remove department');
    }
  };

  const statusColor = { pending: 'orange', approved: 'green', rejected: 'red' };

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {user?.avatar
              ? <img src={user.avatar} alt="" className={styles.avatar} />
              : <div className={styles.avatarFallback}>{user?.name?.charAt(0)}</div>
            }
            <div>
              <p className={styles.greeting}>Dean Dashboard</p>
              <h1 className={styles.title}>{user?.name}</h1>
              {faculty && <p className={styles.facultyTag}>{faculty.code} — {faculty.name}</p>}
            </div>
          </div>
          <button className={styles.addBtn} onClick={() => setShowAddDept(true)}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="15">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
            </svg>
            Add Department
          </button>
        </div>

        {/* Stats row */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statVal}>{faculty?.departments?.length || 0}</div>
            <div className={styles.statLabel}>Departments</div>
          </div>
          <div className={`${styles.statCard} ${pendingCount > 0 ? styles.statHighlight : ''}`}>
            <div className={styles.statVal}>{pendingCount}</div>
            <div className={styles.statLabel}>Pending Requests</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statVal}>{requests.filter(r => r.status === 'approved').length}</div>
            <div className={styles.statLabel}>Approved</div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab === 'departments' ? styles.tabActive : ''}`} onClick={() => setActiveTab('departments')}>
            Departments ({faculty?.departments?.length || 0})
          </button>
          <button className={`${styles.tab} ${activeTab === 'requests' ? styles.tabActive : ''}`} onClick={() => setActiveTab('requests')}>
            Requests
            {pendingCount > 0 && <span className={styles.badge}>{pendingCount}</span>}
          </button>
          <button className={`${styles.tab} ${activeTab === 'info' ? styles.tabActive : ''}`} onClick={() => setActiveTab('info')}>
            Faculty Info
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}><span className="spinner" style={{ width: 28, height: 28 }} /><span>Loading...</span></div>
        ) : (
          <>
            {/* ── DEPARTMENTS TAB ── */}
            {activeTab === 'departments' && (
              <div className={styles.tabContent}>
                {!faculty?.departments?.length ? (
                  <div className={styles.empty}>
                    <div className={styles.emptyIcon}>◫</div>
                    <h3>No Departments Yet</h3>
                    <p>Add your first department using the button above.</p>
                  </div>
                ) : (
                  <div className={styles.deptGrid}>
                    {faculty.departments.map((dept, i) => (
                      <div key={i} className={styles.deptCard}>
                        <div className={styles.deptCardTop}>
                          <div className={styles.deptMeta}>
                            {dept.code && <span className={styles.deptCode}>{dept.code}</span>}
                            <span className={styles.deptName}>{dept.name}</span>
                          </div>
                          <button className={styles.removeDeptBtn} onClick={() => handleDeleteDept(i, dept.name)}>
                            <svg viewBox="0 0 20 20" fill="currentColor" width="13">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                            </svg>
                          </button>
                        </div>
                        {(dept.chairpersonName || dept.chairpersonEmail) && (
                          <div className={styles.chairRow}>
                            <svg viewBox="0 0 20 20" fill="currentColor" width="12">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                            </svg>
                            <div>
                              <span className={styles.chairName}>{dept.chairpersonName}</span>
                              {dept.chairpersonEmail && <span className={styles.chairEmail}> · {dept.chairpersonEmail}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── REQUESTS TAB ── */}
            {activeTab === 'requests' && (
              <div className={styles.tabContent}>
                {!requests.length ? (
                  <div className={styles.empty}>
                    <div className={styles.emptyIcon}>📬</div>
                    <h3>No Requests</h3>
                    <p>Department requests from Super Admin will appear here.</p>
                  </div>
                ) : (
                  <div className={styles.requestsList}>
                    {requests.map((req) => (
                      <div key={req._id} className={`${styles.requestCard} ${styles[statusColor[req.status]]}`}>
                        <div className={styles.requestTop}>
                          <div>
                            <div className={styles.requestDeptName}>{req.department.name}</div>
                            {req.department.code && <span className={styles.requestCode}>{req.department.code}</span>}
                          </div>
                          <span className={`${styles.statusPill} ${styles[req.status]}`}>{req.status}</span>
                        </div>

                        {(req.department.chairpersonName || req.department.chairpersonEmail) && (
                          <div className={styles.requestChair}>
                            <svg viewBox="0 0 20 20" fill="currentColor" width="12">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                            </svg>
                            <span>{req.department.chairpersonName}</span>
                            {req.department.chairpersonEmail && <span className={styles.chairEmail}> · {req.department.chairpersonEmail}</span>}
                          </div>
                        )}

                        <div className={styles.requestMeta}>
                          <span>Requested by: {req.requestedBy?.name}</span>
                          <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                        </div>

                        {req.status === 'rejected' && req.rejectionReason && (
                          <div className={styles.rejectionNote}>Reason: {req.rejectionReason}</div>
                        )}

                        {req.status === 'pending' && (
                          <div className={styles.requestActions}>
                            <button className={styles.approveBtn} onClick={() => handleApprove(req._id, req.department.name)}>
                              ✓ Approve
                            </button>
                            <button className={styles.rejectBtn} onClick={() => { setRejectModal(req); setRejectReason(''); }}>
                              ✕ Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Add Department Slide-in Panel ── */}
      {showAddDept && (
        <div className={styles.panelOverlay} onClick={(e) => e.target === e.currentTarget && setShowAddDept(false)}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>Add Department</h3>
              <button className={styles.panelClose} onClick={() => setShowAddDept(false)}>✕</button>
            </div>
            <form onSubmit={handleAddDept} className={styles.panelForm}>
              <div className={styles.panelNotice}>
                You are adding this department directly to <strong>{faculty?.name}</strong>.
              </div>

              <div className={styles.formSection}>
                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Department Name *</label>
                    <input className={styles.input} value={deptForm.name} onChange={e => setDeptForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Computer Science & Engineering" required />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Department Code</label>
                    <input className={styles.input} value={deptForm.code} onChange={e => setDeptForm(f => ({...f, code: e.target.value}))} placeholder="e.g. CSE" />
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <div className={styles.formSectionTitle}>
                  <span className={styles.dot} style={{background:'var(--gold)'}} /> Chairperson
                </div>
                <div className={styles.deptNotice}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="12"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                  Chairperson will be auto-registered and can login with Google.
                </div>
                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Chairperson Name</label>
                    <input className={styles.input} value={deptForm.chairpersonName} onChange={e => setDeptForm(f => ({...f, chairpersonName: e.target.value}))} placeholder="Prof. Full Name" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Chairperson Email</label>
                    <input className={styles.input} type="email" value={deptForm.chairpersonEmail} onChange={e => setDeptForm(f => ({...f, chairpersonEmail: e.target.value}))} placeholder="chair@institution.edu" />
                  </div>
                </div>
              </div>

              <div className={styles.panelActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowAddDept(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={deptLoading}>
                  {deptLoading ? <><span className="spinner" style={{width:14,height:14}} /> Adding...</> : '+ Add Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <div className={styles.panelOverlay} onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}>
          <div className={styles.rejectBox}>
            <h3 className={styles.rejectTitle}>Reject Request</h3>
            <p className={styles.rejectSub}>Rejecting: <strong>{rejectModal.department.name}</strong></p>
            <textarea
              className={styles.rejectInput}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Optional: reason for rejection..."
              rows={3}
            />
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
