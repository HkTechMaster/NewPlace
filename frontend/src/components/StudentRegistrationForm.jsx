import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import styles from './StudentRegistrationForm.module.css';

export default function StudentRegistrationForm({ googleUser, onSuccess, onBack }) {
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loadingFaculties, setLoadingFaculties] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(googleUser?.googleAvatar || '');
  const [photoBase64, setPhotoBase64] = useState('');
  const fileRef = useRef();

  const [form, setForm] = useState({
    name: googleUser?.googleName || '',
    email: '',
    phone: '',
    skillFacultyId: '',
    courseId: '',
    batch: '',
    semester: '',
    enrollmentNo: '',
  });

  // Load faculties on mount — use public route (no auth needed)
  useEffect(() => {
    axios.get('/skill-faculties/public').then(res => {
      setFaculties(res.data.faculties || []);
    }).catch(() => toast.error('Failed to load faculties')).finally(() => setLoadingFaculties(false));
  }, []);

  // Load courses when faculty changes — use public route
  useEffect(() => {
    if (!form.skillFacultyId) { setCourses([]); return; }
    setLoadingCourses(true);
    axios.get(`/courses/public?facultyId=${form.skillFacultyId}`).then(res => {
      setCourses(res.data.courses || []);
    }).catch(() => toast.error('Failed to load courses')).finally(() => setLoadingCourses(false));
  }, [form.skillFacultyId]);

  const selectedCourse = courses.find(c => c._id === form.courseId);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value, ...(name === 'skillFacultyId' ? { courseId: '', batch: '', semester: '' } : {}) }));
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Photo must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
      setPhotoBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.skillFacultyId || !form.courseId || !form.batch || !form.semester) {
      toast.error('Please fill all required fields'); return;
    }
    setSubmitting(true);
    try {
      await axios.post('/students/register', {
        ...googleUser,
        ...form,
        semester: parseInt(form.semester),
        photo: photoBase64,
      });
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Generate batch options from course
  const batchOptions = [];
  if (selectedCourse) {
    const currentYear = new Date().getFullYear();
    const dur = selectedCourse.duration?.years || 1;
    for (let i = 0; i < 4; i++) {
      const start = currentYear - i;
      batchOptions.push(`${start}-${start + dur}`);
    }
  }

  // Generate semester options from course duration
  const semesterCount = selectedCourse ? (selectedCourse.duration?.years || 1) * 2 : 8;
  const semesterOptions = Array.from({ length: semesterCount }, (_, i) => i + 1);

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden="true" />

      <div className={styles.wrapper}>
        {/* Header */}
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
            <h1 className={styles.title}>Student Registration</h1>
            <p className={styles.sub}>Complete your profile to get access. Your coordinator will review and approve.</p>
          </div>

          {/* Google account strip */}
          <div className={styles.googleStrip}>
            <img src={googleUser?.googleAvatar} alt="" className={styles.gAvatar} onError={e => e.target.style.display='none'} />
            <div>
              <div className={styles.gName}>{googleUser?.googleName}</div>
              <div className={styles.gEmail}>Signing in as: {googleUser?.googleEmail}</div>
            </div>
            <span className={styles.gBadge}>✓ Verified</span>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>

            {/* Photo upload */}
            <div className={styles.photoSection}>
              <div className={styles.photoWrap} onClick={() => fileRef.current?.click()}>
                {photoPreview
                  ? <img src={photoPreview} alt="Photo" className={styles.photoImg} />
                  : <div className={styles.photoPlaceholder}>
                      <svg viewBox="0 0 20 20" fill="currentColor" width="28"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                    </div>
                }
                <div className={styles.photoOverlay}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="18"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>
                  Upload
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
              <div className={styles.photoHint}>Click to upload photo<br/><span>Max 2MB · JPG, PNG</span></div>
            </div>

            {/* Personal Info */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}><span className={styles.dot}/> Personal Information</div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Full Name *</label>
                  <input className={styles.input} name="name" value={form.name} onChange={handleChange} placeholder="Your full name" required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Registration Email *</label>
                  <input className={styles.input} name="email" type="email" value={form.email} onChange={handleChange} placeholder="your@email.com" required />
                  <span className={styles.hint}>This email will be used to login after approval</span>
                </div>
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Phone Number *</label>
                  <input className={styles.input} name="phone" value={form.phone} onChange={handleChange} placeholder="+91 99999 99999" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Enrollment / Roll No.</label>
                  <input className={styles.input} name="enrollmentNo" value={form.enrollmentNo} onChange={handleChange} placeholder="e.g. 2024CSE001" />
                </div>
              </div>
            </div>

            {/* Academic Info */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}><span className={styles.dot} style={{background:'var(--gold)'}}/> Academic Information</div>
              <div className={styles.field}>
                <label className={styles.label}>Skill Faculty *</label>
                {loadingFaculties
                  ? <div className={styles.inputLoading}>Loading faculties...</div>
                  : <select className={styles.input} name="skillFacultyId" value={form.skillFacultyId} onChange={handleChange} required>
                      <option value="">— Select Skill Faculty —</option>
                      {faculties.map(f => <option key={f._id} value={f._id}>{f.code} — {f.name}</option>)}
                    </select>
                }
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Course *</label>
                {!form.skillFacultyId
                  ? <div className={styles.inputDisabled}>Select a Skill Faculty first</div>
                  : loadingCourses
                  ? <div className={styles.inputLoading}>Loading courses...</div>
                  : courses.length === 0
                  ? <div className={styles.inputDisabled}>No courses available for this faculty</div>
                  : <select className={styles.input} name="courseId" value={form.courseId} onChange={handleChange} required>
                      <option value="">— Select Course —</option>
                      {courses.map(c => <option key={c._id} value={c._id}>{c.code ? `${c.code} — ` : ''}{c.name} ({c.duration?.label})</option>)}
                    </select>
                }
              </div>

              {selectedCourse && (
                <div className={styles.courseInfo}>
                  <div className={styles.courseInfoItem}><span>Type</span><strong>{selectedCourse.type}</strong></div>
                  <div className={styles.courseInfoItem}><span>Duration</span><strong>{selectedCourse.duration?.label}</strong></div>
                  <div className={styles.courseInfoItem}><span>Total Seats</span><strong>{selectedCourse.totalSeats || '—'}</strong></div>
                </div>
              )}

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Batch *</label>
                  {!form.courseId
                    ? <div className={styles.inputDisabled}>Select a Course first</div>
                    : <select className={styles.input} name="batch" value={form.batch} onChange={handleChange} required>
                        <option value="">— Select Batch —</option>
                        {batchOptions.map(b => <option key={b} value={b}>{b}</option>)}
                        <option value="custom">Other (type below)</option>
                      </select>
                  }
                  {form.batch === 'custom' && (
                    <input className={styles.input} style={{marginTop:8}} name="batch" onChange={e => setForm(f=>({...f,batch:e.target.value}))} placeholder="e.g. 2023-2027" />
                  )}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Current Semester *</label>
                  {!form.courseId
                    ? <div className={styles.inputDisabled}>Select a Course first</div>
                    : <select className={styles.input} name="semester" value={form.semester} onChange={handleChange} required>
                        <option value="">— Select Semester —</option>
                        {semesterOptions.map(s => <option key={s} value={s}>Semester {s}</option>)}
                      </select>
                  }
                </div>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting
                ? <><span className="spinner" style={{width:16,height:16}}/> Submitting...</>
                : '→ Submit Registration Request'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
