import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import styles from './StudentRegistrationForm.module.css';

export default function StudentRegistrationForm({ googleUser, onSuccess, onBack }) {
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingFaculties, setLoadingFaculties] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(googleUser?.googleAvatar || '');
  const [photoBase64, setPhotoBase64] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileRef = useRef();

  const [form, setForm] = useState({
    name: googleUser?.googleName || '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    skillFacultyId: '',
    courseId: '',
    departmentCode: '',
    departmentName: '',
    batch: '',
    semester: '',
    enrollmentNo: '',
  });

  useEffect(() => {
    axios.get('/skill-faculties/public')
      .then(res => setFaculties(res.data.faculties || []))
      .catch(() => toast.error('Failed to load faculties'))
      .finally(() => setLoadingFaculties(false));
  }, []);

  useEffect(() => {
    if (!form.skillFacultyId) { setCourses([]); setDepartments([]); return; }
    setLoadingCourses(true);
    setLoadingDepts(true);
    Promise.all([
      axios.get(`/courses/public?facultyId=${form.skillFacultyId}`),
      axios.get(`/departments/public/${form.skillFacultyId}`),
    ]).then(([courseRes, deptRes]) => {
      setCourses(courseRes.data.courses || []);
      setDepartments(deptRes.data.departments || []);
    }).catch(() => toast.error('Failed to load courses'))
      .finally(() => { setLoadingCourses(false); setLoadingDepts(false); });
  }, [form.skillFacultyId]);

  const selectedCourse = courses.find(c => c._id === form.courseId);
  const dur = selectedCourse?.duration?.years || 1;
  const currentYear = new Date().getFullYear();
  const batchOptions = Array.from({ length: 4 }, (_, i) => { const s = currentYear - i; return `${s}-${s + dur}`; });
  const semCount = (selectedCourse?.duration?.years || 1) * 2;
  const semOptions = Array.from({ length: semCount }, (_, i) => i + 1);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({
      ...f, [name]: value,
      ...(name === 'skillFacultyId' ? { courseId: '', departmentCode: '', departmentName: '', batch: '', semester: '' } : {}),
      ...(name === 'courseId' ? { batch: '', semester: '' } : {}),
    }));
  };

  const handleDeptChange = (e) => {
    const dept = departments.find(d => d.code === e.target.value || d.name === e.target.value);
    setForm(f => ({ ...f, departmentCode: dept?.code || '', departmentName: dept?.name || '' }));
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Photo max 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setPhotoPreview(reader.result); setPhotoBase64(reader.result); };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.skillFacultyId || !form.courseId || !form.batch || !form.semester) {
      toast.error('Please fill all required fields'); return;
    }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSubmitting(true);
    try {
      await axios.post('/student-auth/register', {
        ...(googleUser || {}),
        name: form.name, email: form.email, phone: form.phone,
        password: form.password,
        skillFacultyId: form.skillFacultyId, courseId: form.courseId,
        departmentCode: form.departmentCode, departmentName: form.departmentName,
        batch: form.batch, semester: parseInt(form.semester),
        enrollmentNo: form.enrollmentNo,
        photo: photoBase64,
      });
      onSuccess();
    } catch (err) { toast.error(err.response?.data?.message || 'Registration failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onBack}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"/></svg>
            Back
          </button>
          <div className={styles.brand}>
            <svg viewBox="0 0 40 40" fill="none" width="28"><polygon points="20,2 38,11 38,29 20,38 2,29 2,11" stroke="#3b82f6" strokeWidth="2" fill="none"/><circle cx="20" cy="20" r="5" fill="#3b82f6"/></svg>
            <span className={styles.brandName}>PlacePro</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h1 className={styles.title}>Create Student Account</h1>
            <p className={styles.sub}>Complete your profile. Your coordinator will review and approve.</p>
          </div>

          {googleUser && (
            <div className={styles.googleStrip}>
              <img src={googleUser.googleAvatar} alt="" className={styles.gAvatar} onError={e => e.target.style.display='none'}/>
              <div><div className={styles.gName}>{googleUser.googleName}</div><div className={styles.gEmail}>Google: {googleUser.googleEmail}</div></div>
              <span className={styles.gBadge}>✓ Verified</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Photo */}
            <div className={styles.photoSection}>
              <div className={styles.photoWrap} onClick={() => fileRef.current?.click()}>
                {photoPreview ? <img src={photoPreview} alt="" className={styles.photoImg}/> : <div className={styles.photoPlaceholder}><span>📷</span><span>Upload</span></div>}
                <div className={styles.photoOverlay}>Change</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}}/>
              <div className={styles.photoHint}><strong>Profile Photo</strong><span>JPG or PNG · Max 2MB</span></div>
            </div>

            {/* Personal Info */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}><span className={styles.dot}/> Personal Information</div>
              <div className={styles.row2}>
                <div className={styles.field}><label className={styles.label}>Full Name *</label><input className={styles.input} name="name" value={form.name} onChange={handleChange} placeholder="Your full name" required/></div>
                <div className={styles.field}><label className={styles.label}>Registration Email *</label><input className={styles.input} name="email" type="email" value={form.email} onChange={handleChange} placeholder="your@email.com" required/><span className={styles.hint}>Used to login after approval</span></div>
                <div className={styles.field}><label className={styles.label}>Phone Number</label><input className={styles.input} name="phone" value={form.phone} onChange={handleChange} placeholder="+91 99999 99999"/></div>
                <div className={styles.field}><label className={styles.label}>Enrollment / Roll No.</label><input className={styles.input} name="enrollmentNo" value={form.enrollmentNo} onChange={handleChange} placeholder="e.g. 2024CSE001"/></div>
              </div>
              {/* Password */}
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Create Password * <span className={styles.hint}>(min 6 characters)</span></label>
                  <div className={styles.passWrap}>
                    <input className={styles.input} name="password" type={showPass?'text':'password'} value={form.password} onChange={handleChange} placeholder="Create a password" required/>
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(p=>!p)}>{showPass?'🙈':'👁'}</button>
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Confirm Password *</label>
                  <div className={styles.passWrap}>
                    <input className={styles.input} name="confirmPassword" type={showConfirm?'text':'password'} value={form.confirmPassword} onChange={handleChange} placeholder="Repeat your password" required/>
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(p=>!p)}>{showConfirm?'🙈':'👁'}</button>
                  </div>
                  {form.confirmPassword && form.password !== form.confirmPassword && <span className={styles.errorHint}>Passwords don't match</span>}
                  {form.confirmPassword && form.password === form.confirmPassword && <span className={styles.successHint}>✓ Passwords match</span>}
                </div>
              </div>
            </div>

            {/* Academic Info */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}><span className={styles.dot} style={{background:'var(--gold)'}}/> Academic Information</div>
              <div className={styles.field}>
                <label className={styles.label}>Skill Faculty *</label>
                {loadingFaculties ? <div className={styles.inputLoading}>Loading...</div> :
                  <select className={styles.input} name="skillFacultyId" value={form.skillFacultyId} onChange={handleChange} required>
                    <option value="">— Select Skill Faculty —</option>
                    {faculties.map(f => <option key={f._id} value={f._id}>{f.code} — {f.name}</option>)}
                  </select>
                }
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Department</label>
                {!form.skillFacultyId ? <div className={styles.inputDisabled}>Select Skill Faculty first</div> :
                 loadingDepts ? <div className={styles.inputLoading}>Loading departments...</div> :
                 departments.length === 0 ? <div className={styles.inputDisabled}>No departments in this faculty</div> :
                  <select className={styles.input} onChange={handleDeptChange} value={form.departmentCode || form.departmentName || ''}>
                    <option value="">— Select Department (optional) —</option>
                    {departments.map((d, i) => <option key={i} value={d.code || d.name}>{d.name}{d.code ? ` (${d.code})` : ''}</option>)}
                  </select>
                }
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Course *</label>
                {!form.skillFacultyId ? <div className={styles.inputDisabled}>Select Skill Faculty first</div> :
                 loadingCourses ? <div className={styles.inputLoading}>Loading courses...</div> :
                 courses.length === 0 ? <div className={styles.inputDisabled}>No courses in this faculty</div> :
                  <select className={styles.input} name="courseId" value={form.courseId} onChange={handleChange} required>
                    <option value="">— Select Course —</option>
                    {courses.map(c => <option key={c._id} value={c._id}>{c.code ? `${c.code} — ` : ''}{c.name} ({c.duration?.label})</option>)}
                  </select>
                }
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Batch *</label>
                  {!form.courseId ? <div className={styles.inputDisabled}>Select Course first</div> :
                    <select className={styles.input} name="batch" value={form.batch} onChange={handleChange} required>
                      <option value="">— Select Batch —</option>
                      {batchOptions.map(b => <option key={b} value={b}>{b}</option>)}
                      <option value="custom">Other</option>
                    </select>
                  }
                  {form.batch === 'custom' && <input className={styles.input} style={{marginTop:8}} onChange={e=>setForm(f=>({...f,batch:e.target.value}))} placeholder="e.g. 2023-2027"/>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Current Semester *</label>
                  {!form.courseId ? <div className={styles.inputDisabled}>Select Course first</div> :
                    <select className={styles.input} name="semester" value={form.semester} onChange={handleChange} required>
                      <option value="">— Select Semester —</option>
                      {semOptions.map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  }
                </div>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? <><span className="spinner" style={{width:16,height:16}}/> Submitting...</> : '→ Submit Registration Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
