import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import FacultyModal from '../components/FacultyModal';
import { skillFacultyAPI, usersAPI, departmentAPI } from '../utils/api';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [faculties, setFaculties] = useState([]);
  const [stats, setStats] = useState({ totalFaculties: 0, activeFaculties: 0, totalDeans: 0, activeDeans: 0 });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('faculties');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [facRes, statsRes] = await Promise.all([
        skillFacultyAPI.getAll(),
        usersAPI.getStats(),
      ]);
      setFaculties(facRes.data.faculties);
      setStats(statsRes.data.stats);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditData(null);
    setModalOpen(true);
  };

  const handleEdit = (faculty) => {
    setEditData(faculty);
    setModalOpen(true);
  };

  const handleSubmit = async (formData) => {
    setSubmitLoading(true);
    try {
      if (editData) {
        await skillFacultyAPI.update(editData._id, formData);
        toast.success('Skill Faculty updated successfully!');
      } else {
        await skillFacultyAPI.create(formData);
        toast.success('Skill Faculty created! Dean can now login.');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await skillFacultyAPI.delete(id);
      toast.success('Skill Faculty removed');
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const STAT_CARDS = [
    { label: 'Skill Faculties', value: stats.totalFaculties, icon: '⬡', color: 'blue', sub: `${stats.activeFaculties} active` },
    { label: 'Total Deans', value: stats.totalDeans, icon: '◆', color: 'gold', sub: `${stats.activeDeans} active` },
  ];

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>
              Welcome back, <span className={styles.nameHighlight}>{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className={styles.pageSubtitle}>Manage skill faculties and dean accounts across the placement system</p>
          </div>
          <button className={styles.primaryBtn} onClick={handleOpenCreate}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Skill Faculty
          </button>
        </div>

        {/* Stats */}
        <div className={styles.statsRow}>
          {STAT_CARDS.map((s) => (
            <div key={s.label} className={`${styles.statCard} ${styles[s.color]}`}>
              <div className={styles.statIcon}>{s.icon}</div>
              <div>
                <div className={styles.statValue}>{loading ? '—' : s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
                <div className={styles.statSub}>{loading ? '' : s.sub}</div>
              </div>
            </div>
          ))}
          <div className={`${styles.statCard} ${styles.green}`}>
            <div className={styles.statIcon}>◉</div>
            <div>
              <div className={styles.statValue}>{loading ? '—' : faculties.filter(f => f.isActive).length}</div>
              <div className={styles.statLabel}>Active Faculties</div>
              <div className={styles.statSub}>Currently running</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'faculties' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('faculties')}
          >
            Skill Faculties ({faculties.length})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className={styles.loadingState}>
            <span className="spinner" style={{ width: 28, height: 28 }} />
            <span>Loading faculties...</span>
          </div>
        ) : faculties.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⬡</div>
            <h3>No Skill Faculties Yet</h3>
            <p>Create your first skill faculty to get started. Deans will be able to login once their email is added.</p>
            <button className={styles.primaryBtn} onClick={handleOpenCreate}>
              Create First Faculty
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {faculties.map((faculty, i) => (
              <div
                key={faculty._id}
                className={styles.card}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {/* Card header */}
                <div className={styles.cardTop}>
                  <div className={styles.facultyCode}>{faculty.code}</div>
                  <div className={`${styles.statusBadge} ${faculty.isActive ? styles.active : styles.inactive}`}>
                    {faculty.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>

                <h3 className={styles.facultyName}>{faculty.name}</h3>
                {faculty.description && (
                  <p className={styles.facultyDesc}>{faculty.description}</p>
                )}

                {/* Dean info */}
                <div className={styles.deanBox}>
                  <div className={styles.deanLabel}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="12">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Dean
                  </div>
                  <div className={styles.deanName}>{faculty.deanName || 'Not assigned'}</div>
                  {faculty.deanEmail && (
                    <div className={styles.deanEmail}>{faculty.deanEmail}</div>
                  )}
                </div>

                {/* Meta row */}
                <div className={styles.metaRow}>
                  {faculty.establishedYear && (
                    <span className={styles.meta}>Est. {faculty.establishedYear}</span>
                  )}
                  {faculty.totalStudents > 0 && (
                    <span className={styles.meta}>{faculty.totalStudents.toLocaleString()} students</span>
                  )}
                  {faculty.departments?.length > 0 && (
                    <span className={styles.meta}>{faculty.departments.length} dept{faculty.departments.length !== 1 ? 's' : ''}</span>
                  )}
                </div>

                {/* Departments */}
                {faculty.departments?.length > 0 && (
                  <div className={styles.deptRow}>
                    {faculty.departments.slice(0, 3).map((d, i) => (
                      <span key={i} className={styles.deptBadge}>{d.code || d.name}</span>
                    ))}
                    {faculty.departments.length > 3 && (
                      <span className={styles.deptMore}>+{faculty.departments.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className={styles.cardActions}>
                  <button className={styles.editBtn} onClick={() => handleEdit(faculty)}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="13">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Edit
                  </button>
                  <button className={styles.deleteBtn} onClick={() => setDeleteConfirm(faculty)}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="13">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Faculty Modal */}
      <FacultyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        editData={editData}
        loading={submitLoading}
      />

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className={styles.confirmOverlay} onClick={() => setDeleteConfirm(null)}>
          <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmIcon}>⚠</div>
            <h3 className={styles.confirmTitle}>Delete Skill Faculty?</h3>
            <p className={styles.confirmMsg}>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This will also remove dean access for <strong>{deleteConfirm.deanEmail}</strong>.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className={styles.dangerBtn} onClick={() => handleDelete(deleteConfirm._id)}>Delete Faculty</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
