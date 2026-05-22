import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import {
  RefreshCw, CheckCircle, AlertTriangle, X,
  ExternalLink, Database, Loader2, Info, Clock
} from 'lucide-react';
import { useAuth } from './AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('authToken');

interface WosPublication {
  title: string;
  journal: string;
  authors: string[] | string;
  citations: number;
  year: string;
  monthYear: string;
  academicYear: string;
  volume: string;
  issue: string;
  startPage: string;
  lastPage: string;
  doi: string;
  link: string;
  docType: string;
  source: string;
  uid: string;
  selected?: boolean;
}

interface AuthorProfile {
  hIndex: number;
  citationCount: number;
  documentCount: number;
}

interface WosSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function WosSyncModal({ isOpen, onClose, onImportComplete }: WosSyncModalProps) {
  const { user } = useAuth();
  const facultyId = user?.facultyId;

  const [step, setStep]           = useState<'idle' | 'preview' | 'done'>('idle');
  const [loading, setLoading]     = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing]     = useState(false);
  const [error, setError]         = useState('');
  const [done, setDone]           = useState('');
  const [publications, setPublications]   = useState<WosPublication[]>([]);
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);
  const [totalInWos, setTotalInWos]       = useState(0);
  const [lastSynced, setLastSynced]       = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && facultyId) fetchLastSynced();
  }, [isOpen, facultyId]);

  const fetchLastSynced = async () => {
    try {
      const res  = await fetch(`${API_BASE_URL}/wos/last-synced/${facultyId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success && data.lastSynced) setLastSynced(data.lastSynced);
    } catch { /* non-critical */ }
  };

  const formatLastSynced = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
      timeZone: 'Asia/Kolkata',
    });

  // ── Quick sync ────────────────────────────────────────────────
  const handleManualSync = async () => {
    if (!facultyId) { setError('Faculty ID not found. Please log out and log in again.'); return; }
    setSyncing(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/wos/sync/${facultyId}`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      });
      let data: any = {};
      try { data = await res.json(); } catch { throw new Error(`Server returned status ${res.status}`); }
      if (data.success) {
        setDone(data.message);
        setStep('done');
        onImportComplete();
      } else {
const errDetail = data.errors?.map((e: any) => e.error || e).join('; ') || '';
setError((data.message || `Sync failed (status ${res.status})`) + (errDetail ? `: ${errDetail}` : ''));      }
    } catch (e: any) {
      setError('Network error: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  // ── Preview ───────────────────────────────────────────────────
  const fetchPreview = async () => {
    if (!facultyId) { setError('Faculty ID not found. Please log out and log in again.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/wos/preview/${facultyId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      let data: any = {};
      try { data = await res.json(); } catch { throw new Error(`Server returned status ${res.status}`); }
      if (!data.success) { setError(data.message || 'Failed to fetch from Web of Science'); return; }
      if (data.count === 0) { setError('No publications found on this WoS profile.'); return; }
      setPublications(data.data.map((p: WosPublication) => ({ ...p, selected: true })));
      setAuthorProfile(data.authorProfile || null);
      setTotalInWos(data.totalInWos || data.count);
      setStep('preview');
    } catch (e: any) {
      setError('Network error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (index: number) =>
    setPublications(prev => prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p));

  const toggleAll = (val: boolean) =>
    setPublications(prev => prev.map(p => ({ ...p, selected: val })));

  const selectedCount = publications.filter(p => p.selected).length;

  // ── Import selected ───────────────────────────────────────────
  const handleImport = async () => {
    if (!facultyId) return;
    const selected = publications.filter(p => p.selected);
    if (selected.length === 0) return;
    setImporting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/wos/import/${facultyId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ publications: selected }),
      });
      let data: any = {};
      try { data = await res.json(); } catch { throw new Error(`Server error ${res.status}`); }
      if (data.success) {
        setDone(data.message);
        setStep('done');
        onImportComplete();
      } else {
const errDetail = Array.isArray(data.errors) ? data.errors.join('; ') : '';
setError((data.message || 'Import failed') + (errDetail ? `: ${errDetail}` : ''));      }
    } catch (e: any) {
      setError('Import failed: ' + e.message);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setStep('idle');
    setPublications([]);
    setAuthorProfile(null);
    setError('');
    setDone('');
    onClose();
  };

  const wosProfileUrl = user?.wosUrl || '';
  const hasWosUrl     = Boolean(wosProfileUrl);

  const authorsDisplay = (authors: string[] | string) =>
    Array.isArray(authors) ? authors.join(', ') : (authors || '');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ backgroundColor: '#166534' }}>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-white" />
            <h2 className="text-base font-semibold text-white">Sync from Web of Science</h2>
          </div>
          <div className="flex items-center gap-3">
            {lastSynced && (
              <div className="flex items-center gap-1.5 text-white/70 text-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>Last synced: {formatLastSynced(lastSynced)}</span>
              </div>
            )}
            <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden px-6 pb-6 mt-4">

          {/* ── idle ─────────────────────────────────────────────── */}
          {step === 'idle' && (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-10">

              <div className="w-full max-w-lg bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-left">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-green-700 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-800 w-full">
                    <p className="font-medium mb-1">How this works</p>
                    <p>We use the official Web of Science Starter API to fetch your publications using your ResearcherID.</p>
                    {hasWosUrl ? (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-green-700 font-medium">✅ WoS URL found:</span>
                        <a href={wosProfileUrl} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-xs text-green-700 break-all hover:underline flex items-center gap-1">
                          {wosProfileUrl.slice(0, 60)}{wosProfileUrl.length > 60 ? '…' : ''}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>
                    ) : (
                      <p className="mt-2 text-amber-700 font-medium">
                        ⚠️ No WoS URL found. Please{' '}
                        <a href="/edit-profile" className="underline">add it in Profile Settings</a>.{' '}
                        Format: https://www.webofscience.com/wos/author/record/AAG-XXXX-XXXX
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full max-w-lg bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 text-left">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Auto-sync is ON</p>
                    <p className="text-xs mt-0.5">WoS publications auto-sync every night at 3:30 AM IST.</p>
                    {lastSynced
                      ? <p className="text-xs mt-1 text-blue-600">Last sync: {formatLastSynced(lastSynced)}</p>
                      : <p className="text-xs mt-1 text-blue-600">Not synced yet — use one of the buttons below.</p>
                    }
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 w-full max-w-lg">
                <Button onClick={handleManualSync} disabled={syncing || loading || !facultyId}
                  className="text-white w-full py-3 text-base" style={{ backgroundColor: '#166534' }}>
                  {syncing
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing all publications...</>
                    : <><RefreshCw className="w-4 h-4 mr-2" />Quick Sync (Auto-import all)</>
                  }
                </Button>
                <Button onClick={fetchPreview} disabled={loading || syncing || !facultyId}
                  variant="outline" className="w-full py-3 text-base border-2"
                  style={{ borderColor: '#166534', color: '#166534' }}>
                  {loading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Fetching from Web of Science...</>
                    : <><Database className="w-4 h-4 mr-2" />Preview &amp; Select Publications</>
                  }
                </Button>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 max-w-lg text-left w-full">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-700">{error}</p>
                    {error.includes('API key') && (
                      <p className="text-xs text-red-500 mt-1">The WoS API key may not be configured yet. Please contact the admin.</p>
                    )}
                    {error.includes('WoS URL') && (
                      <p className="text-xs text-red-500 mt-1">
                        Go to <a href="/edit-profile" className="underline">Profile Settings</a> and save your WoS URL.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── preview ──────────────────────────────────────────── */}
          {step === 'preview' && (
            <>
              {authorProfile && (
                <div className="flex gap-4 mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <div className="text-center px-3">
                    <p className="text-xl font-bold text-green-800">{authorProfile.documentCount}</p>
                    <p className="text-xs text-green-600">Documents</p>
                  </div>
                  <div className="w-px bg-green-200" />
                  <div className="text-center px-3">
                    <p className="text-xl font-bold text-green-800">{authorProfile.citationCount}</p>
                    <p className="text-xs text-green-600">Citations</p>
                  </div>
                  <div className="w-px bg-green-200" />
                  <div className="text-center px-3">
                    <p className="text-xl font-bold text-green-800">{authorProfile.hIndex}</p>
                    <p className="text-xs text-green-600">h-index</p>
                  </div>
                  {publications.length < totalInWos && (
                    <>
                      <div className="w-px bg-green-200" />
                      <div className="text-xs text-green-600 flex items-center px-2">
                        Showing {publications.length} of {totalInWos} total
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600">
                  Found <span className="font-semibold text-gray-900">{publications.length}</span> publications. Select which to import.
                </p>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleAll(true)}  className="text-xs text-green-700 hover:underline">Select all</button>
                  <button onClick={() => toggleAll(false)} className="text-xs text-gray-500 hover:underline">Deselect all</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto border rounded-xl divide-y">
                {publications.map((pub, i) => (
                  <div key={i} onClick={() => toggleItem(i)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${pub.selected ? 'bg-green-50' : 'bg-white hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={pub.selected} onChange={() => toggleItem(i)}
                      onClick={e => e.stopPropagation()} className="mt-1 accent-green-700 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{pub.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {pub.journal   && <span>{pub.journal}</span>}
                        {pub.year      && <span className="ml-2 text-gray-400">· {pub.year}</span>}
                        {pub.citations > 0 && <span className="ml-2 text-green-700">· {pub.citations} WoS citations</span>}
                        {pub.docType   && <span className="ml-2 text-gray-400">· {pub.docType}</span>}
                      </p>
                      {pub.authors && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{authorsDisplay(pub.authors)}</p>
                      )}
                    </div>
                    {pub.link && (
                      <a href={pub.link} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()} className="text-green-700 hover:text-green-900 flex-shrink-0 mt-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-left">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">{selectedCount} of {publications.length} selected</p>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => { setStep('idle'); setPublications([]); }}>← Back</Button>
                  <Button onClick={handleImport} disabled={importing || selectedCount === 0}
                    className="text-white px-6" style={{ backgroundColor: '#166534' }}>
                    {importing
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
                      : <>Import {selectedCount} Publication{selectedCount !== 1 ? 's' : ''}</>
                    }
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ── done ─────────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-10">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Sync Complete!</h3>
              <p className="text-gray-600 mb-2">{done}</p>
              <p className="text-xs text-gray-400 mb-6">Next auto-sync: tonight at 3:30 AM IST</p>
              <Button onClick={handleClose} style={{ backgroundColor: '#166534' }} className="text-white px-8">Done</Button>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}