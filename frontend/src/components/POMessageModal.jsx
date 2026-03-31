import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function POMessageModal({ onClose }) {
  const [chairpersons,   setChairpersons]   = useState([]);
  const [selectedChair,  setSelectedChair]  = useState('');
  const [message,        setMessage]        = useState('');
  const [loading,        setLoading]        = useState(false);
  const [fetchingChairs, setFetchingChairs] = useState(true);

  useEffect(() => {
    axios.get('/api/staff-notifications/chairpersons')
      .then(res => setChairpersons(res.data.chairpersons || []))
      .catch(() => toast.error('Could not load chairpersons'))
      .finally(() => setFetchingChairs(false));
  }, []);

  const handleSend = async () => {
    if (!selectedChair)     return toast.error('Please select a chairperson');
    if (!message.trim())    return toast.error('Please enter a message');

    setLoading(true);
    try {
      await axios.post('/api/staff-notifications/po-message', {
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

  // ── Styles — match PlacePro dark theme ──────────────────────────────────
  const s = {
    overlay: {
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    },
    modal: {
      background: 'var(--bg-card, #1e293b)',
      border: '1px solid var(--border, #334155)',
      borderRadius: 12,
      padding: 28,
      width: 500,
      maxWidth: '95vw',
      position: 'relative',
    },
    header: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 20,
    },
    title: {
      fontSize: '1.1rem', fontWeight: 700,
      color: 'var(--text-primary, #e2e8f0)',
      display: 'flex', alignItems: 'center', gap: 8,
    },
    closeBtn: {
      background: 'none', border: 'none',
      color: 'var(--text-muted, #64748b)',
      fontSize: 18, cursor: 'pointer', padding: '2px 6px',
      borderRadius: 4,
    },
    label: {
      display: 'block',
      fontSize: '0.85rem', fontWeight: 600,
      color: 'var(--text-secondary, #94a3b8)',
      marginBottom: 6, marginTop: 16,
    },
    select: {
      width: '100%', padding: '10px 12px',
      background: 'var(--bg-input, #0f172a)',
      border: '1px solid var(--border, #334155)',
      borderRadius: 8, fontSize: 14,
      color: 'var(--text-primary, #e2e8f0)',
      outline: 'none', boxSizing: 'border-box',
    },
    textarea: {
      width: '100%', padding: '10px 12px',
      background: 'var(--bg-input, #0f172a)',
      border: '1px solid var(--border, #334155)',
      borderRadius: 8, fontSize: 14,
      color: 'var(--text-primary, #e2e8f0)',
      outline: 'none', boxSizing: 'border-box',
      resize: 'vertical', minHeight: 120,
      fontFamily: 'inherit', lineHeight: 1.6,
    },
    footer: {
      display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20,
    },
    cancelBtn: {
      padding: '10px 20px',
      background: 'transparent',
      border: '1px solid var(--border, #334155)',
      borderRadius: 8, fontSize: 14,
      color: 'var(--text-secondary, #94a3b8)',
      cursor: 'pointer',
    },
    sendBtn: {
      padding: '10px 24px',
      background: '#3b82f6',
      border: 'none', borderRadius: 8,
      fontSize: 14, fontWeight: 600,
      color: '#fff', cursor: 'pointer',
      opacity: loading ? 0.7 : 1,
    },
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <span style={s.title}>
            💬 Send Message to Chairperson
          </span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Chairperson Selector */}
        <label style={s.label}>Select Chairperson</label>
        {fetchingChairs ? (
          <div style={{ color: 'var(--text-muted, #64748b)', fontSize: 14 }}>Loading...</div>
        ) : (
          <select style={s.select} value={selectedChair} onChange={e => setSelectedChair(e.target.value)}>
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
        <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', textAlign: 'right', marginTop: 4 }}>
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
