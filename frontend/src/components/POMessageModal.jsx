import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function POMessageModal({ onClose }) {
  const [chairpersons,   setChairpersons]   = useState([]);
  const [selectedChair,  setSelectedChair]  = useState('');
  const [message,        setMessage]        = useState('');
  const [loading,        setLoading]        = useState(false);
  const [fetchingChairs, setFetchingChairs] = useState(true);
  const [fetchError,     setFetchError]     = useState('');

  useEffect(() => {
    // Same URL pattern as rest of app — no /api/ prefix
    axios.get('/staff-notifications/chairpersons')
      .then(res => {
        setChairpersons(res.data.chairpersons || []);
        if (!res.data.chairpersons?.length) {
          setFetchError('No chairpersons found in your faculty.');
        }
      })
      .catch((e) => {
        setFetchError(e.response?.data?.message || 'Could not load chairpersons');
        toast.error('Could not load chairpersons');
      })
      .finally(() => setFetchingChairs(false));
  }, []);

  const handleSend = async () => {
    if (!selectedChair)   return toast.error('Please select a chairperson');
    if (!message.trim())  return toast.error('Please enter a message');

    setLoading(true);
    try {
      await axios.post('/staff-notifications/po-message', {
        chairpersonId: selectedChair,
        message:       message.trim(),
      });
      toast.success('Message sent successfully!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  // Styles — match PlacePro dark theme using CSS variables
  const s = {
    overlay: {
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24,
    },
    modal: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: 28,
      width: 500, maxWidth: '95vw',
      position: 'relative',
      boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
    },
    header: {
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 20,
    },
    title: {
      fontSize: '1.05rem', fontWeight: 700,
      color: 'var(--text-primary)',
      display: 'flex', alignItems: 'center', gap: 8,
      fontFamily: 'var(--font-display)',
    },
    closeBtn: {
      background: 'none', border: 'none',
      color: 'var(--text-muted)', fontSize: 18,
      cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
    },
    label: {
      display: 'block', fontSize: '0.73rem', fontWeight: 600,
      color: 'var(--text-secondary)', marginBottom: 6, marginTop: 16,
    },
    select: {
      width: '100%', padding: '9px 12px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', fontSize: '0.875rem',
      color: 'var(--text-primary)', outline: 'none',
      boxSizing: 'border-box', fontFamily: 'var(--font-body)',
    },
    textarea: {
      width: '100%', padding: '9px 12px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', fontSize: '0.875rem',
      color: 'var(--text-primary)', outline: 'none',
      boxSizing: 'border-box', resize: 'vertical', minHeight: 120,
      fontFamily: 'var(--font-body)', lineHeight: 1.6,
    },
    footer: {
      display: 'flex', justifyContent: 'flex-end',
      gap: 10, marginTop: 20,
    },
    cancelBtn: {
      padding: '9px 18px', background: 'none',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      color: 'var(--text-secondary)', fontSize: '0.875rem',
      fontFamily: 'var(--font-body)', cursor: 'pointer',
    },
    sendBtn: {
      padding: '9px 22px', background: '#3b82f6',
      border: 'none', borderRadius: 'var(--radius-sm)',
      fontSize: '0.875rem', fontWeight: 700,
      fontFamily: 'var(--font-body)', color: '#fff',
      cursor: loading ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.7 : 1,
    },
    errorMsg: {
      fontSize: '0.8rem', color: '#ef4444',
      padding: '8px 12px', marginTop: 8,
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: 6,
    },
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <span style={s.title}>💬 Send Message to Chairperson</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Chairperson Selector */}
        <label style={s.label}>Select Chairperson</label>
        {fetchingChairs ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem', padding: '8px 0' }}>
            Loading chairpersons...
          </div>
        ) : fetchError && !chairpersons.length ? (
          <div style={s.errorMsg}>{fetchError}</div>
        ) : (
          <select
            style={s.select}
            value={selectedChair}
            onChange={e => setSelectedChair(e.target.value)}
          >
            <option value="">— Select Chairperson —</option>
            {chairpersons.map(c => (
              <option key={c._id} value={c._id}>
                {c.name}{c.departmentName ? ` · ${c.departmentName}` : ''} ({c.email})
              </option>
            ))}
          </select>
        )}

        {/* Message */}
        <label style={s.label}>Message</label>
        <textarea
          style={s.textarea}
          placeholder="Type your message here..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          maxLength={1000}
        />
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>
          {message.length}/1000
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={s.sendBtn} onClick={handleSend} disabled={loading}>
            {loading ? 'Sending...' : '📨 Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
}
