import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import styles from './NotificationBell.module.css';

const TYPE_ICONS = {
  student_applied:  '📥',
  student_withdrew: '↩️',
  list_approved:    '✅',
  list_rejected:    '❌',
  list_submitted:   '📋',
  po_message:       '💬',
  dean_update:      '🏫',
};

const formatTime = (date) => {
  const now  = new Date();
  const d    = new Date(date);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function StaffNotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [open,          setOpen]          = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchNotifications = async () => {
    try {
      // Use same URL pattern as NotificationBell.jsx — no /api/ prefix
      // Your axios instance baseURL already includes /api/
      const res = await axios.get('/staff-notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch { /* silent */ }
  };

  const handleOpen = (notif) => {
    setSelectedNotif(notif);
    if (!notif.isRead) {
      axios.patch(`/staff-notifications/${notif._id}/read`)
        .then(() => {
          setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
          setUnreadCount(prev => Math.max(0, prev - 1));
        })
        .catch(() => {});
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await axios.delete(`/staff-notifications/${id}`);
      setNotifications(prev => {
        const deleted = prev.find(n => n._id === id);
        if (deleted && !deleted.isRead) setUnreadCount(p => Math.max(0, p - 1));
        return prev.filter(n => n._id !== id);
      });
      if (selectedNotif?._id === id) setSelectedNotif(null);
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.patch('/staff-notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { toast.error('Failed'); }
  };

  const unread = notifications.filter(n => !n.isRead);
  const read   = notifications.filter(n =>  n.isRead);

  return (
    <div className={styles.wrapper} ref={dropdownRef}>
      {/* Bell Button */}
      <button className={styles.bellBtn} onClick={() => setOpen(o => !o)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>
              Notifications {unreadCount > 0 && <span className={styles.unreadPill}>{unreadCount} new</span>}
            </span>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={handleMarkAllRead}>Mark all read</button>
            )}
          </div>

          <div className={styles.notifList}>
            {!notifications.length && (
              <div className={styles.empty}>No notifications yet</div>
            )}

            {unread.length > 0 && (
              <>
                <div className={styles.sectionLabel}>Unread</div>
                {unread.map(n => (
                  <div key={n._id} className={`${styles.notifItem} ${styles.unread}`} onClick={() => handleOpen(n)}>
                    <div className={styles.notifIcon}>{TYPE_ICONS[n.type] || '🔔'}</div>
                    <div className={styles.notifContent}>
                      <div className={styles.notifTitle}>{n.title}</div>
                      <div className={styles.notifTime}>{formatTime(n.createdAt)}</div>
                    </div>
                    <div className={styles.notifActions}>
                      <span className={styles.unreadDot} />
                      <button className={styles.deleteBtn} onClick={e => handleDelete(e, n._id)}>🗑</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {read.length > 0 && (
              <>
                <div className={styles.sectionLabel}>Earlier</div>
                {read.map(n => (
                  <div key={n._id} className={`${styles.notifItem} ${styles.readItem}`} onClick={() => handleOpen(n)}>
                    <div className={styles.notifIcon} style={{ opacity: 0.6 }}>{TYPE_ICONS[n.type] || '🔔'}</div>
                    <div className={styles.notifContent}>
                      <div className={styles.notifTitle} style={{ color: 'var(--text-muted)' }}>{n.title}</div>
                      <div className={styles.notifTime}>{formatTime(n.createdAt)}</div>
                    </div>
                    <button className={styles.deleteBtn} onClick={e => handleDelete(e, n._id)}>🗑</button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Message Modal */}
      {selectedNotif && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setSelectedNotif(null)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.5rem' }}>{TYPE_ICONS[selectedNotif.type] || '🔔'}</span>
                <div>
                  <h3 className={styles.modalTitle}>{selectedNotif.title}</h3>
                  <div className={styles.modalTime}>
                    {new Date(selectedNotif.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
              <button className={styles.closeBtn} onClick={() => setSelectedNotif(null)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              {selectedNotif.message.split('\n').map((line, i) => (
                <p key={i} style={{ margin: '4px 0', color: line ? 'var(--text-secondary)' : undefined }}>
                  {line || <br />}
                </p>
              ))}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.deleteModalBtn} onClick={e => { handleDelete(e, selectedNotif._id); setSelectedNotif(null); }}>
                🗑 Delete
              </button>
              <button className={styles.closeModalBtn} onClick={() => setSelectedNotif(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
