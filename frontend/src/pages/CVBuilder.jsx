import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import styles from './CVBuilder.module.css';

const STEPS = [
  { id: 'personal',  label: 'Personal',      icon: '👤' },
  { id: 'education', label: 'Education',      icon: '🎓' },
  { id: 'skills',    label: 'Skills',         icon: '⚡' },
  { id: 'projects',  label: 'Projects',       icon: '🔧' },
  { id: 'work',      label: 'Experience',     icon: '💼' },
  { id: 'achieve',   label: 'Achievements',   icon: '🏆' },
  { id: 'preview',   label: 'Preview & Send', icon: '✉️' },
];

const EMPTY_PROJECT  = { title:'', description:'', startDate:'', endDate:'', link:'' };
const EMPTY_WORK     = { company:'', role:'', startDate:'', endDate:'', description:'' };
const EMPTY_ACHIEVE  = { title:'', issuer:'', date:'', description:'' };
const EMPTY_LINK     = { label:'', url:'' };
const EMPTY_SEM      = (n) => ({ semester:n, cgpa:'', reAttempts:'' });

export default function CVBuilder({ existingCV, onSaved }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const photoRef = useRef();

  // ── Form state ──────────────────────────────────────────────────
  const [personal, setPersonal] = useState({
    name: user?.name || '', email: user?.email || '',
    phone: '', altEmail: '', altPhone: '',
    photo: '', linkedin: '', github: '', leetcode: '',
    otherLinks: [],
  });

  const [education, setEducation] = useState({
    tenthSchool:'', tenthBoard:'', tenthPercent:'', tenthYear:'', tenthMarksheet:'',
    twelfthSchool:'', twelfthBoard:'', twelfthPercent:'', twelfthYear:'', twelfthMarksheet:'',
    semesterResults:[], overallCgpa:'',
  });

  const [skills, setSkills] = useState({ technicalSkills:[], softSkills:[] });
  const [skillInput, setSkillInput] = useState({ tech:'', soft:'' });
  const [projects, setProjects]   = useState([{ ...EMPTY_PROJECT }]);
  const [work, setWork]           = useState([]);
  const [achieve, setAchieve]     = useState([]);

  const currentSem = user?.semester || parseInt(existingCV?.currentSemester) || 1;

  // Seed semester results array based on current semester
  useEffect(() => {
    if (currentSem >= 4) {
      const filled = Array.from({ length: currentSem - 1 }, (_, i) => EMPTY_SEM(i + 1));
      setEducation(e => ({ ...e, semesterResults: e.semesterResults.length ? e.semesterResults : filled }));
    }
  }, [currentSem]);

  // Pre-fill from existing CV
  useEffect(() => {
    if (!existingCV) return;
    const cv = existingCV;
    setPersonal({
      name: cv.name||user?.name||'', email: cv.email||user?.email||'',
      phone: cv.phone||'', altEmail: cv.altEmail||'', altPhone: cv.altPhone||'',
      photo: cv.photo||'', linkedin: cv.linkedin||'', github: cv.github||'',
      leetcode: cv.leetcode||'', otherLinks: cv.otherLinks||[],
    });
    setEducation({
      tenthSchool: cv.tenthSchool||'', tenthBoard: cv.tenthBoard||'',
      tenthPercent: cv.tenthPercent||'', tenthYear: cv.tenthYear||'',
      tenthMarksheet: cv.tenthMarksheet||'',
      twelfthSchool: cv.twelfthSchool||'', twelfthBoard: cv.twelfthBoard||'',
      twelfthPercent: cv.twelfthPercent||'', twelfthYear: cv.twelfthYear||'',
      twelfthMarksheet: cv.twelfthMarksheet||'',
      semesterResults: cv.semesterResults?.length ? cv.semesterResults.map(s=>({...s,cgpa:s.cgpa||'',reAttempts:s.reAttempts||''})) : (currentSem>=4?Array.from({length:currentSem-1},(_,i)=>EMPTY_SEM(i+1)):[]),
      overallCgpa: cv.overallCgpa||'',
    });
    setSkills({ technicalSkills: cv.technicalSkills||[], softSkills: cv.softSkills||[] });
    setProjects(cv.projects?.length ? cv.projects : [{ ...EMPTY_PROJECT }]);
    setWork(cv.workExperience||[]);
    setAchieve(cv.achievements||[]);
  }, [existingCV]);

  // Auto-calc overall CGPA
  const calcOverallCgpa = (results) => {
    const valid = results.filter(r => r.cgpa && !isNaN(parseFloat(r.cgpa)));
    if (!valid.length) return '';
    const sum = valid.reduce((a, r) => a + parseFloat(r.cgpa), 0);
    return (sum / valid.length).toFixed(2);
  };

  const handleSemResult = (idx, field, val) => {
    setEducation(e => {
      const arr = [...e.semesterResults];
      arr[idx] = { ...arr[idx], [field]: val };
      const overall = calcOverallCgpa(arr);
      return { ...e, semesterResults: arr, overallCgpa: overall };
    });
  };

  // Photo upload
  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Photo max 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setPersonal(p => ({ ...p, photo: reader.result }));
    reader.readAsDataURL(file);
  };

  // Marksheet upload
  const handleMarksheet = (field, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('File max 3MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setEducation(ed => ({ ...ed, [field]: reader.result }));
    reader.readAsDataURL(file);
  };

  // Skills
  const addSkill = (type) => {
    const val = skillInput[type].trim();
    if (!val) return;
    const key = type === 'tech' ? 'technicalSkills' : 'softSkills';
    setSkills(s => ({ ...s, [key]: [...s[key], val] }));
    setSkillInput(si => ({ ...si, [type]: '' }));
  };
  const removeSkill = (type, idx) => {
    const key = type === 'tech' ? 'technicalSkills' : 'softSkills';
    setSkills(s => ({ ...s, [key]: s[key].filter((_,i) => i !== idx) }));
  };

  // Build full payload
  const buildPayload = () => ({
    ...personal,
    ...education,
    technicalSkills: skills.technicalSkills,
    softSkills: skills.softSkills,
    projects,
    workExperience: work,
    achievements: achieve,
    graduationCourse: user?.courseName || '',
    currentSemester: currentSem,
    batch: user?.batch || '',
  });

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const endpoint = existingCV?.status === 'verified' ? '/cv/submit-update' : '/cv/save';
      await axios.post(endpoint, buildPayload());
      toast.success('Draft saved!');
      onSaved?.();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    if (!personal.name || !personal.email) { toast.error('Name and email required'); return; }
    setSubmitting(true);
    try {
      const endpoint = existingCV?.status === 'verified' ? '/cv/submit-update' : '/cv/submit';
      await axios.post(endpoint, buildPayload());
      toast.success(existingCV?.status === 'verified' ? 'Updated CV sent for re-verification!' : 'CV submitted for verification!');
      onSaved?.();
    } catch (e) { toast.error(e.response?.data?.message || 'Submit failed'); }
    finally { setSubmitting(false); }
  };

  const isVerifiedResubmit = existingCV?.status === 'verified';

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.layout}>

        {/* Sidebar steps */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>
            {isVerifiedResubmit ? '✏️ Update CV' : '📄 Build Your CV'}
          </div>
          {STEPS.map((s, i) => (
            <button key={s.id} className={`${styles.stepBtn} ${i === step ? styles.stepActive : ''} ${i < step ? styles.stepDone : ''}`} onClick={() => setStep(i)}>
              <span className={styles.stepIcon}>{i < step ? '✓' : s.icon}</span>
              <span className={styles.stepLabel}>{s.label}</span>
              {i === step && <span className={styles.stepArrow}>→</span>}
            </button>
          ))}
          <div className={styles.sidebarActions}>
            <button className={styles.saveDraftBtn} onClick={handleSaveDraft} disabled={saving}>
              {saving ? '...' : '💾 Save Draft'}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className={styles.content}>

          {/* ── STEP 0: PERSONAL ── */}
          {step === 0 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}><span className={styles.stepHeaderIcon}>👤</span><div><h2>Personal Information</h2><p>Your basic details — name, contact, links</p></div></div>

              {/* Photo */}
              <div className={styles.photoRow}>
                <div className={styles.photoWrap} onClick={() => photoRef.current?.click()}>
                  {personal.photo ? <img src={personal.photo} alt="" className={styles.photoImg}/> : <div className={styles.photoPlaceholder}><span>📷</span><span>Upload Photo</span></div>}
                  <div className={styles.photoOverlay}>Change</div>
                </div>
                <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}}/>
                <div className={styles.photoHint}><strong>Profile Photo</strong><span>JPG or PNG · Max 2MB</span></div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.field}><label>Full Name *</label><input className={styles.input} value={personal.name} onChange={e=>setPersonal(p=>({...p,name:e.target.value}))} placeholder="Your full name"/></div>
                <div className={styles.field}><label>Primary Email *</label><input className={styles.input} value={personal.email} onChange={e=>setPersonal(p=>({...p,email:e.target.value}))} placeholder="your@email.com"/></div>
                <div className={styles.field}><label>Phone *</label><input className={styles.input} value={personal.phone} onChange={e=>setPersonal(p=>({...p,phone:e.target.value}))} placeholder="+91 99999 99999"/></div>
                <div className={styles.field}><label>Alternate Email <span className={styles.optional}>(optional)</span></label><input className={styles.input} value={personal.altEmail} onChange={e=>setPersonal(p=>({...p,altEmail:e.target.value}))} placeholder="alt@email.com"/></div>
                <div className={styles.field}><label>Alternate Phone <span className={styles.optional}>(optional)</span></label><input className={styles.input} value={personal.altPhone} onChange={e=>setPersonal(p=>({...p,altPhone:e.target.value}))} placeholder="+91 88888 88888"/></div>
              </div>

              <div className={styles.sectionDivider}>🌐 Online Profiles</div>
              <div className={styles.grid2}>
                <div className={styles.field}><label>LinkedIn URL</label><input className={styles.input} value={personal.linkedin} onChange={e=>setPersonal(p=>({...p,linkedin:e.target.value}))} placeholder="linkedin.com/in/yourname"/></div>
                <div className={styles.field}><label>GitHub URL</label><input className={styles.input} value={personal.github} onChange={e=>setPersonal(p=>({...p,github:e.target.value}))} placeholder="github.com/yourname"/></div>
                <div className={styles.field}><label>LeetCode URL <span className={styles.optional}>(optional)</span></label><input className={styles.input} value={personal.leetcode} onChange={e=>setPersonal(p=>({...p,leetcode:e.target.value}))} placeholder="leetcode.com/yourname"/></div>
              </div>
              {/* Other links */}
              {personal.otherLinks.map((lk, i) => (
                <div key={i} className={styles.grid2} style={{marginTop:8}}>
                  <div className={styles.field}><label>Platform Name</label><input className={styles.input} value={lk.label} onChange={e=>{const arr=[...personal.otherLinks];arr[i]={...arr[i],label:e.target.value};setPersonal(p=>({...p,otherLinks:arr}))}}/></div>
                  <div className={styles.field}><label>URL</label>
                    <div className={styles.inputWithRemove}>
                      <input className={styles.input} value={lk.url} onChange={e=>{const arr=[...personal.otherLinks];arr[i]={...arr[i],url:e.target.value};setPersonal(p=>({...p,otherLinks:arr}))}}/>
                      <button className={styles.removeBtn} onClick={()=>setPersonal(p=>({...p,otherLinks:p.otherLinks.filter((_,j)=>j!==i)}))}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
              <button className={styles.addRowBtn} onClick={()=>setPersonal(p=>({...p,otherLinks:[...p.otherLinks,{...EMPTY_LINK}]}))}>+ Add Platform</button>
            </div>
          )}

          {/* ── STEP 1: EDUCATION ── */}
          {step === 1 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}><span className={styles.stepHeaderIcon}>🎓</span><div><h2>Education</h2><p>10th, 12th marksheets and graduation progress</p></div></div>

              {/* 10th */}
              <div className={styles.educCard}>
                <div className={styles.educCardTitle}>10th Standard</div>
                <div className={styles.grid2}>
                  <div className={styles.field}><label>School Name</label><input className={styles.input} value={education.tenthSchool} onChange={e=>setEducation(ed=>({...ed,tenthSchool:e.target.value}))} placeholder="School Name"/></div>
                  <div className={styles.field}><label>Board</label><input className={styles.input} value={education.tenthBoard} onChange={e=>setEducation(ed=>({...ed,tenthBoard:e.target.value}))} placeholder="e.g. CBSE / ICSE"/></div>
                  <div className={styles.field}><label>Percentage / Grade</label><input className={styles.input} value={education.tenthPercent} onChange={e=>setEducation(ed=>({...ed,tenthPercent:e.target.value}))} placeholder="e.g. 85.2%"/></div>
                  <div className={styles.field}><label>Year of Passing</label><input className={styles.input} value={education.tenthYear} onChange={e=>setEducation(ed=>({...ed,tenthYear:e.target.value}))} placeholder="e.g. 2020"/></div>
                </div>
                <div className={styles.field}>
                  <label>Upload Marksheet <span className={styles.optional}>(PDF or Image · max 3MB)</span></label>
                  <label className={styles.fileLabel}>
                    {education.tenthMarksheet ? '✓ File uploaded — click to change' : '📎 Choose file'}
                    <input type="file" accept="image/*,.pdf" onChange={e=>handleMarksheet('tenthMarksheet',e)} style={{display:'none'}}/>
                  </label>
                </div>
              </div>

              {/* 12th */}
              <div className={styles.educCard}>
                <div className={styles.educCardTitle}>12th Standard</div>
                <div className={styles.grid2}>
                  <div className={styles.field}><label>School Name</label><input className={styles.input} value={education.twelfthSchool} onChange={e=>setEducation(ed=>({...ed,twelfthSchool:e.target.value}))} placeholder="School Name"/></div>
                  <div className={styles.field}><label>Board</label><input className={styles.input} value={education.twelfthBoard} onChange={e=>setEducation(ed=>({...ed,twelfthBoard:e.target.value}))} placeholder="e.g. CBSE / ICSE"/></div>
                  <div className={styles.field}><label>Percentage / Grade</label><input className={styles.input} value={education.twelfthPercent} onChange={e=>setEducation(ed=>({...ed,twelfthPercent:e.target.value}))} placeholder="e.g. 90.4%"/></div>
                  <div className={styles.field}><label>Year of Passing</label><input className={styles.input} value={education.twelfthYear} onChange={e=>setEducation(ed=>({...ed,twelfthYear:e.target.value}))} placeholder="e.g. 2022"/></div>
                </div>
                <div className={styles.field}>
                  <label>Upload Marksheet <span className={styles.optional}>(PDF or Image · max 3MB)</span></label>
                  <label className={styles.fileLabel}>
                    {education.twelfthMarksheet ? '✓ File uploaded — click to change' : '📎 Choose file'}
                    <input type="file" accept="image/*,.pdf" onChange={e=>handleMarksheet('twelfthMarksheet',e)} style={{display:'none'}}/>
                  </label>
                </div>
              </div>

              {/* Graduation */}
              <div className={styles.educCard}>
                <div className={styles.educCardTitle}>Graduation — {user?.courseName || 'Current Course'}</div>
                <div className={styles.gradInfo}>
                  <span>Batch: <strong>{user?.batch}</strong></span>
                  <span>Current Semester: <strong>Sem {currentSem}</strong></span>
                </div>

                {currentSem <= 1 && (
                  <div className={styles.noGradeNote}>📝 You're in Semester 1 — CGPA will be added from Semester 2 onwards.</div>
                )}

                {currentSem >= 2 && currentSem <= 3 && (
                  <div className={styles.field}>
                    <label>Overall CGPA so far</label>
                    <input className={styles.input} style={{maxWidth:200}} value={education.overallCgpa} onChange={e=>setEducation(ed=>({...ed,overallCgpa:e.target.value}))} placeholder="e.g. 8.5" type="number" step="0.01" min="0" max="10"/>
                  </div>
                )}

                {currentSem >= 4 && (
                  <>
                    <div className={styles.semTable}>
                      <div className={styles.semTableHeader}><span>Semester</span><span>CGPA</span><span>Re-attempts</span></div>
                      {education.semesterResults.map((sr, i) => (
                        <div key={i} className={styles.semRow}>
                          <span className={styles.semLabel}>Sem {sr.semester}</span>
                          <input className={styles.semInput} type="number" step="0.01" min="0" max="10" placeholder="0.00" value={sr.cgpa} onChange={e=>handleSemResult(i,'cgpa',e.target.value)}/>
                          <input className={styles.semInput} type="number" min="0" placeholder="0" value={sr.reAttempts} onChange={e=>handleSemResult(i,'reAttempts',e.target.value)}/>
                        </div>
                      ))}
                    </div>
                    {education.overallCgpa && (
                      <div className={styles.overallCgpa}>Overall CGPA: <strong>{education.overallCgpa}</strong></div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2: SKILLS ── */}
          {step === 2 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}><span className={styles.stepHeaderIcon}>⚡</span><div><h2>Skills</h2><p>Technical skills and soft skills</p></div></div>

              <div className={styles.skillSection}>
                <div className={styles.skillSectionTitle}>🖥️ Technical Skills</div>
                <div className={styles.skillInputRow}>
                  <input className={styles.input} value={skillInput.tech} onChange={e=>setSkillInput(si=>({...si,tech:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addSkill('tech')} placeholder="e.g. React, Node.js, Python..."/>
                  <button className={styles.addSkillBtn} onClick={()=>addSkill('tech')}>Add</button>
                </div>
                <div className={styles.skillTags}>
                  {skills.technicalSkills.map((sk, i) => (
                    <span key={i} className={`${styles.skillTag} ${styles.techTag}`}>{sk}<button onClick={()=>removeSkill('tech',i)}>✕</button></span>
                  ))}
                  {!skills.technicalSkills.length && <span className={styles.skillHint}>Press Enter or click Add to add a skill</span>}
                </div>
              </div>

              <div className={styles.skillSection}>
                <div className={styles.skillSectionTitle}>🤝 Soft Skills</div>
                <div className={styles.skillInputRow}>
                  <input className={styles.input} value={skillInput.soft} onChange={e=>setSkillInput(si=>({...si,soft:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addSkill('soft')} placeholder="e.g. Communication, Leadership..."/>
                  <button className={styles.addSkillBtn} onClick={()=>addSkill('soft')}>Add</button>
                </div>
                <div className={styles.skillTags}>
                  {skills.softSkills.map((sk, i) => (
                    <span key={i} className={`${styles.skillTag} ${styles.softTag}`}>{sk}<button onClick={()=>removeSkill('soft',i)}>✕</button></span>
                  ))}
                  {!skills.softSkills.length && <span className={styles.skillHint}>Press Enter or click Add</span>}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: PROJECTS ── */}
          {step === 3 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}><span className={styles.stepHeaderIcon}>🔧</span><div><h2>Projects</h2><p>Academic or personal projects you've worked on</p></div></div>
              {projects.map((p, i) => (
                <div key={i} className={styles.repeaterCard}>
                  <div className={styles.repeaterTop}>
                    <span className={styles.repeaterNum}>Project {i+1}</span>
                    {projects.length > 1 && <button className={styles.removeRepeaterBtn} onClick={()=>setProjects(arr=>arr.filter((_,j)=>j!==i))}>Remove</button>}
                  </div>
                  <div className={styles.grid2}>
                    <div className={styles.field}><label>Project Title *</label><input className={styles.input} value={p.title} onChange={e=>{const arr=[...projects];arr[i]={...arr[i],title:e.target.value};setProjects(arr)}} placeholder="e.g. Seating Plan Generator"/></div>
                    <div className={styles.field}><label>Link <span className={styles.optional}>(GitHub / Live)</span></label><input className={styles.input} value={p.link} onChange={e=>{const arr=[...projects];arr[i]={...arr[i],link:e.target.value};setProjects(arr)}} placeholder="https://..."/></div>
                    <div className={styles.field}><label>Start Date</label><input className={styles.input} type="month" value={p.startDate} onChange={e=>{const arr=[...projects];arr[i]={...arr[i],startDate:e.target.value};setProjects(arr)}}/></div>
                    <div className={styles.field}><label>End Date</label><input className={styles.input} type="month" value={p.endDate} onChange={e=>{const arr=[...projects];arr[i]={...arr[i],endDate:e.target.value};setProjects(arr)}}/></div>
                  </div>
                  <div className={styles.field}><label>Brief Description *</label><textarea className={styles.textarea} value={p.description} onChange={e=>{const arr=[...projects];arr[i]={...arr[i],description:e.target.value};setProjects(arr)}} rows={3} placeholder="What did you build? What technologies? What was the impact?"/></div>
                </div>
              ))}
              <button className={styles.addRowBtn} onClick={()=>setProjects(p=>[...p,{...EMPTY_PROJECT}])}>+ Add Project</button>
            </div>
          )}

          {/* ── STEP 4: WORK EXPERIENCE ── */}
          {step === 4 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}><span className={styles.stepHeaderIcon}>💼</span><div><h2>Work Experience</h2><p>Internships, part-time, freelance</p></div></div>
              {!work.length && <div className={styles.emptyStep}>No work experience added. Click below to add.</div>}
              {work.map((w, i) => (
                <div key={i} className={styles.repeaterCard}>
                  <div className={styles.repeaterTop}><span className={styles.repeaterNum}>Experience {i+1}</span><button className={styles.removeRepeaterBtn} onClick={()=>setWork(arr=>arr.filter((_,j)=>j!==i))}>Remove</button></div>
                  <div className={styles.grid2}>
                    <div className={styles.field}><label>Company / Organisation</label><input className={styles.input} value={w.company} onChange={e=>{const arr=[...work];arr[i]={...arr[i],company:e.target.value};setWork(arr)}} placeholder="Company name"/></div>
                    <div className={styles.field}><label>Role / Title</label><input className={styles.input} value={w.role} onChange={e=>{const arr=[...work];arr[i]={...arr[i],role:e.target.value};setWork(arr)}} placeholder="e.g. Frontend Intern"/></div>
                    <div className={styles.field}><label>Start Date</label><input className={styles.input} type="month" value={w.startDate} onChange={e=>{const arr=[...work];arr[i]={...arr[i],startDate:e.target.value};setWork(arr)}}/></div>
                    <div className={styles.field}><label>End Date</label><input className={styles.input} type="month" value={w.endDate} onChange={e=>{const arr=[...work];arr[i]={...arr[i],endDate:e.target.value};setWork(arr)}}/></div>
                  </div>
                  <div className={styles.field}><label>Description</label><textarea className={styles.textarea} value={w.description} onChange={e=>{const arr=[...work];arr[i]={...arr[i],description:e.target.value};setWork(arr)}} rows={3} placeholder="What did you do? Key contributions and skills used"/></div>
                </div>
              ))}
              <button className={styles.addRowBtn} onClick={()=>setWork(w=>[...w,{...EMPTY_WORK}])}>+ Add Experience</button>
            </div>
          )}

          {/* ── STEP 5: ACHIEVEMENTS ── */}
          {step === 5 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}><span className={styles.stepHeaderIcon}>🏆</span><div><h2>Achievements & Certifications</h2><p>Awards, certifications, competitions</p></div></div>
              {!achieve.length && <div className={styles.emptyStep}>No achievements added yet. Click below.</div>}
              {achieve.map((a, i) => (
                <div key={i} className={styles.repeaterCard}>
                  <div className={styles.repeaterTop}><span className={styles.repeaterNum}>Achievement {i+1}</span><button className={styles.removeRepeaterBtn} onClick={()=>setAchieve(arr=>arr.filter((_,j)=>j!==i))}>Remove</button></div>
                  <div className={styles.grid2}>
                    <div className={styles.field}><label>Title *</label><input className={styles.input} value={a.title} onChange={e=>{const arr=[...achieve];arr[i]={...arr[i],title:e.target.value};setAchieve(arr)}} placeholder="e.g. NPTEL Certification"/></div>
                    <div className={styles.field}><label>Issued by</label><input className={styles.input} value={a.issuer} onChange={e=>{const arr=[...achieve];arr[i]={...arr[i],issuer:e.target.value};setAchieve(arr)}} placeholder="e.g. IIT, Coursera"/></div>
                    <div className={styles.field}><label>Date</label><input className={styles.input} type="month" value={a.date} onChange={e=>{const arr=[...achieve];arr[i]={...arr[i],date:e.target.value};setAchieve(arr)}}/></div>
                  </div>
                  <div className={styles.field}><label>Description</label><textarea className={styles.textarea} value={a.description} onChange={e=>{const arr=[...achieve];arr[i]={...arr[i],description:e.target.value};setAchieve(arr)}} rows={2} placeholder="Brief description of what you achieved or learned"/></div>
                </div>
              ))}
              <button className={styles.addRowBtn} onClick={()=>setAchieve(a=>[...a,{...EMPTY_ACHIEVE}])}>+ Add Achievement</button>
            </div>
          )}

          {/* ── STEP 6: PREVIEW ── */}
          {step === 6 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}><span className={styles.stepHeaderIcon}>✉️</span><div><h2>Preview & Submit</h2><p>Review your CV before sending for verification</p></div></div>
              <CVPreview data={{ ...personal, ...education, technicalSkills: skills.technicalSkills, softSkills: skills.softSkills, projects, workExperience: work, achievements: achieve, graduationCourse: user?.courseName, currentSemester: currentSem, batch: user?.batch }} isVerifiedResubmit={isVerifiedResubmit}/>
              <div className={styles.submitRow}>
                {isVerifiedResubmit && (
                  <div className={styles.resubmitNotice}>ℹ️ Your current verified CV stays active. This update will be reviewed by coordinator. Old status preserved until reviewed.</div>
                )}
                <button className={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>
                  {submitting ? '...' : isVerifiedResubmit ? '🔄 Submit for Re-verification' : '✉️ Submit for Verification'}
                </button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className={styles.navRow}>
            {step > 0 && <button className={styles.prevBtn} onClick={()=>setStep(s=>s-1)}>← Previous</button>}
            {step < STEPS.length - 1 && <button className={styles.nextBtn} onClick={()=>setStep(s=>s+1)}>Next →</button>}
          </div>
        </main>
      </div>
    </div>
  );
}

// ── CV Preview Component ──────────────────────────────────────────
function CVPreview({ data, isVerifiedResubmit }) {
  const fmtDate = (d) => { if (!d) return ''; const [y,m] = d.split('-'); const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${months[parseInt(m)-1]} ${y}`; };

  return (
    <div className={styles.cvPreview} id="cv-preview">
      {/* CV Header */}
      <div className={styles.cvHeader}>
        {data.photo && <img src={data.photo} alt="" className={styles.cvPhoto}/>}
        <div className={styles.cvHeaderInfo}>
          <h1 className={styles.cvName}>{data.name}</h1>
          <div className={styles.cvContacts}>
            {data.email && <span>✉ {data.email}</span>}
            {data.phone && <span>📞 {data.phone}</span>}
            {data.linkedin && <span>in {data.linkedin}</span>}
            {data.github && <span>⌥ {data.github}</span>}
            {data.leetcode && <span>⚡ {data.leetcode}</span>}
            {data.otherLinks?.map((l,i)=><span key={i}>🔗 {l.label}: {l.url}</span>)}
          </div>
          {(data.altEmail||data.altPhone) && (
            <div className={styles.cvContacts} style={{marginTop:4}}>
              {data.altEmail && <span>✉ {data.altEmail} (alt)</span>}
              {data.altPhone && <span>📞 {data.altPhone} (alt)</span>}
            </div>
          )}
        </div>
      </div>

      {/* Education */}
      <div className={styles.cvSection}>
        <div className={styles.cvSectionTitle}>EDUCATION</div>
        {data.twelfthSchool && (
          <div className={styles.cvEducRow}>
            <div><strong>12th — {data.twelfthBoard}</strong><br/><span>{data.twelfthSchool}</span></div>
            <div className={styles.cvRight}><span>{data.twelfthPercent}</span><br/><span>{data.twelfthYear}</span></div>
          </div>
        )}
        {data.tenthSchool && (
          <div className={styles.cvEducRow}>
            <div><strong>10th — {data.tenthBoard}</strong><br/><span>{data.tenthSchool}</span></div>
            <div className={styles.cvRight}><span>{data.tenthPercent}</span><br/><span>{data.tenthYear}</span></div>
          </div>
        )}
        {data.graduationCourse && (
          <div className={styles.cvEducRow}>
            <div><strong>{data.graduationCourse}</strong><br/><span>Batch {data.batch} · Semester {data.currentSemester}</span></div>
            <div className={styles.cvRight}>{data.overallCgpa && <span>CGPA: {data.overallCgpa}</span>}</div>
          </div>
        )}
      </div>

      {/* Skills */}
      {(data.technicalSkills?.length>0||data.softSkills?.length>0) && (
        <div className={styles.cvSection}>
          <div className={styles.cvSectionTitle}>SKILLS</div>
          {data.technicalSkills?.length>0 && <div className={styles.cvSkillRow}><strong>Technical: </strong>{data.technicalSkills.join(', ')}</div>}
          {data.softSkills?.length>0 && <div className={styles.cvSkillRow}><strong>Soft Skills: </strong>{data.softSkills.join(', ')}</div>}
        </div>
      )}

      {/* Work */}
      {data.workExperience?.length>0 && (
        <div className={styles.cvSection}>
          <div className={styles.cvSectionTitle}>WORK EXPERIENCE</div>
          {data.workExperience.map((w,i)=>(
            <div key={i} className={styles.cvEntry}>
              <div className={styles.cvEntryTop}><strong>{w.role}</strong><span>{fmtDate(w.startDate)} — {fmtDate(w.endDate)||'Present'}</span></div>
              <div className={styles.cvEntryOrg}>{w.company}</div>
              {w.description && <p className={styles.cvEntryDesc}>{w.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Achievements */}
      {data.achievements?.length>0 && (
        <div className={styles.cvSection}>
          <div className={styles.cvSectionTitle}>ACHIEVEMENTS & CERTIFICATIONS</div>
          {data.achievements.map((a,i)=>(
            <div key={i} className={styles.cvEntry}>
              <div className={styles.cvEntryTop}><strong>{a.title}</strong>{a.date&&<span>{fmtDate(a.date)}</span>}</div>
              {a.issuer && <div className={styles.cvEntryOrg}>{a.issuer}</div>}
              {a.description && <p className={styles.cvEntryDesc}>{a.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {data.projects?.filter(p=>p.title).length>0 && (
        <div className={styles.cvSection}>
          <div className={styles.cvSectionTitle}>PROJECTS</div>
          {data.projects.filter(p=>p.title).map((p,i)=>(
            <div key={i} className={styles.cvEntry}>
              <div className={styles.cvEntryTop}><strong>{p.title}</strong>{(p.startDate||p.endDate)&&<span>{fmtDate(p.startDate)}{p.endDate&&` — ${fmtDate(p.endDate)}`}</span>}</div>
              {p.link && <div className={styles.cvEntryOrg}>{p.link}</div>}
              {p.description && <p className={styles.cvEntryDesc}>{p.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { CVPreview };
