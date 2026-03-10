import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { courseAPI } from '../utils/api';
import styles from './ChairpersonDashboard.module.css';

const BLANK_COORD = { name: '', email: '', subject: '' };

const BLANK_COURSE = {
  name: '', code: '', durationYears: 1, durationLabel: '',
  totalBatches: 1, currentBatch: '', totalSeats: 0,
  description: '', type: 'fulltime', coordinators: [],
};

const TYPE_LABELS = { fulltime: 'Full Time', parttime: 'Part Time', online: 'Online', hybrid: 'Hybrid' };

export default function ChairpersonDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [form, setForm] = useState(BLANK_COURSE);
  const [coordForm, setCoordForm] = useState(BLANK_COORD);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedCourse, setExpandedCourse] = useState(null);

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await courseAPI.getAll();
      setCourses(res.data.courses);
    } catch (err) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditCourse(null);
    setForm(BLANK_COURSE);
    setCoordForm(BLANK_COORD);
    setShowModal(true);
  };

  const openEdit = (course) => {
    setEditCourse(course);
    setForm({
      name: course.name, code: course.code || '',
      durationYears: course.duration?.years || 1,
      durationLabel: course.duration?.label || '',
      totalBatches: course.totalBatches, currentBatch: course.currentBatch || '',
      totalSeats: course.totalSeats, description: course.description || '',
      type: course.type || 'fulltime',
      coordinators: course.coordinators || [],
    });
    setCoordForm(BLANK_COORD);
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const addCoord = () => {
    if (!coordForm.name.trim() && !coordForm.email.trim()) return;
    setForm(f => ({ ...f, coordinators: [...f.coordinators, { ...coordForm }] }));
    setCoordForm(BLANK_COORD);
  };

  const removeCoord = (idx) => {
    setForm(f => ({ ...f, coordinators: f.coordinators.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const payload = {
        ...form,
        durationLabel: form.durationLabel || `${form.durationYears} Year${form.durationYears > 1 ? 's' : ''}`,
      };
      if (editCourse) {
        await courseAPI.update(editCourse._id, payload);
        toast.success('Course updated!');
      } else {
        await courseAPI.create(payload);
        toast.success('Course created! Coordinators registered.');
      }
      setShowModal(false);
      fetchCourses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save course');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await courseAPI.delete(deleteConfirm._id);
      toast.success('Course deleted');
      setDeleteConfirm(null);
      fetchCourses();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

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
              <p className={styles.greeting}>Chairperson Dashboard</p>
              <h1 className={styles.title}>{user?.name}</h1>
              {user?.departmentCode && <p className={styles.deptTag}>Department: {user.departmentCode}</p>}
            </div>
          </div>
          <button className={styles.addBtn} onClick={openCreate}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="15">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
            </svg>
            Add Course
          </button>
        </div>

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}><div className={styles.statVal}>{courses.length}</div><div className={styles.statLabel}>Total Courses</div></div>
          <div className={styles.statCard}><div className={styles.statVal}>{courses.filter(c => c.isActive).length}</div><div className={styles.statLabel}>Active Courses</div></div>
          <div className={styles.statCard}><div className={styles.statVal}>{courses.reduce((a, c) => a + (c.coordinators?.length || 0), 0)}</div><div className={styles.statLabel}>Coordinators</div></div>
          <div className={styles.statCard}><div className={styles.statVal}>{courses.reduce((a, c) => a + (c.totalSeats || 0), 0)}</div><div className={styles.statLabel}>Total Seats</div></div>
        </div>

        {/* Courses */}
        {loading ? (
          <div className={styles.loading}><span className="spinner" style={{width:28,height:28}} /><span>Loading courses...</span></div>
        ) : courses.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📚</div>
            <h3>No Courses Yet</h3>
            <p>Add your first course with duration, batches, and coordinator details.</p>
            <button className={styles.addBtn} onClick={openCreate}>Create First Course</button>
          </div>
        ) : (
          <div className={styles.courseGrid}>
            {courses.map((course, i) => (
              <div key={course._id} className={styles.courseCard} style={{animationDelay:`${i*0.05}s`}}>
                <div className={styles.courseTop}>
                  <div className={styles.courseMeta}>
                    {course.code && <span className={styles.courseCode}>{course.code}</span>}
                    <span className={`${styles.courseType} ${styles[course.type]}`}>{TYPE_LABELS[course.type]}</span>
                  </div>
                  <div className={styles.courseActions}>
                    <button className={styles.editBtn} onClick={() => openEdit(course)}>
                      <svg viewBox="0 0 20 20" fill="currentColor" width="13"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                    </button>
                    <button className={styles.deleteBtn} onClick={() => setDeleteConfirm(course)}>
                      <svg viewBox="0 0 20 20" fill="currentColor" width="13"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                    </button>
                  </div>
                </div>

                <h3 className={styles.courseName}>{course.name}</h3>
                {course.description && <p className={styles.courseDesc}>{course.description}</p>}

                {/* Course details grid */}
                <div className={styles.detailsGrid}>
                  <div className={styles.detail}>
                    <span className={styles.detailLabel}>Duration</span>
                    <span className={styles.detailVal}>{course.duration?.label || `${course.duration?.years}Y`}</span>
                  </div>
                  <div className={styles.detail}>
                    <span className={styles.detailLabel}>Batches</span>
                    <span className={styles.detailVal}>{course.totalBatches}</span>
                  </div>
                  <div className={styles.detail}>
                    <span className={styles.detailLabel}>Current Batch</span>
                    <span className={styles.detailVal}>{course.currentBatch || '—'}</span>
                  </div>
                  <div className={styles.detail}>
                    <span className={styles.detailLabel}>Seats</span>
                    <span className={styles.detailVal}>{course.totalSeats || '—'}</span>
                  </div>
                </div>

                {/* Coordinators toggle */}
                {course.coordinators?.length > 0 && (
                  <div className={styles.coordSection}>
                    <button
                      className={styles.coordToggle}
                      onClick={() => setExpandedCourse(expandedCourse === course._id ? null : course._id)}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" width="12"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                      {course.coordinators.length} Coordinator{course.coordinators.length !== 1 ? 's' : ''}
                      <svg viewBox="0 0 20 20" fill="currentColor" width="12" style={{transform: expandedCourse === course._id ? 'rotate(180deg)' : 'none', transition:'transform 0.2s'}}><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                    </button>
                    {expandedCourse === course._id && (
                      <div className={styles.coordList}>
                        {course.coordinators.map((c, i) => (
                          <div key={i} className={styles.coordItem}>
                            <div className={styles.coordAvatar}>{(c.name || 'C').charAt(0)}</div>
                            <div>
                              <div className={styles.coordName}>{c.name}</div>
                              <div className={styles.coordEmail}>{c.email}</div>
                              {c.subject && <div className={styles.coordSubject}>{c.subject}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Course Modal ── */}
      {showModal && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>{editCourse ? 'Edit Course' : 'Add New Course'}</h2>
                <p className={styles.modalSub}>Fill in course details — these will appear in student registration dropdowns</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="17"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalForm}>

              {/* Course Info */}
              <div className={styles.section}>
                <div className={styles.sectionTitle}><span className={styles.dot}/> Course Information</div>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Course Name *</label>
                    <input className={styles.input} name="name" value={form.name} onChange={handleChange} placeholder="e.g. B.Tech Computer Science" required />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Course Code</label>
                    <input className={styles.input} name="code" value={form.code} onChange={handleChange} placeholder="e.g. BTCS" />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Description</label>
                  <textarea className={styles.textarea} name="description" value={form.description} onChange={handleChange} placeholder="Brief description of this course..." rows={2} />
                </div>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Course Type</label>
                    <select className={styles.input} name="type" value={form.type} onChange={handleChange}>
                      <option value="fulltime">Full Time</option>
                      <option value="parttime">Part Time</option>
                      <option value="online">Online</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Duration Label</label>
                    <input className={styles.input} name="durationLabel" value={form.durationLabel} onChange={handleChange} placeholder="e.g. 3 Years, 6 Months" />
                  </div>
                </div>
              </div>

              {/* Batch Info */}
              <div className={styles.section}>
                <div className={styles.sectionTitle}><span className={styles.dot} style={{background:'var(--gold)'}}/> Batch Information</div>
                <div className={styles.row3}>
                  <div className={styles.field}>
                    <label className={styles.label}>Duration (Years)</label>
                    <input className={styles.input} name="durationYears" type="number" min="1" max="10" value={form.durationYears} onChange={handleChange} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Total Batches Running</label>
                    <input className={styles.input} name="totalBatches" type="number" min="1" value={form.totalBatches} onChange={handleChange} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Total Seats</label>
                    <input className={styles.input} name="totalSeats" type="number" min="0" value={form.totalSeats} onChange={handleChange} />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Current Batch / Session</label>
                  <input className={styles.input} name="currentBatch" value={form.currentBatch} onChange={handleChange} placeholder="e.g. 2024-25, Batch 7" />
                </div>
              </div>

              {/* Coordinators */}
              <div className={styles.section}>
                <div className={styles.sectionTitle}><span className={styles.dot} style={{background:'var(--success)'}}/> Coordinators <span className={styles.countBadge}>{form.coordinators.length}</span></div>
                <div className={styles.coordNotice}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="12"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                  Coordinators will be registered and can login with Google using their email.
                </div>
                <div className={styles.coordAddBox}>
                  <div className={styles.row3}>
                    <div className={styles.field}>
                      <label className={styles.label}>Name</label>
                      <input className={styles.input} value={coordForm.name} onChange={e => setCoordForm(f => ({...f, name: e.target.value}))} placeholder="Coordinator name" />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Email</label>
                      <input className={styles.input} type="email" value={coordForm.email} onChange={e => setCoordForm(f => ({...f, email: e.target.value}))} placeholder="coordinator@edu" />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Subject / Role</label>
                      <input className={styles.input} value={coordForm.subject} onChange={e => setCoordForm(f => ({...f, subject: e.target.value}))} placeholder="e.g. Placement Coordinator" />
                    </div>
                  </div>
                  <button type="button" className={styles.addCoordBtn} onClick={addCoord} disabled={!coordForm.name.trim() && !coordForm.email.trim()}>
                    + Add Coordinator
                  </button>
                </div>
                {form.coordinators.length > 0 && (
                  <div className={styles.coordAdded}>
                    {form.coordinators.map((c, i) => (
                      <div key={i} className={styles.coordTag}>
                        <div className={styles.coordTagAvatar}>{(c.name||'C').charAt(0)}</div>
                        <div className={styles.coordTagInfo}>
                          <div className={styles.coordTagName}>{c.name}</div>
                          <div className={styles.coordTagEmail}>{c.email}</div>
                          {c.subject && <div className={styles.coordTagSubject}>{c.subject}</div>}
                        </div>
                        <button type="button" className={styles.removeCoord} onClick={() => removeCoord(i)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={submitLoading}>
                  {submitLoading ? <><span className="spinner" style={{width:15,height:15}}/> Saving...</> : editCourse ? 'Update Course' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className={styles.overlay} onClick={() => setDeleteConfirm(null)}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmIcon}>⚠</div>
            <h3 className={styles.confirmTitle}>Delete Course?</h3>
            <p className={styles.confirmMsg}>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className={styles.dangerBtn} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
