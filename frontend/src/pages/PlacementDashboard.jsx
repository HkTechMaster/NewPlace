import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { CVPreview } from './CVBuilder';
import { jobAPI, driveAPI, studentListAPI } from '../utils/api';
import axios from 'axios';
import styles from './PlacementDashboard.module.css';

const JOB_TYPES = ['fulltime','parttime','internship','contract'];
const ROUND_TYPES = ['aptitude','technical','hr','group_discussion','assignment','other'];

export default function PlacementDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('students');
  const [loading, setLoading] = useState(true);

  // Students state
  const [approvedLists, setApprovedLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);

  // Jobs state
  const [jobs, setJobs] = useState([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [jobForm, setJobForm] = useState(getBlankJob());
  const [jobLoading, setJobLoading] = useState(false);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [viewJobStudents, setViewJobStudents] = useState(null);

  // Drives state
  const [drives, setDrives] = useState([]);
  const [showDriveForm, setShowDriveForm] = useState(false);
  const [driveForm, setDriveForm] = useState({ jobId:'', startDate:'', rounds:[{name:'Round 1',type:'aptitude',date:'',venue:''}] });
  const [activeDrive, setActiveDrive] = useState(null);
  const [activeDriveData, setActiveDriveData] = useState(null);
  const [activeRoundIdx, setActiveRoundIdx] = useState(0);
  const [driveView, setDriveView] = useState('attendance'); // attendance | results | report
  const [viewingCV, setViewingCV] = useState(null);
  const [reportData, setReportData] = useState(null);

  function getBlankJob() {
    return { title:'', company:'', companyLogo:'', description:'', location:'', jobType:'fulltime', salary:'', eligibleCourses:[], eligibleBatches:[], eligibleSemesters:[], minCgpa:'', requiresLeetcode:false, customRequirements:'', lastDateToApply:'' };
  }

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [listsRes, jobsRes, drivesRes] = await Promise.all([
        studentListAPI.getApproved().catch(() => ({ data: { lists: [] } })),
        jobAPI.getAll().catch(() => ({ data: { jobs: [] } })),
        driveAPI.getAll().catch(() => ({ data: { drives: [] } })),
      ]);
      // listsRes.data.lists is flat array of approved lists
      const allLists = listsRes.data.lists || [];
      setApprovedLists(allLists);
      setJobs(jobsRes.data.jobs || []);
      setDrives(drivesRes.data.drives || []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  // ── Job handlers ──────────────────────────────────────────────
  const handleJobSubmit = async (e) => {
    e.preventDefault();
    setJobLoading(true);
    try {
      const payload = { ...jobForm, minCgpa: parseFloat(jobForm.minCgpa)||0 };
      if (editJob) { await jobAPI.update(editJob._id, payload); toast.success('Job updated!'); }
      else { await jobAPI.create(payload); toast.success('Job posted!'); }
      setShowJobForm(false); setEditJob(null); setJobForm(getBlankJob()); fetchAll();
    } catch (e) { toast.error(e.response?.data?.message||'Failed'); }
    finally { setJobLoading(false); }
  };

  const handleRemindJob = async (id, company) => {
    try { await jobAPI.remind(id); toast.success(`Reminder emails sent for ${company}!`); }
    catch (e) { toast.error(e.response?.data?.message||'Failed'); }
  };

  // ── Drive handlers ────────────────────────────────────────────
  const handleCreateDrive = async (e) => {
    e.preventDefault();
    try {
      await driveAPI.create(driveForm);
      toast.success('Drive created!');
      setShowDriveForm(false);
      setDriveForm({ jobId:'', startDate:'', rounds:[{name:'Round 1',type:'aptitude',date:'',venue:''}] });
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.message||'Failed to create drive'); }
  };

  const openDrive = async (drive) => {
    setActiveDrive(drive);
    setActiveRoundIdx(0);
    setDriveView('attendance');
    setReportData(null);
    try {
      const res = await driveAPI.getById(drive._id);
      setActiveDriveData(res.data.drive);
    } catch { toast.error('Failed to load drive'); }
  };

  const handleSaveAttendance = async () => {
    const round = activeDriveData.rounds[activeRoundIdx];
    try {
      const attendance = round.attendance.map(a => ({ studentId: a.student, present: a.present }));
      await driveAPI.saveAttendance(activeDriveData._id, round._id, { attendance });
      toast.success('Attendance saved!');
      const res = await driveAPI.getById(activeDriveData._id);
      setActiveDriveData(res.data.drive);
    } catch { toast.error('Failed'); }
  };

  const handleSaveResults = async () => {
    const round = activeDriveData.rounds[activeRoundIdx];
    try {
      const results = round.results.map(r => ({ studentId: r.student, status: r.status, remarks: r.remarks||'' }));
      await driveAPI.saveResults(activeDriveData._id, round._id, { results });
      toast.success('Results saved!');
      const res = await driveAPI.getById(activeDriveData._id);
      setActiveDriveData(res.data.drive);
    } catch { toast.error('Failed'); }
  };

  const handleAddRound = async () => {
    const name = prompt('Round name?', `Round ${activeDriveData.rounds.length + 1}`);
    if (!name) return;
    const type = prompt('Type? (aptitude/technical/hr/group_discussion/assignment/other)', 'technical');
    try {
      await driveAPI.addRound(activeDriveData._id, { name, type: type||'other' });
      toast.success('Round added!');
      const res = await driveAPI.getById(activeDriveData._id);
      setActiveDriveData(res.data.drive);
      setActiveRoundIdx(activeDriveData.rounds.length);
    } catch { toast.error('Failed'); }
  };

  const handleUploadOffer = async (studentId, file) => {
    if (!file) return;
    if (file.size > 5*1024*1024) { toast.error('File max 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await driveAPI.uploadOffer(activeDriveData._id, studentId, { offerLetter: reader.result });
        toast.success('Offer letter uploaded!');
        const res = await driveAPI.getById(activeDriveData._id);
        setActiveDriveData(res.data.drive);
      } catch { toast.error('Upload failed'); }
    };
    reader.readAsDataURL(file);
  };

  const handleGetReport = async () => {
    try {
      const res = await driveAPI.getReport(activeDriveData._id);
      setReportData(res.data.report);
      setDriveView('report');
    } catch { toast.error('Failed to load report'); }
  };

  const statusColor = { selected:'var(--success)', rejected:'var(--danger)', in_process:'var(--warning)', next_round:'var(--accent)', pending:'var(--text-muted)' };

  if (activeDrive && activeDriveData) {
    const round = activeDriveData.rounds[activeRoundIdx];
    return (
      <div className={styles.page}>
        <Navbar/>
        <main className={styles.main}>
          <div className={styles.driveHeader}>
            <button className={styles.backBtn} onClick={() => setActiveDrive(null)}>← Back to Drives</button>
            <div>
              <h2 className={styles.driveTitle}>{activeDriveData.company} — {activeDriveData.title}</h2>
              <span className={`${styles.driveBadge} ${styles[activeDriveData.driveStatus]}`}>{activeDriveData.driveStatus}</span>
            </div>
            <div style={{display:'flex',gap:10,marginLeft:'auto'}}>
              <button className={styles.addRoundBtn} onClick={handleAddRound}>+ Add Round</button>
              <button className={styles.reportBtn} onClick={handleGetReport}>📊 Report</button>
            </div>
          </div>

          {/* Round tabs */}
          <div className={styles.roundTabs}>
            {activeDriveData.rounds.map((r,i) => (
              <button key={i} className={`${styles.roundTab} ${i===activeRoundIdx?styles.roundTabActive:''}`} onClick={() => setActiveRoundIdx(i)}>
                {r.name} <span className={`${styles.roundBadge} ${styles[r.status]}`}>{r.status}</span>
              </button>
            ))}
          </div>

          {/* View toggle */}
          {driveView !== 'report' && (
            <div className={styles.viewToggle}>
              <button className={`${styles.toggleBtn} ${driveView==='attendance'?styles.toggleActive:''}`} onClick={() => setDriveView('attendance')}>📋 Attendance</button>
              <button className={`${styles.toggleBtn} ${driveView==='results'?styles.toggleActive:''}`} onClick={() => setDriveView('results')}>🏆 Results</button>
            </div>
          )}

          {/* Attendance */}
          {driveView === 'attendance' && round && (
            <div className={styles.attendanceSection}>
              <div className={styles.sectionHeader}>
                <h3>{round.name} — Attendance</h3>
                <span>{round.attendance?.filter(a=>a.present).length}/{round.attendance?.length} present</span>
              </div>
              <div className={styles.attendanceGrid}>
                {round.attendance?.map((a, i) => (
                  <div key={i} className={`${styles.attendanceCard} ${a.present?styles.present:styles.absent}`}
                    onClick={() => {
                      const updated = { ...activeDriveData };
                      updated.rounds[activeRoundIdx].attendance[i].present = !a.present;
                      setActiveDriveData({ ...updated });
                    }}>
                    <div className={styles.attName}>{a.name}</div>
                    <div className={styles.attStatus}>{a.present ? '✓ Present' : '✗ Absent'}</div>
                  </div>
                ))}
              </div>
              <button className={styles.saveBtn} onClick={handleSaveAttendance}>💾 Save Attendance</button>
            </div>
          )}

          {/* Results */}
          {driveView === 'results' && round && (
            <div className={styles.resultsSection}>
              <div className={styles.sectionHeader}><h3>{round.name} — Results</h3></div>
              <table className={styles.resultsTable}>
                <thead><tr><th>Student</th><th>Status</th><th>Remarks</th><th>CV</th></tr></thead>
                <tbody>
                  {round.results?.map((r, i) => (
                    <tr key={i}>
                      <td className={styles.studentCell}>{r.name}</td>
                      <td>
                        <select className={styles.statusSelect} value={r.status} style={{color:statusColor[r.status]}}
                          onChange={e => {
                            const updated = { ...activeDriveData };
                            updated.rounds[activeRoundIdx].results[i].status = e.target.value;
                            setActiveDriveData({ ...updated });
                          }}>
                          <option value="pending">Pending</option>
                          <option value="next_round">Next Round</option>
                          <option value="selected">Selected ✓</option>
                          <option value="rejected">Rejected ✗</option>
                        </select>
                      </td>
                      <td>
                        <input className={styles.remarksInput} value={r.remarks||''} placeholder="Remarks..." onChange={e=>{
                          const updated={...activeDriveData};
                          updated.rounds[activeRoundIdx].results[i].remarks=e.target.value;
                          setActiveDriveData({...updated});
                        }}/>
                      </td>
                      <td>
                        {(() => {
                          const p = activeDriveData.participants.find(p => p.student.toString() === r.student.toString());
                          return p ? (
                            <button className={styles.viewCVBtn} onClick={async () => {
                              try {
                                // Get verified CV for this student
                                const res = await axios.get(`/cv/student-verified/${r.student}`);
                                setViewingCV(res.data.cv);
                              } catch {
                                toast.error('No verified CV found for this student');
                              }
                            }}>View CV</button>
                          ) : null;
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className={styles.saveBtn} onClick={handleSaveResults}>💾 Save Results</button>
            </div>
          )}

          {/* Report */}
          {driveView === 'report' && reportData && (
            <div className={styles.reportSection}>
              <button className={styles.backBtn} style={{marginBottom:16}} onClick={() => setDriveView('attendance')}>← Back</button>
              <div className={styles.reportSummary}>
                <div className={styles.reportStat} style={{borderColor:'var(--accent)'}}>
                  <div className={styles.reportStatVal}>{reportData.summary.total}</div><div>Total</div>
                </div>
                <div className={styles.reportStat} style={{borderColor:'var(--success)'}}>
                  <div className={styles.reportStatVal} style={{color:'var(--success)'}}>{reportData.summary.selected}</div><div>Selected</div>
                </div>
                <div className={styles.reportStat} style={{borderColor:'var(--danger)'}}>
                  <div className={styles.reportStatVal} style={{color:'var(--danger)'}}>{reportData.summary.rejected}</div><div>Rejected</div>
                </div>
                <div className={styles.reportStat} style={{borderColor:'var(--warning)'}}>
                  <div className={styles.reportStatVal} style={{color:'var(--warning)'}}>{reportData.summary.inProcess}</div><div>In Process</div>
                </div>
              </div>

              {/* Selected students + offer letter upload */}
              {reportData.selected?.length > 0 && (
                <div className={styles.reportList}>
                  <div className={styles.reportListTitle} style={{color:'var(--success)'}}>✓ Selected Students</div>
                  {reportData.selected.map((s,i) => {
                    const p = activeDriveData.participants.find(p => p.student.toString() === s.student.toString());
                    return (
                      <div key={i} className={styles.reportStudentRow}>
                        <span>{s.name}</span>
                        <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{s.email}</span>
                        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
                          {p?.offerLetter
                            ? <span style={{fontSize:'0.75rem',color:'var(--success)'}}>✓ Offer uploaded</span>
                            : <label className={styles.uploadOfferBtn}>
                                📎 Upload Offer
                                <input type="file" accept=".pdf,image/*" style={{display:'none'}} onChange={e=>handleUploadOffer(s.student,e.target.files[0])}/>
                              </label>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rounds summary */}
              <div className={styles.reportRounds}>
                <div className={styles.reportListTitle}>Round Summary</div>
                {reportData.rounds.map((r,i) => (
                  <div key={i} className={styles.reportRoundRow}>
                    <span className={styles.reportRoundName}>{r.name}</span>
                    <span>Present: {r.present}/{r.present+r.absent}</span>
                    <span style={{color:'var(--success)'}}>Selected: {r.selectedInRound}</span>
                    <span style={{color:'var(--danger)'}}>Rejected: {r.rejectedInRound}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {viewingCV && (
          <div className={styles.overlay} onClick={e=>e.target===e.currentTarget&&setViewingCV(null)}>
            <div className={styles.cvModal}>
              <div className={styles.cvModalHeader}><h3>Student CV</h3><button onClick={()=>setViewingCV(null)}>✕</button></div>
              <div style={{overflow:'auto',padding:24}}><CVPreview data={viewingCV}/></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Navbar/>
      <main className={styles.main}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {user?.avatar ? <img src={user.avatar} alt="" className={styles.avatar}/> : <div className={styles.avatarFallback}>{user?.name?.charAt(0)}</div>}
            <div>
              <p className={styles.greeting}>Placement Officer Dashboard</p>
              <h1 className={styles.title}>{user?.name}</h1>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}><div className={styles.statVal}>{approvedLists.reduce((a,l)=>a+(l.students?.length||0),0)}</div><div className={styles.statLabel}>Eligible Students</div></div>
          <div className={styles.statCard}><div className={styles.statVal}>{jobs.length}</div><div className={styles.statLabel}>Active Jobs</div></div>
          <div className={styles.statCard}><div className={styles.statVal}>{drives.length}</div><div className={styles.statLabel}>Drives</div></div>
          <div className={styles.statCard}><div className={styles.statVal}>{drives.filter(d=>d.driveStatus==='completed').length}</div><div className={styles.statLabel}>Completed</div></div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {['students','jobs','drives'].map(t => (
            <button key={t} className={`${styles.tab} ${activeTab===t?styles.tabActive:''}`} onClick={()=>setActiveTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.loading}><span className="spinner" style={{width:28,height:28}}/><span>Loading...</span></div>
        ) : (<>

          {/* ── STUDENTS TAB ── */}
          {activeTab === 'students' && (
            <div className={styles.tabContent}>
              <div className={styles.sectionHeader}><h3>Chairperson-Approved Student Lists</h3></div>
              {!approvedLists.length ? (
                <div className={styles.empty}><div className={styles.emptyIcon}>👥</div><h3>No Approved Lists Yet</h3><p>Chairperson needs to approve coordinator lists first.</p></div>
              ) : (
                <div className={styles.listsGrid}>
                  {approvedLists.map(list => (
                    <div key={list._id} className={styles.listCard} onClick={() => setSelectedList(selectedList?._id===list._id ? null : list)}>
                      <div className={styles.listCardTop}>
                        <div className={styles.listName}>{list.name}</div>
                        <span className={styles.approvedBadge}>✓ Approved</span>
                      </div>
                      <div className={styles.listMeta}>
                        <span>📚 {list.courseName}</span>
                        <span>📅 Batch {list.batch}</span>
                        <span>👥 {list.students?.length} students</span>
                      </div>
                      {selectedList?._id === list._id && (
                        <div className={styles.studentsList}>
                          {list.students?.map((s,i) => (
                            <div key={i} className={styles.studentRow}>
                              {s.photo ? <img src={s.photo} alt="" className={styles.sPhoto}/> : <div className={styles.sPhotoFallback}>{s.name?.charAt(0)}</div>}
                              <div><div className={styles.sName}>{s.name}</div><div className={styles.sEmail}>{s.email}</div></div>
                              <span className={styles.sSem}>Sem {s.semester}</span>
                              {s.cvId && (
                                <button className={styles.viewStudentsBtn} style={{marginLeft:'auto',padding:'4px 10px',fontSize:'0.72rem'}} onClick={async e => {
                                  e.stopPropagation();
                                  try {
                                    const res = await axios.get(`/cv/${s.cvId}`);
                                    setViewingCV(res.data.cv);
                                  } catch { toast.error('Failed to load CV'); }
                                }}>CV</button>
                              )}
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

          {/* ── JOBS TAB ── */}
          {activeTab === 'jobs' && (
            <div className={styles.tabContent}>
              <div className={styles.sectionHeader}>
                <h3>Posted Jobs ({jobs.length})</h3>
                <button className={styles.addBtn} onClick={() => { setShowJobForm(true); setEditJob(null); setJobForm(getBlankJob()); }}>+ Post Job</button>
              </div>
              {!jobs.length ? (
                <div className={styles.empty}><div className={styles.emptyIcon}>💼</div><h3>No Jobs Posted Yet</h3></div>
              ) : (
                <div className={styles.jobsGrid}>
                  {jobs.map(job => (
                    <div key={job._id} className={styles.jobCard}>
                      <div className={styles.jobCardTop}>
                        <div>
                          <div className={styles.jobTitle}>{job.title}</div>
                          <div className={styles.jobCompany}>{job.company}</div>
                        </div>
                        <span className={styles.jobTypeBadge}>{job.jobType}</span>
                      </div>
                      <div className={styles.jobMeta}>
                        {job.location && <span>📍 {job.location}</span>}
                        {job.salary && <span>💰 {job.salary}</span>}
                        {job.minCgpa > 0 && <span>📊 Min CGPA: {job.minCgpa}</span>}
                        <span>👥 {job.applications?.length||0} applied</span>
                      </div>
                      {job.lastDateToApply && <div className={styles.deadline}>Deadline: {new Date(job.lastDateToApply).toLocaleDateString('en-IN')}</div>}
                      <div className={styles.jobActions}>
                        <button className={styles.viewStudentsBtn} onClick={async () => {
                          const res = await jobAPI.getEligibleStudents(job._id);
                          setViewJobStudents({ job, students: res.data.students });
                        }}>👁 Eligible</button>
                        <button className={styles.remindJobBtn} onClick={() => handleRemindJob(job._id, job.company)}>📧 Remind</button>
                        <button className={styles.editJobBtn} onClick={() => { setEditJob(job); setJobForm({...job, minCgpa:job.minCgpa||'', lastDateToApply: job.lastDateToApply ? new Date(job.lastDateToApply).toISOString().split('T')[0] : '' }); setShowJobForm(true); }}>✏️</button>
                        <button className={styles.createDriveBtn} onClick={() => { setDriveForm(f=>({...f,jobId:job._id})); setShowDriveForm(true); setActiveTab('drives'); }}>🚀 Drive</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── DRIVES TAB ── */}
          {activeTab === 'drives' && (
            <div className={styles.tabContent}>
              <div className={styles.sectionHeader}>
                <h3>Placement Drives ({drives.length})</h3>
                <button className={styles.addBtn} onClick={() => setShowDriveForm(true)}>+ New Drive</button>
              </div>
              {!drives.length ? (
                <div className={styles.empty}><div className={styles.emptyIcon}>🚀</div><h3>No Drives Yet</h3><p>Create a drive from a posted job.</p></div>
              ) : (
                <div className={styles.drivesGrid}>
                  {drives.map(drive => {
                    const selected = drive.participants?.filter(p=>p.finalStatus==='selected').length||0;
                    return (
                      <div key={drive._id} className={styles.driveCard} onClick={() => openDrive(drive)}>
                        <div className={styles.driveCardTop}>
                          <div className={styles.driveCompany}>{drive.company}</div>
                          <span className={`${styles.driveBadge} ${styles[drive.driveStatus]}`}>{drive.driveStatus}</span>
                        </div>
                        <div className={styles.driveTitle2}>{drive.title}</div>
                        <div className={styles.driveMeta}>
                          <span>👥 {drive.participants?.length||0} participants</span>
                          <span>🔄 {drive.rounds?.length||0} rounds</span>
                          <span style={{color:'var(--success)'}}>✓ {selected} selected</span>
                        </div>
                        <div className={styles.driveProgress}>
                          {drive.rounds?.map((r,i) => (
                            <span key={i} className={`${styles.roundDot} ${styles[r.status]}`} title={r.name}/>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>)}
      </main>

      {/* Job Form Modal */}
      {showJobForm && (
        <div className={styles.overlay} onClick={e=>e.target===e.currentTarget&&setShowJobForm(false)}>
          <div className={styles.jobModal}>
            <div className={styles.modalHeader}>
              <h3>{editJob ? 'Edit Job' : 'Post New Job'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowJobForm(false)}>✕</button>
            </div>
            <form onSubmit={handleJobSubmit} className={styles.jobForm}>
              <div className={styles.jobFormGrid}>
                <div className={styles.field}><label>Job Title *</label><input className={styles.input} value={jobForm.title} onChange={e=>setJobForm(f=>({...f,title:e.target.value}))} required placeholder="e.g. Software Engineer"/></div>
                <div className={styles.field}><label>Company *</label><input className={styles.input} value={jobForm.company} onChange={e=>setJobForm(f=>({...f,company:e.target.value}))} required placeholder="Company Name"/></div>
                <div className={styles.field}><label>Location</label><input className={styles.input} value={jobForm.location} onChange={e=>setJobForm(f=>({...f,location:e.target.value}))} placeholder="City / Remote"/></div>
                <div className={styles.field}><label>Job Type</label>
                  <select className={styles.input} value={jobForm.jobType} onChange={e=>setJobForm(f=>({...f,jobType:e.target.value}))}>
                    {JOB_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className={styles.field}><label>Salary / Package</label><input className={styles.input} value={jobForm.salary} onChange={e=>setJobForm(f=>({...f,salary:e.target.value}))} placeholder="e.g. 6 LPA"/></div>
                <div className={styles.field}><label>Last Date to Apply</label><input className={styles.input} type="date" value={jobForm.lastDateToApply} onChange={e=>setJobForm(f=>({...f,lastDateToApply:e.target.value}))}/></div>
                <div className={styles.field}><label>Min CGPA <span style={{color:'var(--text-muted)',fontWeight:400}}>(0 = no filter)</span></label><input className={styles.input} type="number" step="0.1" min="0" max="10" value={jobForm.minCgpa} onChange={e=>setJobForm(f=>({...f,minCgpa:e.target.value}))} placeholder="e.g. 7.5"/></div>
              </div>

              {/* Eligible Courses — checkboxes from approved lists */}
              {(() => {
                const uniqueCourses = [];
                const seen = new Set();
                approvedLists.forEach(l => {
                  const id = l.course?._id || l.course;
                  if (id && !seen.has(id.toString())) {
                    seen.add(id.toString());
                    uniqueCourses.push({ id: id.toString(), name: l.courseName, code: l.courseCode });
                  }
                });
                return uniqueCourses.length > 0 && (
                  <div className={styles.field}>
                    <label>Eligible Courses <span style={{color:'var(--text-muted)',fontWeight:400}}>(select all that apply)</span></label>
                    <div className={styles.checkboxGrid}>
                      {uniqueCourses.map(c => (
                        <label key={c.id} className={styles.checkboxItem}>
                          <input type="checkbox"
                            checked={jobForm.eligibleCourses?.includes(c.id)||false}
                            onChange={e => setJobForm(f => ({
                              ...f,
                              eligibleCourses: e.target.checked
                                ? [...(f.eligibleCourses||[]), c.id]
                                : (f.eligibleCourses||[]).filter(x => x !== c.id)
                            }))}
                          />
                          <span>{c.code ? `${c.code} — ` : ''}{c.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Eligible Batches — checkboxes from approved lists */}
              {(() => {
                const uniqueBatches = [...new Set(approvedLists.map(l => l.batch).filter(Boolean))].sort();
                return uniqueBatches.length > 0 && (
                  <div className={styles.field}>
                    <label>Eligible Batches <span style={{color:'var(--text-muted)',fontWeight:400}}>(select all that apply)</span></label>
                    <div className={styles.checkboxGrid}>
                      {uniqueBatches.map(b => (
                        <label key={b} className={styles.checkboxItem}>
                          <input type="checkbox"
                            checked={jobForm.eligibleBatches?.includes(b)||false}
                            onChange={e => setJobForm(f => ({
                              ...f,
                              eligibleBatches: e.target.checked
                                ? [...(f.eligibleBatches||[]), b]
                                : (f.eligibleBatches||[]).filter(x => x !== b)
                            }))}
                          />
                          <span>{b}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className={styles.field}>
                <label>Job Description (JD)</label>
                <textarea className={styles.textarea} rows={4} value={jobForm.description} onChange={e=>setJobForm(f=>({...f,description:e.target.value}))} placeholder="Full job description, responsibilities, requirements..."/>
              </div>
              <div className={styles.field}>
                <label>Custom Requirements</label>
                <textarea className={styles.textarea} rows={2} value={jobForm.customRequirements} onChange={e=>setJobForm(f=>({...f,customRequirements:e.target.value}))} placeholder="e.g. LeetCode 100+ problems, specific certifications..."/>
              </div>
              <div className={styles.field}>
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                  <input type="checkbox" checked={jobForm.requiresLeetcode} onChange={e=>setJobForm(f=>({...f,requiresLeetcode:e.target.checked}))}/>
                  Requires LeetCode profile
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={()=>setShowJobForm(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={jobLoading}>{jobLoading?'Saving...':editJob?'Update Job':'Post Job'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drive Create Modal */}
      {showDriveForm && (
        <div className={styles.overlay} onClick={e=>e.target===e.currentTarget&&setShowDriveForm(false)}>
          <div className={styles.jobModal} style={{maxWidth:520}}>
            <div className={styles.modalHeader}><h3>Create Placement Drive</h3><button className={styles.closeBtn} onClick={()=>setShowDriveForm(false)}>✕</button></div>
            <form onSubmit={handleCreateDrive} className={styles.jobForm}>
              <div className={styles.field}><label>Select Job *</label>
                <select className={styles.input} value={driveForm.jobId} onChange={e=>setDriveForm(f=>({...f,jobId:e.target.value}))} required>
                  <option value="">— Select Job —</option>
                  {jobs.map(j=><option key={j._id} value={j._id}>{j.company} — {j.title} ({j.applications?.length||0} applicants)</option>)}
                </select>
              </div>
              <div className={styles.field}><label>Drive Start Date</label><input className={styles.input} type="date" value={driveForm.startDate} onChange={e=>setDriveForm(f=>({...f,startDate:e.target.value}))}/></div>
              <div className={styles.sectionTitle} style={{margin:'12px 0 8px',fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--text-muted)'}}>Initial Rounds</div>
              {driveForm.rounds.map((r,i) => (
                <div key={i} className={styles.roundRow}>
                  <input className={styles.input} value={r.name} onChange={e=>{const arr=[...driveForm.rounds];arr[i]={...arr[i],name:e.target.value};setDriveForm(f=>({...f,rounds:arr}))}} placeholder="Round name"/>
                  <select className={styles.input} value={r.type} onChange={e=>{const arr=[...driveForm.rounds];arr[i]={...arr[i],type:e.target.value};setDriveForm(f=>({...f,rounds:arr}))}}>
                    {ROUND_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                  {driveForm.rounds.length > 1 && <button type="button" onClick={()=>setDriveForm(f=>({...f,rounds:f.rounds.filter((_,j)=>j!==i)}))} className={styles.removeRoundBtn}>✕</button>}
                </div>
              ))}
              <button type="button" className={styles.addRoundSmall} onClick={()=>setDriveForm(f=>({...f,rounds:[...f.rounds,{name:`Round ${f.rounds.length+1}`,type:'technical',date:'',venue:''}]}))}>+ Add Round</button>
              <div className={styles.formActions} style={{marginTop:16}}>
                <button type="button" className={styles.cancelBtn} onClick={()=>setShowDriveForm(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn}>🚀 Create Drive</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Eligible Students Modal */}
      {viewJobStudents && (
        <div className={styles.overlay} onClick={e=>e.target===e.currentTarget&&setViewJobStudents(null)}>
          <div className={styles.jobModal} style={{maxWidth:500}}>
            <div className={styles.modalHeader}><h3>Eligible Students — {viewJobStudents.job.company}</h3><button className={styles.closeBtn} onClick={()=>setViewJobStudents(null)}>✕</button></div>
            <div style={{padding:'16px 24px',maxHeight:'60vh',overflow:'auto'}}>
              {!viewJobStudents.students?.length ? <p style={{color:'var(--text-muted)'}}>No eligible students found</p> : viewJobStudents.students.map((s,i) => (
                <div key={i} className={styles.studentRow} style={{borderBottom:'1px solid var(--border)',paddingBottom:10,marginBottom:10}}>
                  {s.photo?<img src={s.photo} alt="" className={styles.sPhoto}/>:<div className={styles.sPhotoFallback}>{s.name?.charAt(0)}</div>}
                  <div><div className={styles.sName}>{s.name}</div><div className={styles.sEmail}>{s.email}</div></div>
                  <span className={styles.sSem}>Sem {s.semester}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewingCV && (
        <div className={styles.overlay} onClick={e=>e.target===e.currentTarget&&setViewingCV(null)}>
          <div className={styles.cvModal}>
            <div className={styles.cvModalHeader}><h3>Student CV</h3><button onClick={()=>setViewingCV(null)}>✕</button></div>
            <div style={{overflow:'auto',padding:24}}><CVPreview data={viewingCV}/></div>
          </div>
        </div>
      )}
    </div>
  );
}
