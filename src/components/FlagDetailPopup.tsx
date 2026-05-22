import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { Flag, BookOpen, Users, FileText, ChevronRight, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

interface Flag {
  id: number;
  item_type: string;
  item_id: number;
  reason: string;
  flagged_at: string;
  flagged_by: string;
  status: string;
  faculty_note?: string;
  resolved_at?: string;
  item_title: string;
  reflag_count?: number;
}

interface FlagDetailPopupProps {
  isOpen: boolean;
  onClose: () => void;
  flags: Flag[];
  onMarkResolved: (flagId: number, note: string) => Promise<void>;
}

function FlagHistory({ flagId }: { flagId: number }) {
  const [history, setHistory] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded && history.length === 0) {
      fetch(`${import.meta.env.VITE_API_URL}/flags/${flagId}/history`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` }
      })
        .then(r => r.json())
        .then(d => { if (d.success) setHistory(d.data); });
    }
  }, [expanded]);

  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)}
        style={{ fontSize: '11px', fontWeight: 600, color: '#b45309', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        📋 View flag history
      </button>
    );
  }

  return (
    <div style={{ marginBottom: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #fed7aa' }}>
      <button onClick={() => setExpanded(false)}
        style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', backgroundColor: '#fff7ed', color: '#c2410c', border: 'none', cursor: 'pointer' }}>
        <span>📋 Flag History — {history.length} previous cycle{history.length !== 1 ? 's' : ''}</span>
        <span>▲</span>
      </button>
      <div style={{ backgroundColor: 'white' }}>
        {history.length === 0 ? (
          <p style={{ fontSize: '11px', color: '#9ca3af', padding: '8px 12px' }}>Loading...</p>
        ) : history.map((h, i) => (
          <div key={h.id} style={{ padding: '10px 12px', borderTop: i > 0 ? '1px solid #fff7ed' : 'none' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#c2410c', marginBottom: '6px' }}>Round {i + 1}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ backgroundColor: '#fff7ed', borderRadius: '6px', padding: '6px 8px' }}>
                <p style={{ fontSize: '10px', fontWeight: 600, color: '#6b7280', marginBottom: '2px' }}>Admin flagged:</p>
                <p style={{ fontSize: '11px', color: '#374151' }}>{h.reason}</p>
              </div>
              {h.faculty_note && (
                <div style={{ backgroundColor: '#f0fdf4', borderRadius: '6px', padding: '6px 8px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 600, color: '#6b7280', marginBottom: '2px' }}>Your response:</p>
                  <p style={{ fontSize: '11px', color: '#374151' }}>{h.faculty_note}</p>
                </div>
              )}
            </div>
            <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '6px' }}>
              {new Date(h.reflagged_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'flagged') return (
    <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block', animation: 'flagBlink 1s infinite', flexShrink: 0 }} />
      Action Needed
    </span>
  );
  if (status === 'pending_review') return (
    <span style={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block', animation: 'flagBlink 1s infinite', flexShrink: 0 }} />
      Pending Review
    </span>
  );
  return (
    <span style={{ backgroundColor: '#dcfce7', color: '#166534', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
      <CheckCircle style={{ width: '11px', height: '11px' }} />
      Resolved
    </span>
  );
}

export function FlagDetailPopup({ isOpen, onClose, flags, onMarkResolved }: FlagDetailPopupProps) {
  const navigate = useNavigate();
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [noteError, setNoteError] = useState<number | null>(null);

  const publications = flags.filter(f => f.item_type === 'publication');
  const conferences = flags.filter(f => f.item_type === 'conference');
  const books = flags.filter(f => f.item_type === 'book');

  const actionCount = flags.filter(f => f.status === 'flagged').length;
  const pendingCount = flags.filter(f => f.status === 'pending_review').length;

  const handleResolve = async (flagId: number) => {
    if (!notes[flagId]?.trim()) {
      setNoteError(flagId);
      return;
    }
    setNoteError(null);
    setSubmitting(flagId);
    try {
      await onMarkResolved(flagId, notes[flagId].trim());
      setResolvingId(null);
      setNotes(prev => { const n = { ...prev }; delete n[flagId]; return n; });
    } finally {
      setSubmitting(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const accentColor = (status: string) =>
    status === 'flagged' ? '#ef4444' : status === 'pending_review' ? '#f59e0b' : '#22c55e';

  const cardBg = (status: string) =>
    status === 'flagged' ? '#fff5f5' : status === 'pending_review' ? '#fffbeb' : '#f0fdf4';

  const cardBorder = (status: string) =>
    status === 'flagged' ? '#fca5a5' : status === 'pending_review' ? '#fcd34d' : '#86efac';

  const renderSection = (sectionFlags: Flag[], label: string, Icon: any, route: string) => {
    if (sectionFlags.length === 0) return null;
    const needAction = sectionFlags.filter(f => f.status === 'flagged').length;

    return (
      <div style={{ marginBottom: '20px' }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#E6F5F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon style={{ width: '14px', height: '14px', color: '#006B64' }} />
            </div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#1f2937' }}>{label}</p>
            {needAction > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 600, backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '999px' }}>
                {needAction} need action
              </span>
            )}
          </div>
          <button onClick={() => { onClose(); navigate(route); }}
            style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: 600, color: '#006B64', background: 'none', border: 'none', cursor: 'pointer' }}>
            Go to {label} <ChevronRight style={{ width: '13px', height: '13px' }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sectionFlags.map(flag => (
            <div key={flag.id} style={{
              borderRadius: '12px',
              border: `1px solid ${cardBorder(flag.status)}`,
              backgroundColor: cardBg(flag.status),
              overflow: 'hidden',
              display: 'flex',
            }}>
              {/* Left accent bar */}
              <div style={{ width: '4px', flexShrink: 0, backgroundColor: accentColor(flag.status) }} />

              {/* Card content */}
              <div style={{ padding: '12px 14px', flex: 1, minWidth: 0 }}>

                {/* Title + status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', lineHeight: 1.4, marginBottom: '4px' }}>
                      {flag.item_title}
                    </p>
                    {flag.reflag_count && flag.reflag_count > 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#c2410c', backgroundColor: '#ffedd5', border: '1px solid #fed7aa', padding: '2px 8px', borderRadius: '999px' }}>
                        🔁 Reflagged {flag.reflag_count} time{flag.reflag_count > 1 ? 's' : ''}
                      </span>
                    ) : null}
                  </div>
                  <StatusBadge status={flag.status} />
                </div>

                {/* Reason */}
                <div style={{ marginBottom: '8px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                    Reason flagged
                  </p>
                  <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '8px 10px', border: '1px solid #e5e7eb', fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
                    {flag.reason}
                  </div>
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                  <AlertCircle style={{ width: '11px', height: '11px', color: '#9ca3af', flexShrink: 0 }} />
                  <p style={{ fontSize: '11px', color: '#9ca3af' }}>
                    Flagged by {flag.flagged_by} · {formatDate(flag.flagged_at)}
                  </p>
                </div>

                {/* History */}
                {flag.reflag_count && flag.reflag_count > 0 ? <FlagHistory flagId={flag.id} /> : null}

                {/* Resolve section */}
                {flag.status === 'flagged' && (
                  <>
                    {resolvingId === flag.id ? (
                      <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #d1fae5', padding: '12px', marginTop: '6px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                          What did you fix? <span style={{ color: '#ef4444' }}>*</span>
                        </p>
                        <textarea
                          value={notes[flag.id] || ''}
                          onChange={e => {
                            setNotes(prev => ({ ...prev, [flag.id]: e.target.value }));
                            if (noteError === flag.id) setNoteError(null);
                          }}
                          placeholder="Describe what you changed or corrected..."
                          rows={2}
                          style={{
                            width: '100%', border: `1px solid ${noteError === flag.id ? '#ef4444' : '#d1d5db'}`,
                            borderRadius: '8px', padding: '8px 10px', fontSize: '12px',
                            resize: 'none', outline: 'none', marginBottom: '4px', boxSizing: 'border-box',
                          }}
                        />
                        {noteError === flag.id && (
                          <p style={{ fontSize: '11px', color: '#ef4444', marginBottom: '6px' }}>
                            Please describe what you fixed before submitting.
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button
                            onClick={() => handleResolve(flag.id)}
                            disabled={submitting === flag.id}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#006B64', color: 'white', fontSize: '12px', fontWeight: 600, padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', opacity: submitting === flag.id ? 0.7 : 1 }}
                          >
                            <CheckCircle style={{ width: '13px', height: '13px' }} />
                            {submitting === flag.id ? 'Submitting...' : 'Mark Resolved'}
                          </button>
                          <button
                            onClick={() => { setResolvingId(null); setNoteError(null); }}
                            style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', padding: '7px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setResolvingId(flag.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '12px', fontWeight: 600, color: '#006B64', backgroundColor: 'white', border: '1.5px solid #006B64', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        <CheckCircle style={{ width: '13px', height: '13px' }} />
                        Mark as Resolved
                      </button>
                    )}
                  </>
                )}

                {/* Pending */}
                {flag.status === 'pending_review' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', backgroundColor: '#fef3c7', borderRadius: '8px', padding: '8px 10px' }}>
                    <Clock style={{ width: '13px', height: '13px', color: '#d97706', flexShrink: 0 }} />
                    <p style={{ fontSize: '11px', color: '#92400e', fontWeight: 500 }}>
                      Awaiting admin review · Submitted {flag.resolved_at ? formatDate(flag.resolved_at) : '—'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col top-[50%] translate-y-[-50%]">
        <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Flag style={{ width: '18px', height: '18px', color: '#dc2626' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>Flagged Items</h2>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                {actionCount > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}>{actionCount} need your action</span>}
                {actionCount > 0 && pendingCount > 0 && ' · '}
                {pendingCount > 0 && `${pendingCount} pending admin review`}
              </p>
            </div>
          </div>

          {flags.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#E6F5F4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckCircle style={{ width: '28px', height: '28px', color: '#006B64' }} />
              </div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>All clear!</p>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>No flagged items at the moment</p>
            </div>
          ) : (
            <>
              {renderSection(publications, 'Publications', FileText, '/publications')}
              {renderSection(conferences, 'Conferences', Users, '/conferences')}
              {renderSection(books, 'Books & Chapters', BookOpen, '/books')}
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
            <button onClick={onClose}
              style={{ fontSize: '13px', fontWeight: 500, color: '#4b5563', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>

        <style>{`
          @keyframes flagBlink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.2; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}