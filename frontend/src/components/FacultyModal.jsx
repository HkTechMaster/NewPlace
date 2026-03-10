import React, { useState, useEffect } from 'react';
import styles from './FacultyModal.module.css';

const BLANK_DEPT = { name: '', code: '', chairpersonName: '', chairpersonEmail: '' };

const INITIAL_FORM = {
  code: '',
  name: '',
  description: '',
  deanName: '',
  deanEmail: '',
  departments: [],
};

export default function FacultyModal({ isOpen, onClose, onSubmit, editData, loading }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [deptForm, setDeptForm] = useState(BLANK_DEPT);
  const [expandedDept, setExpandedDept] = useState(null); // index of dept being edited inline

  useEffect(() => {
    if (editData) {
      setForm({
        code: editData.code || '',
        name: editData.name || '',
        description: editData.description || '',
        deanName: editData.deanName || '',
        deanEmail: editData.deanEmail || '',
        departments: editData.departments || [],
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setDeptForm(BLANK_DEPT);
    setExpandedDept(null);
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleDeptFormChange = (e) => {
    const { name, value } = e.target;
    setDeptForm((d) => ({ ...d, [name]: value }));
  };

  const addDept = () => {
    if (!deptForm.name.trim()) return;
    setForm((f) => ({
      ...f,
      departments: [...f.departments, { ...deptForm }],
    }));
    setDeptForm(BLANK_DEPT);
  };

  const removeDept = (idx) => {
    setForm((f) => ({ ...f, departments: f.departments.filter((_, i) => i !== idx) }));
    if (expandedDept === idx) setExpandedDept(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{editData ? 'Edit Skill Faculty' : 'Add Skill Faculty'}</h2>
            <p className={styles.subtitle}>Set up the faculty, assign a dean and add departments with chairpersons</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="18">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>

          {/* ── Section 1: Faculty Info ── */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionDot} />
              Faculty Information
            </div>

            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Faculty Code *</label>
                <input
                  className={styles.input}
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="e.g. SFET"
                  required
                  disabled={!!editData}
                />
                <span className={styles.hint}>e.g. SFET, SFASH, SFMSR</span>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Faculty Name *</label>
                <input
                  className={styles.input}
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Skill Faculty of Engineering & Technology"
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Brief description of this skill faculty..."
                rows={2}
              />
            </div>
          </div>

          {/* ── Section 2: Dean Info ── */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionDot} style={{ background: 'var(--gold)' }} />
              Dean Information
            </div>
            <div className={styles.deanNotice}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="14">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              The dean will be able to login with Google using the email below.
            </div>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Dean Name *</label>
                <input
                  className={styles.input}
                  name="deanName"
                  value={form.deanName}
                  onChange={handleChange}
                  placeholder="Prof. (Dr.) Full Name"
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Dean Email *</label>
                <input
                  className={styles.input}
                  name="deanEmail"
                  type="email"
                  value={form.deanEmail}
                  onChange={handleChange}
                  placeholder="dean@institution.edu"
                  required
                />
              </div>
            </div>
          </div>

          {/* ── Section 3: Departments ── */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionDot} style={{ background: 'var(--success)' }} />
              Departments &amp; Chairpersons
              <span className={styles.sectionCount}>{form.departments.length} added</span>
            </div>

            {/* Add dept form */}
            <div className={styles.deptAddBox}>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Department Name *</label>
                  <input
                    className={styles.input}
                    name="name"
                    value={deptForm.name}
                    onChange={handleDeptFormChange}
                    placeholder="e.g. Computer Science & Engineering"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Department Code</label>
                  <input
                    className={styles.input}
                    name="code"
                    value={deptForm.code}
                    onChange={handleDeptFormChange}
                    placeholder="e.g. CSE"
                  />
                </div>
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Chairperson Name</label>
                  <input
                    className={styles.input}
                    name="chairpersonName"
                    value={deptForm.chairpersonName}
                    onChange={handleDeptFormChange}
                    placeholder="Prof. Full Name"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Chairperson Email</label>
                  <input
                    className={styles.input}
                    name="chairpersonEmail"
                    type="email"
                    value={deptForm.chairpersonEmail}
                    onChange={handleDeptFormChange}
                    placeholder="chair@institution.edu"
                  />
                </div>
              </div>
              <div className={styles.deptAddNotice}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="12">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Chairperson will be able to login with Google using the email above.
              </div>
              <button
                type="button"
                className={styles.addDeptBtn}
                onClick={addDept}
                disabled={!deptForm.name.trim()}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="14">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Department
              </button>
            </div>

            {/* Added departments list */}
            {form.departments.length > 0 && (
              <div className={styles.deptList}>
                {form.departments.map((d, i) => (
                  <div key={i} className={styles.deptCard}>
                    <div className={styles.deptCardTop}>
                      <div className={styles.deptCardLeft}>
                        {d.code && <span className={styles.deptCode}>{d.code}</span>}
                        <span className={styles.deptName}>{d.name}</span>
                      </div>
                      <button type="button" onClick={() => removeDept(i)} className={styles.deptRemove}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="13">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    {(d.chairpersonName || d.chairpersonEmail) && (
                      <div className={styles.deptChair}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="11">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        <span className={styles.deptChairName}>{d.chairpersonName}</span>
                        {d.chairpersonEmail && (
                          <span className={styles.deptChairEmail}>· {d.chairpersonEmail}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving...</>
              ) : (
                editData ? 'Update Faculty' : 'Create Faculty'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
