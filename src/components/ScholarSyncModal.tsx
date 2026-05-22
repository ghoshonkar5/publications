import { useState, useRef } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  RefreshCw, Upload, CheckCircle, AlertTriangle, X,
  FileText, ExternalLink, BookOpen, Loader2, Info, AlertCircle
} from 'lucide-react';
import { useAuth } from './AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('authToken');

// ── Rate limit config ────────────────────────────────────────────
const DAILY_FETCH_LIMIT = 100;

const getScholarRateLimit = (facultyId: string) => {
  const today = new Date().toISOString().slice(0, 10);
  const raw = localStorage.getItem(`scholar_fetch_limit_${facultyId}`);
  if (!raw) return { count: 0, date: today };
  const parsed = JSON.parse(raw);
  return parsed.date !== today ? { count: 0, date: today } : parsed;
};

const incrementScholarRateLimit = (facultyId: string) => {
  const today = new Date().toISOString().slice(0, 10);
  const current = getScholarRateLimit(facultyId);
  const next = { date: today, count: current.count + 1 };
  localStorage.setItem(`scholar_fetch_limit_${facultyId}`, JSON.stringify(next));
  return next;
};

// ── Types ────────────────────────────────────────────────────────
interface ScrapedPublication {
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
  apaFormat: string;
  indexing: string;
  source: string;
  selected?: boolean;
}

interface SimilarityFlag {
  imported: ScrapedPublication;
  skipped: ScrapedPublication;
  reason: string;
  similarity: number;
}

interface ScholarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (similarityReport?: SimilarityFlag[]) => void;
  defaultTab?: 'scholar' | 'csv';
}

export function ScholarSyncModal({ isOpen, onClose, onImportComplete, defaultTab = 'scholar' }: ScholarSyncModalProps) {  const { user } = useAuth();
  const facultyId = user?.facultyId;

  // ── Google Scholar tab state ─────────────────────────────────
  const [scholarLoading, setScholarLoading] = useState(false);
  const [scholarError, setScholarError] = useState('');
  const [scholarPreviews, setScholarPreviews] = useState<ScrapedPublication[]>([]);
  const [scholarFetched, setScholarFetched] = useState(false);
  const [scholarImporting, setScholarImporting] = useState(false);
  const [scholarDone, setScholarDone] = useState('');
  const [similarityReport, setSimilarityReport] = useState<SimilarityFlag[]>([]);
  const [fetchCount, setFetchCount] = useState(() =>
    facultyId ? getScholarRateLimit(facultyId).count : 0
  );

  // ── CSV tab state ────────────────────────────────────────────
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [csvParsed, setCsvParsed] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvDone, setCsvDone] = useState('');
  const [csvSelected, setCsvSelected] = useState<boolean[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const attemptsLeft = DAILY_FETCH_LIMIT - fetchCount;
  const limitReached = fetchCount >= DAILY_FETCH_LIMIT;

  // ── Scholar: fetch live preview ──────────────────────────────
  const fetchScholarPreview = async () => {
    if (!facultyId) return;

    // Rate limit check
    const rateLimit = getScholarRateLimit(facultyId);
    if (rateLimit.count >= DAILY_FETCH_LIMIT) {
      setScholarError(`Daily fetch limit of ${DAILY_FETCH_LIMIT} reached. Try again tomorrow to avoid Google blocking your access.`);
      return;
    }

    setScholarLoading(true);
    setScholarError('');
    setScholarPreviews([]);
    setScholarFetched(false);
    setScholarDone('');
    setSimilarityReport([]);

    try {
      const res = await fetch(`${API_BASE_URL}/scholar/preview/${facultyId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();

      if (!data.success) {
        setScholarError(data.message || 'Failed to fetch from Google Scholar');
        return;
      }

      if (data.count === 0) {
        setScholarError('No publications found on this Google Scholar profile.');
        return;
      }

      // Only increment on successful fetch
      const updated = incrementScholarRateLimit(facultyId);
      setFetchCount(updated.count);

      setScholarPreviews(data.data.map((p: ScrapedPublication) => ({ ...p, selected: true })));
      setScholarFetched(true);
    } catch (e: any) {
      setScholarError('Network error: ' + e.message);
    } finally {
      setScholarLoading(false);
    }
  };

  const toggleScholarItem = (index: number) => {
    setScholarPreviews(prev =>
      prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p)
    );
  };

  const toggleAllScholar = (val: boolean) => {
    setScholarPreviews(prev => prev.map(p => ({ ...p, selected: val })));
  };

  const scholarSelectedCount = scholarPreviews.filter(p => p.selected).length;

  const handleScholarImport = async () => {
    if (!facultyId) return;
    const selected = scholarPreviews.filter(p => p.selected);
    if (selected.length === 0) return;

    setScholarImporting(true);
    setScholarDone('');
    setSimilarityReport([]);

    try {
      const res = await fetch(`${API_BASE_URL}/scholar/import/${facultyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ publications: selected }),
      });
      const data = await res.json();
      if (data.success) {
        setScholarDone(data.message);
        const report = data.similarityReport || [];
        setSimilarityReport(report);
        onImportComplete(report);
      } else {
        setScholarError(data.message || 'Import failed');
      }
    } catch (e: any) {
      setScholarError('Import failed: ' + e.message);
    } finally {
      setScholarImporting(false);
    }
  };

  // ── CSV: parse uploaded file ─────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setCsvError('Please upload a .csv file exported from Scopus or Google Scholar.');
      return;
    }

    setCsvFileName(file.name);
    setCsvError('');
    setCsvRows([]);
    setCsvParsed(false);
    setCsvDone('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const rows = parseCSV(text);
        if (rows.length === 0) {
          setCsvError('No data rows found in the CSV file.');
          return;
        }
        setCsvRows(rows);
        setCsvSelected(new Array(rows.length).fill(true));
        setCsvParsed(true);
      } catch (err: any) {
        setCsvError('Failed to parse CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const toggleCsvItem = (index: number) => {
    setCsvSelected(prev => prev.map((v, i) => i === index ? !v : v));
  };

  const toggleAllCsv = (val: boolean) => {
    setCsvSelected(new Array(csvRows.length).fill(val));
  };

  const csvSelectedCount = csvSelected.filter(Boolean).length;

  const handleCsvImport = async () => {
    if (!facultyId) return;
    const selectedRows = csvRows.filter((_, i) => csvSelected[i]);
    if (selectedRows.length === 0) return;

    setCsvImporting(true);
    setCsvDone('');
    setCsvError('');
    try {
      const res = await fetch(`${API_BASE_URL}/scholar/import-csv/${facultyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ rows: selectedRows }),
      });
      const data = await res.json();
      if (data.success) {
        setCsvDone(data.message);
        onImportComplete();
      } else {
        setCsvError(data.message || 'Import failed');
      }
    } catch (e: any) {
      setCsvError('Import failed: ' + e.message);
    } finally {
      setCsvImporting(false);
    }
  };

  // ── CSV Parser (handles quoted fields) ──────────────────────
  const parseCSV = (text: string): any[] => {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length < 2) return [];

    let headerLineIdx = 0;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      if (lines[i].toLowerCase().includes('title') || lines[i].toLowerCase().includes('authors')) {
        headerLineIdx = i;
        break;
      }
    }

    const headers = splitCSVLine(lines[headerLineIdx]);
    const rows: any[] = [];

    for (let i = headerLineIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = splitCSVLine(line);
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h.trim().replace(/^"|"$/g, '')] = (values[idx] || '').trim().replace(/^"|"$/g, '');
      });
      if (Object.values(row).some(v => v)) rows.push(row);
    }

    return rows;
  };

  const splitCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (c === ',' && !inQuotes) {
        result.push(cur); cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur);
    return result;
  };

  const handleClose = () => {
    setScholarPreviews([]);
    setScholarFetched(false);
    setScholarError('');
    setScholarDone('');
    setSimilarityReport([]);
    setCsvRows([]);
    setCsvParsed(false);
    setCsvError('');
    setCsvFileName('');
    setCsvDone('');
    onClose();
  };

  // ── Rate limit badge ─────────────────────────────────────────
  const RateLimitBadge = () => {
    const bgColor = limitReached
      ? 'bg-red-100 border-red-300'
      : fetchCount >= 3
      ? 'bg-amber-100 border-amber-300'
      : 'bg-white border-orange-200';

    const textColor = limitReached
      ? 'text-red-700'
      : fetchCount >= 3
      ? 'text-amber-700'
      : 'text-orange-700';

    const countColor = limitReached
      ? 'text-red-600'
      : fetchCount >= 3
      ? 'text-amber-600'
      : 'text-green-600';

    return (
      <div className={`mt-3 flex items-center justify-between rounded-lg border px-3 py-2 ${bgColor}`}>
        <span className={`text-xs font-medium ${textColor}`}>
          {limitReached
            ? '🚫 Daily limit reached — resets tomorrow'
            : `📊 Today's syncs: ${fetchCount} / ${DAILY_FETCH_LIMIT}`
          }
        </span>
        <span className={`text-xs font-semibold ${countColor}`}>
          {limitReached ? 'No attempts left' : `${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} left`}
        </span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ backgroundColor: '#006B64' }}>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-white" />
            <h2 className="text-base font-semibold text-white">Import Publications</h2>
          </div>
          <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

<Tabs defaultValue={defaultTab} className="flex flex-col flex-1 overflow-hidden">          <TabsList className="mx-6 mt-4 mb-0 self-start">
            <TabsTrigger value="scholar" className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Google Scholar Sync
            </TabsTrigger>
            <TabsTrigger value="csv" className="flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              Import CSV (Scopus)
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: Google Scholar ── */}
          <TabsContent value="scholar" className="flex flex-col flex-1 overflow-hidden px-6 pb-6 mt-4">

            {!scholarFetched && !scholarDone && (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-10">
                <div className="w-full max-w-lg bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 text-left">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-orange-800 w-full">
                      <p className="font-medium mb-1">How this works</p>
                      <p>We fetch your public Google Scholar profile and extract all publications listed there. Your Scholar URL must be saved in your profile settings.</p>

                      {/* Rate limit counter */}
                      <RateLimitBadge />

                      {fetchCount >= 3 && !limitReached && (
                        <p className="mt-2 text-xs text-amber-700">
                          ⚠️ Frequent fetches may trigger Google's bot detection. Use remaining attempts carefully.
                        </p>
                      )}
                      {limitReached && (
                        <p className="mt-2 text-xs text-red-700">
                          Google Scholar limits automated access per IP. The counter resets at midnight. Try again tomorrow.
                        </p>
                      )}

                      {!user?.googleScholarUrl && (
                        <p className="mt-2 text-orange-700 font-medium">⚠️ No Google Scholar URL found in your profile. Please add it in Profile Settings first.</p>
                      )}
                      {user?.googleScholarUrl && (
                        <p className="mt-2 text-green-700">✅ Scholar URL found: <span className="font-mono text-xs break-all">{user.googleScholarUrl}</span></p>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={fetchScholarPreview}
                  disabled={scholarLoading || !user?.googleScholarUrl || limitReached}
                  className="text-white px-8 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: limitReached ? '#9ca3af' : '#006B64' }}
                >
                  {scholarLoading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Fetching from Google Scholar...</>
                    : limitReached
                    ? <>🚫 Limit Reached — Try Tomorrow</>
                    : <><RefreshCw className="w-4 h-4 mr-2" />Fetch My Publications</>
                  }
                </Button>

                {scholarError && (
                  <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 max-w-lg text-left">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{scholarError}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Success state with optional similarity report ── */}
            {scholarDone && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex flex-col items-center text-center py-6">
                  <CheckCircle className="w-14 h-14 text-green-500 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Import Complete!</h3>
                  <p className="text-gray-600 text-sm">{scholarDone}</p>
                </div>

                {/* Similarity Report */}
                {similarityReport.length > 0 && (
                  <div className="flex-1 overflow-y-auto">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-amber-800 mb-0.5">
                            Similarity Report — {similarityReport.length} potential duplicate{similarityReport.length > 1 ? 's' : ''} detected
                          </p>
                          <p className="text-xs text-amber-700">
                            We imported one entry from each similar pair. If the skipped entry is actually a different paper, please add it manually.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {similarityReport.map((flag, i) => (
                        <div key={i} className="border border-amber-200 rounded-xl overflow-hidden">
                          <div className="bg-green-50 px-4 py-3 flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-green-200 text-green-800">
                                ✓ IMPORTED
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 leading-snug">{flag.imported.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {flag.imported.journal && <span>{flag.imported.journal}</span>}
                                {flag.imported.year && <span className="ml-2">· {flag.imported.year}</span>}
                                {flag.imported.citations > 0 && <span className="ml-2 text-orange-600">· {flag.imported.citations} citations</span>}
                              </p>
                            </div>
                            {flag.imported.link && (
                              <a href={flag.imported.link} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-800 flex-shrink-0">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>

                          <div className="bg-amber-50 px-4 py-2 border-t border-b border-amber-200">
                            <p className="text-xs text-amber-700">
                              <span className="font-semibold">Why flagged:</span> {flag.similarity}% title word overlap
                              {flag.imported.year === flag.skipped.year && flag.imported.year
                                ? ` + both published in ${flag.imported.year}`
                                : ''
                              }
                            </p>
                          </div>

                          <div className="bg-red-50 px-4 py-3 flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-200 text-red-800">
                                ✗ SKIPPED
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 leading-snug">{flag.skipped.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {flag.skipped.journal && <span>{flag.skipped.journal}</span>}
                                {flag.skipped.year && <span className="ml-2">· {flag.skipped.year}</span>}
                                {flag.skipped.citations > 0 && <span className="ml-2 text-orange-600">· {flag.skipped.citations} citations</span>}
                              </p>
                              <p className="text-xs text-amber-600 mt-1 font-medium">
                                If this is a different paper, please add it manually via "Add New Publication"
                              </p>
                            </div>
                            {flag.skipped.link && (
                              <a href={flag.skipped.link} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-800 flex-shrink-0">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t flex justify-center">
                  <Button onClick={handleClose} style={{ backgroundColor: '#006B64' }} className="text-white px-8">
                    Done
                  </Button>
                </div>
              </div>
            )}

            {/* Preview list */}
            {scholarFetched && !scholarDone && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-600">
                    Found <span className="font-semibold text-gray-900">{scholarPreviews.length}</span> publications.
                    Select which ones to import.
                  </p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleAllScholar(true)} className="text-xs text-teal-700 hover:underline">Select all</button>
                    <button onClick={() => toggleAllScholar(false)} className="text-xs text-gray-500 hover:underline">Deselect all</button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto border rounded-xl divide-y">
                  {scholarPreviews.map((pub, i) => (
                    <div
                      key={i}
                      onClick={() => toggleScholarItem(i)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${pub.selected ? 'bg-teal-50' : 'bg-white hover:bg-gray-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={pub.selected}
                        onChange={() => toggleScholarItem(i)}
                        onClick={e => e.stopPropagation()}
                        className="mt-1 accent-teal-600 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-snug">{pub.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {pub.journal && <span>{pub.journal}</span>}
                          {pub.year && <span className="ml-2 text-gray-400">· {pub.year}</span>}
                          {pub.citations > 0 && <span className="ml-2 text-orange-600">· {pub.citations} citations</span>}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{pub.authors}</p>
                      </div>
                      {pub.link && (
                        <a
                          href={pub.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-teal-600 hover:text-teal-800 flex-shrink-0 mt-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {scholarError && (
                  <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-left">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{scholarError}</p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">{scholarSelectedCount} of {scholarPreviews.length} selected</p>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => { setScholarFetched(false); setScholarPreviews([]); }}>
                      ← Back
                    </Button>
                    <Button
                      onClick={handleScholarImport}
                      disabled={scholarImporting || scholarSelectedCount === 0}
                      className="text-white px-6"
                      style={{ backgroundColor: '#006B64' }}
                    >
                      {scholarImporting
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
                        : <>Import {scholarSelectedCount} Publication{scholarSelectedCount !== 1 ? 's' : ''}</>
                      }
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── TAB 2: CSV Import ── */}
          <TabsContent value="csv" className="flex flex-col flex-1 overflow-hidden px-6 pb-6 mt-4">

            {!csvParsed && !csvDone && (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-8">
                <div className="w-full max-w-lg bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-2">How to export from Scopus</p>
                      <ol className="list-decimal list-inside space-y-1 text-blue-700">
                        <li>Go to your Scopus profile page</li>
                        <li>Click <strong>Documents</strong> tab</li>
                        <li>Select all documents (checkbox at top)</li>
                        <li>Click <strong>Export</strong> → choose <strong>CSV</strong></li>
                        <li>Upload the downloaded file below</li>
                      </ol>
                      <p className="mt-2 text-blue-600 text-xs">Also works with Google Scholar CSV exports.</p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-lg border-2 border-dashed border-gray-300 rounded-xl p-10 cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-colors"
                >
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Click to upload CSV file</p>
                  <p className="text-xs text-gray-400 mt-1">Scopus or Google Scholar export · .csv format</p>
                  {csvFileName && (
                    <p className="text-sm text-teal-700 mt-3 font-medium">📄 {csvFileName}</p>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {csvError && (
                  <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 max-w-lg text-left">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{csvError}</p>
                  </div>
                )}
              </div>
            )}

            {csvDone && (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-10">
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Complete!</h3>
                <p className="text-gray-600 mb-6">{csvDone}</p>
                <Button onClick={handleClose} style={{ backgroundColor: '#006B64' }} className="text-white px-8">
                  Done
                </Button>
              </div>
            )}

            {csvParsed && !csvDone && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-600">
                    Found <span className="font-semibold text-gray-900">{csvRows.length}</span> rows in <span className="font-medium">{csvFileName}</span>.
                  </p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleAllCsv(true)} className="text-xs text-teal-700 hover:underline">Select all</button>
                    <button onClick={() => toggleAllCsv(false)} className="text-xs text-gray-500 hover:underline">Deselect all</button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto border rounded-xl divide-y">
                  {csvRows.map((row, i) => {
                    const title = row.Title || row.title || row['Article Title'] || 'Untitled';
                    const journal = row['Source title'] || row['source title'] || row.Journal || row['Publication Name'] || '';
                    const year = row.Year || row.year || row['Publication Year'] || '';
                    const authors = row.Authors || row.authors || '';
                    const citations = row['Cited by'] || row['cited by'] || row.Citations || '';
                    return (
                      <div
                        key={i}
                        onClick={() => toggleCsvItem(i)}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${csvSelected[i] ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={csvSelected[i]}
                          onChange={() => toggleCsvItem(i)}
                          onClick={e => e.stopPropagation()}
                          className="mt-1 accent-teal-600 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 leading-snug">{title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {journal && <span>{journal}</span>}
                            {year && <span className="ml-2 text-gray-400">· {year}</span>}
                            {citations && <span className="ml-2 text-blue-600">· {citations} citations</span>}
                          </p>
                          {authors && <p className="text-xs text-gray-400 mt-0.5 truncate">{authors}</p>}
                        </div>
                        <FileText className="w-3.5 h-3.5 text-gray-300 mt-1 flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>

                {csvError && (
                  <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-left">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{csvError}</p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">{csvSelectedCount} of {csvRows.length} selected</p>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => { setCsvParsed(false); setCsvRows([]); setCsvFileName(''); }}>
                      ← Upload different file
                    </Button>
                    <Button
                      onClick={handleCsvImport}
                      disabled={csvImporting || csvSelectedCount === 0}
                      className="text-white px-6"
                      style={{ backgroundColor: '#006B64' }}
                    >
                      {csvImporting
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
                        : <>Import {csvSelectedCount} Publication{csvSelectedCount !== 1 ? 's' : ''}</>
                      }
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}