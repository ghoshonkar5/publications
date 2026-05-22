import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import {
  RefreshCw, CheckCircle, AlertTriangle, X,
  ExternalLink, Database, Loader2, Info, Wifi, Clock
} from 'lucide-react';
import { useAuth } from './AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('authToken');

interface ScopusPublication {
  title: string;
  journal: string;
  authors: string;
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
  selected?: boolean;
}

interface AuthorProfile {
  hIndex: number;
  citationCount: number;
  documentCount: number;
}

interface ScopusSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function ScopusSyncModal({ isOpen, onClose, onImportComplete }: ScopusSyncModalProps) {
  const { user } = useAuth();
  const facultyId = user?.facultyId;

  const [step, setStep] = useState<'idle' | 'preview' | 'done'>('idle');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [publications, setPublications] = useState<ScopusPublication[]>([]);
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);
  const [totalInScopus, setTotalInScopus] = useState(0);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // ── Fetch last synced timestamp when modal opens ──────────────
  useEffect(() => {
    if (isOpen && facultyId) fetchLastSynced();
  }, [isOpen, facultyId]);

  const fetchLastSynced = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/scopus/last-synced/${facultyId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success && data.lastSynced) {
        setLastSynced(data.lastSynced);
      }
    } catch (e) {
      // Non-critical — silently ignore
    }
  };

  const formatLastSynced = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  };

  // ── Quick sync: auto-import everything, no selection step ─────
  const handleManualSync = async () => {
    if (!facultyId) {
      setError('Faculty ID not found. Please log out and log in again.');
      return;
    }

    setSyncing(true);
    setError('');

    try {
      console.log(`[ScopusSync] POST ${API_BASE_URL}/scopus/sync/${facultyId}`);

      const res = await fetch(`${API_BASE_URL}/scopus/sync/${facultyId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`[ScopusSync] Response status: ${res.status}`);

      // Try to parse JSON even on error statuses — backend always returns JSON
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned status ${res.status} with non-JSON body`);
      }

      console.log('[ScopusSync] Response data:', data);

      if (data.success) {
        setDone(data.message);
        setStep('done');
        onImportComplete(); // refreshes stats in parent — does NOT close modal
      } else {
        setError(data.message || `Sync failed (status ${res.status})`);
      }
    } catch (e: any) {
      console.error('[ScopusSync] Fetch error:', e);
      setError('Network error: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  // ── Preview: fetch publications for manual selection ──────────
  const fetchPreview = async () => {
    if (!facultyId) {
      setError('Faculty ID not found. Please log out and log in again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log(`[ScopusPreview] GET ${API_BASE_URL}/scopus/preview/${facultyId}`);

      const res = await fetch(`${API_BASE_URL}/scopus/preview/${facultyId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      console.log(`[ScopusPreview] Response status: ${res.status}`);

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned status ${res.status} with non-JSON body`);
      }

      console.log('[ScopusPreview] Response data:', data);

      if (!data.success) {
        setError(data.message || 'Failed to fetch from Scopus');
        return;
      }
      if (data.count === 0) {
        setError('No publications found on this Scopus profile.');
        return;
      }

      setPublications(data.data.map((p: ScopusPublication) => ({ ...p, selected: true })));
      setAuthorProfile(data.authorProfile || null);
      setTotalInScopus(data.totalInScopus || data.count);
      setStep('preview');
    } catch (e: any) {
      console.error('[ScopusPreview] Fetch error:', e);
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

  // ── Import selected publications ──────────────────────────────
  const handleImport = async () => {
    if (!facultyId) return;
    const selected = publications.filter(p => p.selected);
    if (selected.length === 0) return;

    setImporting(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/scopus/import/${facultyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ publications: selected }),
      });

      let data: any = {};
      try { data = await res.json(); } catch { throw new Error(`Server error ${res.status}`); }

      if (data.success) {
        setDone(data.message);
        setStep('done');
        onImportComplete();
      } else {
        setError(data.message || 'Import failed');
      }
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

  // ── Determine scopus URL and whether button should be enabled ─
 const scopusProfileUrl = user?.scopusUrl || '';
  const scopusUrl2 = (user as any)?.scopusUrl2 || '';
  const scopusUrl3 = (user as any)?.scopusUrl3 || '';
  const allScopusUrls = [scopusProfileUrl, scopusUrl2, scopusUrl3].filter(Boolean);
  const hasScopusUrl = allScopusUrls.length > 0;
  const hasMultipleScopusUrls = allScopusUrls.length > 1;

  const debugInfo = {
    facultyId: facultyId || '(missing)',
    scopusUrl: scopusProfileUrl || '(not in user object)',
    userKeys: user ? Object.keys(user).join(', ') : '(user is null)',
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ backgroundColor: '#006B64' }}>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-white" />
            <h2 className="text-base font-semibold text-white">Sync from Scopus</h2>
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

          {/* ── Step: idle ─────────────────────────────────────────── */}
          {step === 'idle' && (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-10">

              {/* Network notice */}
              <div className="w-full max-w-lg bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-left">
                <div className="flex items-start gap-2">
                  <Wifi className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Must be on college network</p>
                    <p>Scopus API requires institutional network access. If you're at home, connect via college VPN first.</p>
                  </div>
                </div>
              </div>

              {/* Info box */}
              <div className="w-full max-w-lg bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-left">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">How this works</p>
                    <p>We use the official Scopus Search API to fetch your publications automatically.</p>

                    {hasScopusUrl ? (
                      <div className="mt-2 flex flex-col gap-1">
                        <span className="text-green-700 font-medium">
                          ✅ {allScopusUrls.length} Scopus profile{allScopusUrls.length > 1 ? 's' : ''} found:
                        </span>
                        {allScopusUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-xs text-blue-700 break-all hover:underline flex items-center gap-1 ml-1">
                            {i + 1}. {url.slice(0, 55)}{url.length > 55 ? '…' : ''}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        ))}
                        {hasMultipleScopusUrls && (
                          <p className="text-xs text-blue-600 mt-1">
                            ℹ️ Publications from all {allScopusUrls.length} accounts will be merged and deduplicated automatically.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2">
                        <p className="text-amber-700 font-medium">
                          ⚠️ Scopus URL not detected in your session. If you've already saved it in your profile, try logging out and back in. Otherwise,{' '}
                          <a href="/edit-profile" className="underline">add it in Profile Settings</a>.
                        </p>
                        {/* Debug panel — helps identify the root cause */}
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">Debug info</summary>
                          <pre className="text-xs bg-gray-100 rounded p-2 mt-1 text-left whitespace-pre-wrap break-all">
{`facultyId: ${debugInfo.facultyId}
scopusUrl: ${debugInfo.scopusUrl}
user fields: ${debugInfo.userKeys}`}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Auto-sync info */}
              <div className="w-full max-w-lg bg-green-50 border border-green-200 rounded-xl p-3 mb-6 text-left">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium">Auto-sync is ON</p>
                    <p className="text-xs mt-0.5">Your publications are automatically synced from Scopus every night at 2:00 AM IST.</p>
                    {lastSynced
                      ? <p className="text-xs mt-1 text-green-600">Last sync: {formatLastSynced(lastSynced)}</p>
                      : <p className="text-xs mt-1 text-green-600">Not synced yet — use one of the buttons below to sync now.</p>
                    }
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col items-center gap-3 w-full max-w-lg">

                {/* Quick sync — always enabled if facultyId exists; backend handles missing URL gracefully */}
                <Button
                  onClick={handleManualSync}
                  disabled={syncing || loading || !facultyId}
                  className="text-white w-full py-3 text-base"
                  style={{ backgroundColor: '#006B64' }}
                >
                  {syncing
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing all publications...</>
                    : <><RefreshCw className="w-4 h-4 mr-2" />Quick Sync (Auto-import all)</>
                  }
                </Button>

                {/* Preview + select */}
                <Button
                  onClick={fetchPreview}
                  disabled={loading || syncing || !facultyId}
                  variant="outline"
                  className="w-full py-3 text-base border-2"
                  style={{ borderColor: '#006B64', color: '#006B64' }}
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Fetching from Scopus...</>
                    : <><Database className="w-4 h-4 mr-2" />Preview &amp; Select Publications</>
                  }
                </Button>

                {!hasScopusUrl && !error && (
                  <p className="text-xs text-gray-500 text-center">
                    If your Scopus URL is saved in your profile but buttons are still disabled, try{' '}
                    <button onClick={() => window.location.reload()} className="underline text-teal-700">refreshing the page</button>.
                  </p>
                )}
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 max-w-lg text-left w-full">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-700">{error}</p>
                    {(error.includes('college network') || error.includes('401')) && (
                      <p className="text-xs text-red-500 mt-1">💡 Try connecting to college Wi-Fi or VPN, then retry.</p>
                    )}
                    {error.includes('Scopus URL') && (
                      <p className="text-xs text-red-500 mt-1">
                        Go to{' '}
                        <a href="/edit-profile" className="underline">Profile Settings</a>{' '}
                        and save your Scopus profile URL (format: https://www.scopus.com/authid/detail.uri?authorId=XXXXXXXXXX).
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step: preview ──────────────────────────────────────── */}
          {step === 'preview' && (
            <>
              {authorProfile && (
                <div className="flex gap-4 mb-4 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                  <div className="text-center px-3">
                    <p className="text-xl font-bold text-teal-800">{authorProfile.documentCount}</p>
                    <p className="text-xs text-teal-600">Documents</p>
                  </div>
                  <div className="w-px bg-teal-200" />
                  <div className="text-center px-3">
                    <p className="text-xl font-bold text-teal-800">{authorProfile.citationCount}</p>
                    <p className="text-xs text-teal-600">Citations</p>
                  </div>
                  <div className="w-px bg-teal-200" />
                  <div className="text-center px-3">
                    <p className="text-xl font-bold text-teal-800">{authorProfile.hIndex}</p>
                    <p className="text-xs text-teal-600">h-index</p>
                  </div>
                  {publications.length < totalInScopus && (
                    <>
                      <div className="w-px bg-teal-200" />
                      <div className="text-xs text-teal-600 flex items-center px-2">
                        Showing {publications.length} of {totalInScopus} total
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
                  <button onClick={() => toggleAll(true)} className="text-xs text-teal-700 hover:underline">Select all</button>
                  <button onClick={() => toggleAll(false)} className="text-xs text-gray-500 hover:underline">Deselect all</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto border rounded-xl divide-y">
                {publications.map((pub, i) => (
                  <div key={i} onClick={() => toggleItem(i)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${pub.selected ? 'bg-teal-50' : 'bg-white hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={pub.selected} onChange={() => toggleItem(i)}
                      onClick={e => e.stopPropagation()} className="mt-1 accent-teal-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{pub.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {pub.journal && <span>{pub.journal}</span>}
                        {pub.year && <span className="ml-2 text-gray-400">· {pub.year}</span>}
                        {pub.citations > 0 && <span className="ml-2 text-blue-600">· {pub.citations} citations</span>}
                        {pub.docType && <span className="ml-2 text-gray-400">· {pub.docType}</span>}
                      </p>
                      {pub.authors && <p className="text-xs text-gray-400 mt-0.5 truncate">{pub.authors}</p>}
                    </div>
                    {pub.link && (
                      <a href={pub.link} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()} className="text-teal-600 hover:text-teal-800 flex-shrink-0 mt-1">
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
                    className="text-white px-6" style={{ backgroundColor: '#006B64' }}>
                    {importing
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
                      : <>Import {selectedCount} Publication{selectedCount !== 1 ? 's' : ''}</>
                    }
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ── Step: done ─────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-10">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Sync Complete!</h3>
              <p className="text-gray-600 mb-2">{done}</p>
              <p className="text-xs text-gray-400 mb-6">Next auto-sync: tonight at 2:00 AM IST</p>
              <Button onClick={handleClose} style={{ backgroundColor: '#006B64' }} className="text-white px-8">Done</Button>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}