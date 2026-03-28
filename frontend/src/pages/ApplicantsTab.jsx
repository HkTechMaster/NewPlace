import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { jobAPI, cvAPI } from '../utils/api';
import axios from 'axios';

const STATUS_OPTIONS = ['applied','shortlisted','selected','rejected'];
const STATUS_CONFIG = {
  applied:     { label:'Applied',       color:'#3b82f6', bg:'rgba(59,130,246,0.1)'  },
  shortlisted: { label:'Shortlisted ⭐', color:'#f59e0b', bg:'rgba(245,158,11,0.1)'  },
  selected:    { label:'Selected ✓',    color:'#10b981', bg:'rgba(16,185,129,0.1)'  },
  rejected:    { label:'Rejected',      color:'#ef4444', bg:'rgba(239,68,68,0.08)'  },
};

export default function ApplicantsTab({ jobs, approvedLists, onRefresh }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [applicantsData, setApplicantsData] = useState(null);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [viewingCV, setViewingCV] = useState(null);
  const [addStudentModal, setAddStudentModal] = useState(false);
  const [searchStudent, setSearchStudent] = useState('');

  const fetchApplicants = async (jobId) => {
    setLoadingApplicants(true);
    setSelectedCourse(null);
    setSelectedBatch(null);
    try {
      const res = await jobAPI.getApplicants(jobId);
      setApplicantsData(res.data);
    } catch { toast.error('Failed to load applicants'); }
    finally { setLoadingApplicants(false); }
  };

  const handleSelectJob = (job) => {
    setSelectedJob(job);
    fetchApplicants(job._id);
  };

  const handleStatusChange = async (studentId, status) => {
    try {
      await jobAPI.updateApplicantStatus(selectedJob._id, studentId, status);
      toast.success('Status updated!');
      fetchApplicants(selectedJob._id);
    } catch { toast.error('Failed'); }
  };

  const handleViewCV = async (cvId) => {
    if (!cvId) { toast.error('No CV attached'); return; }
    try {
      const res = await cvAPI.getById(cvId);
      setViewingCV(res.data.cv);
    } catch { toast.error('Failed to load CV'); }
  };

  // Get eligible students from approved lists for this job (for manual add)
  const getEligibleFromLists = () => {
    if (!selectedJob || !approvedLists.length) return [];
    const applied = new Set(
      Object.values(applicantsData?.grouped || {}).flatMap(c =>
        Object.values(c.batches).flatMap(b => b.map(s => s._id?.toString()))
      )
    );
    return approvedLists
      .flatMap(l => l.students || [])
      .filter(s => !applied.has(s.student?.toString()))
      .filter(s => !searchStudent || s.name?.toLowerCase().includes(searchStudent.toLowerCase()) || s.email?.toLowerCase().includes(searchStudent.toLowerCase()));
  };

  const handleAddStudent = async (studentId) => {
    try {
      await jobAPI.addStudent(selectedJob._id, studentId);
      toast.success('Student added!');
      fetchApplicants(selectedJob._id);
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  // Current displayed students
  const currentStudents = selectedCourse && selectedBatch
    ? (applicantsData?.grouped?.[selectedCourse]?.batches?.[selectedBatch] || [])
    : [];

  return (
    <div>
      {/* Job Pills */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:'0.68rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--text-muted)',marginBottom:10}}>Select Job</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
          {!jobs.length && <span style={{color:'var(--text-muted)',fontSize:'0.825rem'}}>No jobs posted yet</span>}
          {jobs.map(job => (
            <button key={job._id}
              onClick={() => handleSelectJob(job)}
              style={{
                padding:'8px 16px',borderRadius:20,border:'1px solid',fontFamily:'var(--font-body)',
                fontSize:'0.825rem',fontWeight:600,cursor:'pointer',transition:'all 0.15s',
                background: selectedJob?._id===job._id ? 'var(--accent)' : 'var(--bg-secondary)',
                color: selectedJob?._id===job._id ? 'white' : 'var(--text-secondary)',
                borderColor: selectedJob?._id===job._id ? 'var(--accent)' : 'var(--border)',
              }}>
              {job.company} — {job.title}
              <span style={{marginLeft:6,fontSize:'0.7rem',opacity:0.8}}>({job.applications?.length||0})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Course Pills */}
      {selectedJob && applicantsData && !loadingApplicants && (
        <div style={{marginBottom:16}}>
          <div style={{fontSize:'0.68rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--text-muted)',marginBottom:10}}>
            Course — {applicantsData.totalApplicants} total applicants
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {!Object.keys(applicantsData.grouped||{}).length && (
              <span style={{color:'var(--text-muted)',fontSize:'0.825rem'}}>No applicants yet</span>
            )}
            {Object.values(applicantsData.grouped||{}).map(course => (
              <button key={course.courseId}
                onClick={() => { setSelectedCourse(course.courseId); setSelectedBatch(null); }}
                style={{
                  padding:'7px 16px',borderRadius:20,border:'1px solid',fontFamily:'var(--font-body)',
                  fontSize:'0.8rem',fontWeight:600,cursor:'pointer',transition:'all 0.15s',
                  background: selectedCourse===course.courseId ? 'var(--gold)' : 'var(--bg-secondary)',
                  color: selectedCourse===course.courseId ? '#000' : 'var(--text-secondary)',
                  borderColor: selectedCourse===course.courseId ? 'var(--gold)' : 'var(--border)',
                }}>
                {course.courseCode || course.courseName}
                <span style={{marginLeft:6,fontSize:'0.7rem',opacity:0.8}}>
                  ({Object.values(course.batches).reduce((a,b)=>a+b.length,0)})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Batch Pills */}
      {selectedCourse && applicantsData?.grouped?.[selectedCourse] && (
        <div style={{marginBottom:16}}>
          <div style={{fontSize:'0.68rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--text-muted)',marginBottom:10}}>Batch</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {Object.keys(applicantsData.grouped[selectedCourse].batches).map(batch => (
              <button key={batch}
                onClick={() => setSelectedBatch(batch)}
                style={{
                  padding:'6px 14px',borderRadius:20,border:'1px solid',fontFamily:'var(--font-body)',
                  fontSize:'0.78rem',fontWeight:600,cursor:'pointer',transition:'all 0.15s',
                  background: selectedBatch===batch ? 'var(--success)' : 'var(--bg-secondary)',
                  color: selectedBatch===batch ? 'white' : 'var(--text-secondary)',
                  borderColor: selectedBatch===batch ? 'var(--success)' : 'var(--border)',
                }}>
                {batch} ({applicantsData.grouped[selectedCourse].batches[batch].length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Students List */}
      {selectedBatch && currentStudents.length > 0 && (
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 18px',borderBottom:'1px solid var(--border)',background:'var(--bg-secondary)'}}>
            <span style={{fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--text-muted)'}}>
              {currentStudents.length} Applicants
            </span>
            <button
              onClick={() => setAddStudentModal(true)}
              style={{padding:'6px 14px',background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:'var(--radius-sm)',color:'var(--accent)',fontSize:'0.75rem',fontWeight:600,fontFamily:'var(--font-body)',cursor:'pointer'}}>
              + Add Student
            </button>
          </div>

          {currentStudents.map((s, i) => {
            const sc = STATUS_CONFIG[s.applicationStatus] || STATUS_CONFIG.applied;
            return (
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 18px',borderBottom:'1px solid var(--border)',transition:'background 0.1s'}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>

                {/* Photo */}
                {s.photo
                  ? <img src={s.photo} alt="" style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>
                  : <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,var(--gold),#d97706)',color:'#000',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.875rem',fontWeight:700,flexShrink:0}}>{s.name?.charAt(0)}</div>
                }

                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'0.875rem',fontWeight:600,color:'var(--text-primary)'}}>{s.name}</div>
                  <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{s.email} · Sem {s.semester}</div>
                  {s.consent && <div style={{fontSize:'0.65rem',color:'var(--success)',marginTop:2}}>✓ Consented</div>}
                  {s.addedBy === 'po' && <div style={{fontSize:'0.65rem',color:'var(--gold)',marginTop:2}}>Added by PO</div>}
                </div>

                {/* CV Button */}
                <button
                  onClick={() => handleViewCV(s.cvId)}
                  disabled={!s.cvId}
                  style={{padding:'5px 12px',background:s.cvId?'rgba(59,130,246,0.08)':'var(--bg-secondary)',border:'1px solid',borderColor:s.cvId?'rgba(59,130,246,0.2)':'var(--border)',borderRadius:'var(--radius-sm)',color:s.cvId?'var(--accent)':'var(--text-muted)',fontSize:'0.72rem',fontFamily:'var(--font-body)',cursor:s.cvId?'pointer':'not-allowed',flexShrink:0}}>
                  {s.cvId ? 'View CV' : 'No CV'}
                </button>

                {/* Status Dropdown */}
                <select
                  value={s.applicationStatus || 'applied'}
                  onChange={e => handleStatusChange(s._id, e.target.value)}
                  style={{padding:'5px 10px',background:sc.bg,border:`1px solid ${sc.color}30`,borderRadius:'var(--radius-sm)',color:sc.color,fontSize:'0.75rem',fontFamily:'var(--font-body)',fontWeight:600,cursor:'pointer',flexShrink:0}}>
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{STATUS_CONFIG[opt].label}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {selectedBatch && !currentStudents.length && (
        <div style={{textAlign:'center',padding:40,color:'var(--text-muted)',fontSize:'0.875rem'}}>
          No applicants in this batch yet.
          <button onClick={()=>setAddStudentModal(true)} style={{display:'block',margin:'12px auto 0',padding:'8px 18px',background:'var(--accent)',border:'none',borderRadius:'var(--radius-sm)',color:'white',fontSize:'0.8rem',fontFamily:'var(--font-body)',cursor:'pointer'}}>
            + Add Student Manually
          </button>
        </div>
      )}

      {loadingApplicants && (
        <div style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>Loading applicants...</div>
      )}

      {/* Add Student Modal */}
      {addStudentModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}} onClick={e=>e.target===e.currentTarget&&setAddStudentModal(false)}>
          <div style={{width:'100%',maxWidth:500,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:24,maxHeight:'80vh',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h3 style={{fontFamily:'var(--font-display)',fontWeight:700,color:'var(--text-primary)'}}>Add Student to Job</h3>
              <button onClick={()=>setAddStudentModal(false)} style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:'1.1rem',cursor:'pointer'}}>✕</button>
            </div>
            <input
              placeholder="Search by name or email..."
              value={searchStudent}
              onChange={e=>setSearchStudent(e.target.value)}
              style={{padding:'9px 12px',background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text-primary)',fontSize:'0.875rem',fontFamily:'var(--font-body)',marginBottom:12}}
            />
            <div style={{overflow:'auto',flex:1}}>
              {getEligibleFromLists().slice(0,20).map((s,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,var(--gold),#d97706)',color:'#000',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.8rem',fontWeight:700,flexShrink:0}}>{s.name?.charAt(0)}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'0.85rem',fontWeight:600,color:'var(--text-primary)'}}>{s.name}</div>
                    <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{s.email}</div>
                  </div>
                  <button onClick={()=>handleAddStudent(s.student)} style={{padding:'5px 14px',background:'var(--success)',border:'none',borderRadius:'var(--radius-sm)',color:'white',fontSize:'0.75rem',fontFamily:'var(--font-body)',cursor:'pointer',fontWeight:600}}>
                    Add
                  </button>
                </div>
              ))}
              {!getEligibleFromLists().length && <p style={{color:'var(--text-muted)',fontSize:'0.825rem',textAlign:'center',padding:20}}>No eligible students found</p>}
            </div>
          </div>
        </div>
      )}

      {/* CV View Modal */}
      {viewingCV && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.78)',zIndex:1001,display:'flex',alignItems:'center',justifyContent:'center',padding:24}} onClick={e=>e.target===e.currentTarget&&setViewingCV(null)}>
          <div style={{width:'100%',maxWidth:700,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',maxHeight:'88vh',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 24px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
              <h3 style={{fontFamily:'var(--font-display)',fontWeight:700,color:'var(--text-primary)'}}>Student CV</h3>
              <button onClick={()=>setViewingCV(null)} style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:'1.1rem',cursor:'pointer'}}>✕</button>
            </div>
            <div style={{overflow:'auto',padding:24}}>
              <pre style={{whiteSpace:'pre-wrap',color:'var(--text-primary)',fontSize:'0.8rem',fontFamily:'monospace'}}>{JSON.stringify(viewingCV,null,2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
