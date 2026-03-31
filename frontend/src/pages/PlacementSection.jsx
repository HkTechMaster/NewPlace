import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

export default function PlacementSection({ studentId }) {
  const [jobs, setJobs] = useState([]);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('jobs');
  const [applyModal, setApplyModal] = useState(null);
  const [withdrawModal, setWithdrawModal] = useState(null); // ── NEW
  const [myCVs, setMyCVs] = useState([]);
  const [applyForm, setApplyForm] = useState({ cvId: '', consent: false });
  const [applying, setApplying] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false); // ── NEW

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [jRes, dRes, cvRes] = await Promise.all([
        axios.get('/jobs/eligible'),
        axios.get('/drives/mine'),
        axios.get('/cv/mine'),
      ]);
      setJobs(jRes.data.jobs || []);
      setDrives(dRes.data.drives || []);
      setMyCVs(cvRes.data.cvs || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const openApplyModal = (job) => {
    setApplyModal(job);
    setApplyForm({ cvId: '', consent: false });
  };

  const handleApply = async () => {
    if (!applyForm.consent) { toast.error('Please give consent to apply'); return; }
    setApplying(true);
    try {
      await axios.post(`/jobs/${applyModal._id}/apply`, {
        cvId: applyForm.cvId || null,
        consent: true,
      });
      toast.success(`Successfully applied to ${applyModal.company}!`);
      setApplyModal(null);
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to apply'); }
    finally { setApplying(false); }
  };

  // ── NEW: Withdraw handler ────────────────────────────────────────────────
  const handleWithdraw = async () => {
    if (!withdrawModal) return;
    setWithdrawing(true);
    try {
      await axios.delete(`/jobs/${withdrawModal._id}/apply`);
      toast.success(`Application withdrawn from ${withdrawModal.company}`);
      setWithdrawModal(null);
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to withdraw');
    } finally {
      setWithdrawing(false);
    }
  };

  const selectedDrives = drives.filter(d => d.myStatus === 'selected');

  const statusConfig = {
    applied:     { label: 'Applied',          color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
    shortlisted: { label: 'Shortlisted ⭐',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
    selected:    { label: 'Selected ✓',       color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
    rejected:    { label: 'Rejected',          color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  };

  if (loading) return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
      Loading placements...
    </div>
  );

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setActiveView('jobs')}
          style={{ padding: '8px 20px', borderRadius: 20, border: '1px solid', fontFamily: 'var(--font-body)', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', background: activeView === 'jobs' ? 'var(--success)' : 'var(--bg-secondary)', color: activeView === 'jobs' ? 'white' : 'var(--text-muted)', borderColor: activeView === 'jobs' ? 'var(--success)' : 'var(--border)' }}
        >
          💼 Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setActiveView('offers')}
          style={{ padding: '8px 20px', borderRadius: 20, border: '1px solid', fontFamily: 'var(--font-body)', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', background: activeView === 'offers' ? 'var(--gold)' : 'var(--bg-secondary)', color: activeView === 'offers' ? '#000' : 'var(--text-muted)', borderColor: activeView === 'offers' ? 'var(--gold)' : 'var(--border)' }}
        >
          🎉 Offer Letters ({selectedDrives.length})
        </button>
      </div>

      {/* ── Jobs View ─────────────────────────────────────────────────────── */}
      {activeView === 'jobs' && (
        !jobs.length ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No eligible jobs yet. Check back soon!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
            {jobs.map(job => {
              const appStatus = job.applicationStatus ? statusConfig[job.applicationStatus] : null;
              const canWithdraw = job.alreadyApplied && job.applicationStatus === 'applied'; // ── NEW

              return (
                <div
                  key={job._id}
                  style={{ background: 'var(--bg-card)', border: `1px solid ${job.alreadyApplied ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}
                >
                  {/* Title + Type */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{job.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gold)', fontWeight: 600 }}>{job.company}</div>
                    </div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: 'var(--gold)', border: '1px solid rgba(245,158,11,0.2)', whiteSpace: 'nowrap' }}>
                      {job.jobType}
                    </span>
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                    {job.location  && <span>📍 {job.location}</span>}
                    {job.salary    && <span>💰 {job.salary}</span>}
                    {job.minCgpa > 0 && <span>📊 Min CGPA {job.minCgpa}</span>}
                  </div>

                  {/* Required Skills */}
                  {job.requiredSkills?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {job.requiredSkills.map((s, i) => (
                        <span key={i} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>⚡ {s}</span>
                      ))}
                    </div>
                  )}

                  {/* Preferred Skills */}
                  {job.preferredSkills?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {job.preferredSkills.map((s, i) => (
                        <span key={i} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>✓ {s}</span>
                      ))}
                    </div>
                  )}

                  {job.description && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                      {job.description.slice(0, 120)}{job.description.length > 120 ? '...' : ''}
                    </p>
                  )}

                  {job.lastDateToApply && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--warning)' }}>
                      ⏰ Deadline: {new Date(job.lastDateToApply).toLocaleDateString('en-IN')}
                    </div>
                  )}

                  {/* ── Status badge + optional withdraw button ─────────── */}
                  {job.alreadyApplied && appStatus ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Status badge */}
                      <div style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: appStatus.bg, color: appStatus.color, fontSize: '0.825rem', fontWeight: 700, textAlign: 'center' }}>
                        {appStatus.label}
                      </div>

                      {/* ── NEW: Withdraw button — only visible when status is 'applied' */}
                      {canWithdraw && (
                        <button
                          onClick={() => setWithdrawModal(job)}
                          style={{ padding: '7px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: '0.775rem', fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.target.style.background = 'rgba(239,68,68,0.15)'; }}
                          onMouseLeave={e => { e.target.style.background = 'rgba(239,68,68,0.06)'; }}
                        >
                          ↩ Withdraw Application
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => openApplyModal(job)}
                      style={{ padding: '9px', borderRadius: 'var(--radius-sm)', border: 'none', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', background: 'var(--success)', color: 'white', transition: 'all 0.15s' }}
                    >
                      Apply Now →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Offer Letters View ────────────────────────────────────────────── */}
      {activeView === 'offers' && (
        !selectedDrives.length ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No offer letters yet. Keep applying!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selectedDrives.map(d => (
              <div key={d._id} style={{ background: 'var(--bg-card)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius)', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{d.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gold)', fontWeight: 600, marginTop: 2 }}>{d.company}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: 4 }}>✓ Selected</div>
                </div>
                {d.offerLetter ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href={d.offerLetter} download="offer-letter.pdf" style={{ padding: '8px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 'var(--radius-sm)', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>⬇ Download</a>
                    <label style={{ padding: '8px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}>
                      🔄 Re-upload
                      <input type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={async e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          try {
                            await axios.put(`/drives/${d._id}/offer-letter/${studentId}`, { offerLetter: reader.result });
                            toast.success('Re-uploaded!');
                            fetchAll();
                          } catch { toast.error('Failed'); }
                        };
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                  </div>
                ) : (
                  <label style={{ padding: '9px 18px', background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#000', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer' }}>
                    📎 Upload Offer Letter
                    <input type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={async e => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        try {
                          await axios.put(`/drives/${d._id}/offer-letter/${studentId}`, { offerLetter: reader.result });
                          toast.success('Uploaded!');
                          fetchAll();
                        } catch { toast.error('Failed'); }
                      };
                      reader.readAsDataURL(file);
                    }} />
                  </label>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Apply Modal ───────────────────────────────────────────────────── */}
      {applyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={e => e.target === e.currentTarget && setApplyModal(null)}>
          <div style={{ width: '100%', maxWidth: 480, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              Apply — {applyModal.company}
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: 20 }}>{applyModal.title}</p>

            {/* CV Select */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Select CV (optional)</label>
              <select
                value={applyForm.cvId}
                onChange={e => setApplyForm(f => ({ ...f, cvId: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}
              >
                <option value="">— No CV selected —</option>
                {myCVs.map(cv => (
                  <option key={cv._id} value={cv._id}>
                    {cv.title || 'Untitled CV'} — {cv.status === 'verified' ? '✓ Verified' : cv.status === 'pending' ? '⏳ Pending' : cv.status === 'rejected' ? '✗ Rejected' : '📝 Draft'}
                  </option>
                ))}
              </select>
            </div>

            {/* Consent */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 24, padding: '14px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 'var(--radius-sm)' }}>
              <input
                type="checkbox"
                checked={applyForm.consent}
                onChange={e => setApplyForm(f => ({ ...f, consent: e.target.checked }))}
                style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--accent)', flexShrink: 0 }}
              />
              <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                I confirm that I am genuinely interested in this opportunity and will attend the placement drive if called. I understand that backing out after selection may affect future placement opportunities.
              </span>
            </label>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setApplyModal(null)} style={{ padding: '9px 18px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.875rem', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!applyForm.consent || applying}
                style={{ padding: '9px 22px', background: applyForm.consent ? 'var(--success)' : 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius-sm)', color: applyForm.consent ? 'white' : 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font-body)', cursor: applyForm.consent ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}
              >
                {applying ? 'Submitting...' : '✓ Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW: Withdraw Confirmation Modal ──────────────────────────────── */}
      {withdrawModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={e => e.target === e.currentTarget && setWithdrawModal(null)}>
          <div style={{ width: '100%', maxWidth: 420, background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12, textAlign: 'center' }}>↩️</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textAlign: 'center' }}>
              Withdraw Application?
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 6, lineHeight: 1.5 }}>
              Are you sure you want to withdraw your application for
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--gold)', fontWeight: 700, textAlign: 'center', marginBottom: 20 }}>
              {withdrawModal.title} at {withdrawModal.company}
            </p>
            <p style={{ fontSize: '0.775rem', color: '#ef4444', textAlign: 'center', marginBottom: 24, padding: '10px', background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.15)' }}>
              ⚠️ This action cannot be undone. You will need to apply again if you change your mind.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setWithdrawModal(null)}
                style={{ padding: '9px 22px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.875rem', fontFamily: 'var(--font-body)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                style={{ padding: '9px 22px', background: '#ef4444', border: 'none', borderRadius: 'var(--radius-sm)', color: 'white', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font-body)', cursor: withdrawing ? 'not-allowed' : 'pointer', opacity: withdrawing ? 0.7 : 1 }}
              >
                {withdrawing ? 'Withdrawing...' : '↩ Yes, Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
