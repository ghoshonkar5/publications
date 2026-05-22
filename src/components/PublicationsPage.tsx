import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GitamLogo } from "./GitamLogo";
import {
  ArrowLeft, Search, Download, RefreshCw, Database, Plus, ExternalLink,
  Pencil, Trash2, CheckCircle, AlertTriangle, CheckSquare, Square,
  AlertCircle, X, FileDown, Filter
} from "lucide-react";

interface SimilarityFlag {
  imported: { title: string; journal: string; year: string; citations: number; link: string };
  skipped: { title: string; journal: string; year: string; citations: number; link: string };
  reason: string;
  similarity: number;
}

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent } from "./ui/dialog";
import { AddPublicationForm } from "./AddPublicationForm";
import { FilterDropdown } from "./FilterDropdown";
import { ScholarSyncModal } from "./ScholarSyncModal";
import { FlagDetailPopup } from "./FlagDetailPopup";
import { FlagNotificationBanner } from "./FlagNotificationBanner";
import { useAuth } from "./AuthContext";
import { api } from "../utils/api";
import { generateAcademicYears, parseAcademicYear } from "../utils/academicYears";
import type { Publication } from "../utils/mockData";
  import { ScopusSyncModal } from "./ScopusSyncModal";
  import { WosSyncModal } from "./WosSyncModal";

interface PublicationsPageProps {
  onBackToDashboard: () => void;
}

// ── Blinking Dot ──────────────────────────────────────────────────────────────
function BlinkingDot({ color }: { color: 'red' | 'amber' }) {
  return (
    <>
      <span
        className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
          color === 'red' ? 'bg-red-500' : 'bg-amber-500'
        }`}
style={{ animation: 'pulse 1s infinite' }}
      />
      <style>{`
        @keyframes flagBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </>
  );
}

// ── All exportable columns ────────────────────────────────────────────────────
const EXPORT_COLUMNS: { key: string; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'journal', label: 'Journal' },
  { key: 'quartile', label: 'Quartile' },
  { key: 'impactFactor', label: 'Impact Factor' },
  { key: 'sjrScore', label: 'SJR Score' },
  { key: 'citeScore', label: 'Cite Score' },
  { key: 'wosCitations', label: 'WoS Citations' },
  { key: 'scopusCitations', label: 'Scopus Citations' },
  { key: 'googleCitations', label: 'Google Citations' },
  { key: 'authors', label: 'Authors' },
  { key: 'indexing', label: 'Indexing' },
  { key: 'source', label: 'Source' },
  { key: 'areaOfPaper', label: 'Area of Paper' },
  { key: 'positionOfAuthor', label: 'Author Position' },
  { key: 'volume', label: 'Volume' },
  { key: 'issue', label: 'Issue' },
  { key: 'startPage', label: 'Start Page' },
  { key: 'lastPage', label: 'Last Page' },
  { key: 'monthYear', label: 'Month Year' },
  { key: 'academicYear', label: 'Academic Year' },
  { key: 'doi', label: 'DOI' },
  { key: 'link', label: 'Link' },
  { key: 'apaFormat', label: 'APA Format' },
];

// ── Indexing options ──────────────────────────────────────────────────────────
const INDEXING_OPTIONS = [
  { value: 'all', label: 'All Indexing' },
  { value: 'Scopus', label: 'Scopus' },
  { value: 'Google Scholar', label: 'Google Scholar' },
  { value: 'Web of Science', label: 'Web of Science' },
  { value: 'PubMed', label: 'PubMed' },
  { value: 'IEEE', label: 'IEEE' },
  { value: 'DBLP', label: 'DBLP' },
];

function EditedBadge({ by, at }: { by?: string | null; at?: string | null }) {
  if (!by || !at) return null;
  const normalized = at.includes('T') ? at : at.replace(' ', 'T');
  const utc = normalized.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(normalized) ? normalized : normalized + 'Z';
  const date = new Date(utc);
  const formatted = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      <span className="text-[10px] text-gray-400">Edited by {by} · {formatted}</span>
    </div>
  );
}

// ── Export CSV Modal ──────────────────────────────────────────────────────────
function ExportCSVModal({
  isOpen,
  onClose,
  facultyId,
  authToken,
}: {
  isOpen: boolean;
  onClose: () => void;
  facultyId: string;
  authToken: string;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1989 }, (_, i) => String(currentYear - i));
  const academicYearOptions = Array.from({ length: currentYear - 1989 }, (_, i) => {
    const start = currentYear - i;
    const end = String(start + 1).slice(2);
    return { value: `${start}-${end}`, label: `${start}-${end}` };
  });

  const [filterMode, setFilterMode] = useState<'range' | 'academic'>('range');
  const [fromYear, setFromYear] = useState('');
  const [toYear, setToYear] = useState('');
  const [selectedAcademicYearExport, setSelectedAcademicYearExport] = useState('');
  const [selectedIndexing, setSelectedIndexing] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedQuartiles, setSelectedQuartiles] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(EXPORT_COLUMNS.map(c => c.key));
  const [isExporting, setIsExporting] = useState(false);

  const toggleIndexing = (val: string) =>
    setSelectedIndexing(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  const toggleSource = (val: string) =>
    setSelectedSources(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  const toggleQuartile = (val: string) =>
    setSelectedQuartiles(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  const toggleColumn = (key: string) =>
    setSelectedColumns(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  const selectAllColumns = () => setSelectedColumns(EXPORT_COLUMNS.map(c => c.key));
  const clearAllColumns = () => setSelectedColumns([]);

  const handleExport = async () => {
    if (selectedColumns.length === 0) { alert('Please select at least one column.'); return; }
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('facultyId', facultyId);

      if (filterMode === 'range') {
        if (fromYear) params.set('fromYear', fromYear);
        if (toYear) params.set('toYear', toYear);
      } else {
        if (selectedAcademicYearExport) {
          const startYear = selectedAcademicYearExport.split('-')[0];
          params.set('fromYear', startYear);
          params.set('toYear', startYear);
        }
      }

      if (selectedIndexing.length > 0) params.set('indexing', selectedIndexing.join(','));
      if (selectedSources.length > 0) params.set('source', selectedSources.join(','));
      if (selectedQuartiles.length > 0) params.set('quartile', selectedQuartiles.join(','));
      params.set('columns', selectedColumns.join(','));

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/publications/export/csv?${params.toString()}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `publications_${facultyId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      alert('Failed to export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="p-2">
          <div className="flex items-center gap-2 mb-5">
            <FileDown className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-900">Export Publications to CSV</h2>
          </div>

          {/* Year Filter Mode Toggle */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Year</p>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => { setFilterMode('range'); setSelectedAcademicYearExport(''); }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filterMode === 'range'
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
                }`}
              >
                Year Range
              </button>
              <button
                onClick={() => { setFilterMode('academic'); setFromYear(''); setToYear(''); }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filterMode === 'academic'
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
                }`}
              >
                Academic Year
              </button>
            </div>

            {filterMode === 'range' ? (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">From Year</label>
                  <select value={fromYear} onChange={e => setFromYear(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
                    <option value="">All Years</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <span className="text-gray-400 mt-5">—</span>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">To Year</label>
                  <select value={toYear} onChange={e => setToYear(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
                    <option value="">All Years</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Select Academic Year</label>
                <select value={selectedAcademicYearExport} onChange={e => setSelectedAcademicYearExport(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
                  <option value="">All Academic Years</option>
                  {academicYearOptions.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Quartile Filter */}
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Quartile</p>
            <div className="flex flex-wrap gap-2">
             {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
  const activeColors: Record<string, string> = {
    Q1: '#16a34a', Q2: '#2563eb', Q3: '#f97316', Q4: '#ef4444'
  };
  const isActive = selectedQuartiles.includes(q);
  return (
    <button
      key={q}
      onClick={() => toggleQuartile(q)}
      className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
      style={isActive
        ? { backgroundColor: activeColors[q], color: 'white', borderColor: activeColors[q] }
        : { backgroundColor: 'white', color: '#4b5563', borderColor: '#d1d5db' }
      }
    >{q}</button>
  );
})}
            </div>
            {selectedQuartiles.length === 0 && <p className="text-xs text-gray-400 mt-1">No filter — all quartiles included</p>}
          </div>

          {/* Indexing Filter */}
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Indexing</p>
            <div className="flex flex-wrap gap-2">
              {['Scopus', 'Google Scholar', 'Web of Science'].map(idx => (
                <button key={idx} onClick={() => toggleIndexing(idx)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedIndexing.includes(idx)
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
                  }`}>{idx}</button>
              ))}
            </div>
            {selectedIndexing.length === 0 && <p className="text-xs text-gray-400 mt-1">No filter — all indexing included</p>}
          </div>

          {/* Source Filter */}
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Import Source</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'google_scholar', label: 'Google Scholar' },
                { value: 'scopus', label: 'Scopus' },
                { value: 'web_of_science', label: 'Web of Science' },
                { value: 'manual', label: 'Manually Added' },
              ].map(src => (
                <button key={src.value} onClick={() => toggleSource(src.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedSources.includes(src.value)
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
                  }`}>{src.label}</button>
              ))}
            </div>
            {selectedSources.length === 0 && <p className="text-xs text-gray-400 mt-1">No filter — all sources included</p>}
          </div>

          {/* Column Selector */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Select Columns to Export</p>
              <div className="flex gap-2">
                <button onClick={selectAllColumns} className="text-xs text-teal-600 hover:underline">Select All</button>
                <span className="text-gray-300">|</span>
                <button onClick={clearAllColumns} className="text-xs text-red-500 hover:underline">Clear All</button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-gray-100 rounded-xl p-3 bg-gray-50">
              {EXPORT_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={selectedColumns.includes(col.key)} onChange={() => toggleColumn(col.key)} className="w-3.5 h-3.5 accent-teal-600" />
                  <span className={`text-xs ${selectedColumns.includes(col.key) ? 'text-gray-800' : 'text-gray-400'}`}>{col.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{selectedColumns.length} of {EXPORT_COLUMNS.length} columns selected</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>Cancel</Button>
            <Button onClick={handleExport} disabled={isExporting || selectedColumns.length === 0} className="bg-teal-600 hover:bg-teal-700 text-white">
              <FileDown className="w-4 h-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
// ── Main Page ─────────────────────────────────────────────────────────────────
export function PublicationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
const [selectedIndexingFilter, setSelectedIndexingFilter] = useState<string[]>([]);



  const [editingPublication, setEditingPublication] = useState<Publication | null>(null);
  const [isScholarModalOpen, setIsScholarModalOpen] = useState(false);
const [scholarDefaultTab, setScholarDefaultTab] = useState<'scholar' | 'csv'>('scholar');

  const [isScopusSyncOpen, setIsScopusSyncOpen] = useState(false);
  const [isWosSyncOpen, setIsWosSyncOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  // Single delete states
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetTitle, setDeleteTargetTitle] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  // Multi-select delete states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiDeleteConfirm, setIsMultiDeleteConfirm] = useState(false);
  const [isMultiDeleting, setIsMultiDeleting] = useState(false);

  // Similarity warnings state
  const [similarityWarnings, setSimilarityWarnings] = useState<SimilarityFlag[]>([]);

  // ── Flag states ────────────────────────────────────────────────────────────
  const [myFlags, setMyFlags] = useState<any[]>([]);
  const [isFlagPopupOpen, setIsFlagPopupOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [potentialFlags, setPotentialFlags] = useState<any[]>([]);
  const [potentialFlagNotes, setPotentialFlagNotes] = useState<Record<number, string>>({});
  const [submittingPotential, setSubmittingPotential] = useState<number | null>(null);
  const [expandedPotential, setExpandedPotential] = useState<number | null>(null);
  const authToken = localStorage.getItem('authToken') || '';

   useEffect(() => {
    if (user?.facultyId) {
      loadPublications();
      loadMyFlags();
      loadPotentialFlags();
    }
  }, [user]);

  const loadPublications = async () => {
    if (!user?.facultyId) return;
    setIsLoading(true);
    try {
      const response = await api.publications.getByFaculty(user.facultyId);
      if (response.success && response.data) setPublications(response.data);
    } catch (error) {
      console.error('Failed to load publications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Load flags for this faculty ───────────────────────────────────────────
  const loadMyFlags = async () => {
    if (!user?.facultyId) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/flags/faculty/${user.facultyId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const json = await res.json();
      if (json.success) setMyFlags(json.data);
    } catch (err) {
      console.error('Failed to load flags:', err);
    }
  };

// FIND:
  // ── Mark a flag resolved ──────────────────────────────────────────────────

// REPLACE WITH:
  // ── Load potential flags ──────────────────────────────────────────────────
  const loadPotentialFlags = async () => {
    if (!user?.facultyId) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/potential-flags/faculty/${user.facultyId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const json = await res.json();
      if (json.success) setPotentialFlags(json.data);
    } catch (err) {
      console.error('Failed to load potential flags:', err);
    }
  };

  // ── Submit potential flag fix ─────────────────────────────────────────────
  const handlePotentialFlagSubmit = async (pfId: number) => {
    const note = potentialFlagNotes[pfId]?.trim();
    if (!note) return;
    setSubmittingPotential(pfId);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/potential-flags/${pfId}/resolve`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ facultyNote: note }),
        }
      );
      const json = await res.json();
      if (json.success) {
        setPotentialFlags(prev => prev.filter(pf => pf.id !== pfId));
        setPotentialFlagNotes(prev => { const n = { ...prev }; delete n[pfId]; return n; });
        setExpandedPotential(null);
        await loadPublications();
      } else {
        alert(json.message || 'Please fill in the missing fields first, then submit.');
      }
    } catch (err) {
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmittingPotential(null);
    }
  };

  // ── Mark a flag resolved ──────────────────────────────────────────────────
  const handleMarkResolved = async (flagId: number, note?: string) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/flags/${flagId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ facultyNote: note || '' }),
      });
      await loadMyFlags();
    } catch (err) {
      console.error('Failed to mark resolved:', err);
    }
  };

  // ── Flags for publications only ───────────────────────────────────────────
  const pubFlags = myFlags.filter(f => f.item_type === 'publication' && f.status !== 'resolved');
  const flaggedPubIds = new Set(pubFlags.map(f => String(f.item_id)));

  const getItemFlags = (pubId: string) =>
    pubFlags.filter(f => String(f.item_id) === pubId);

  const handleAddPublication = async (publicationData: any) => {
    try {
      const enrichedData = { ...publicationData, apaFormat: generateAPAFormat(publicationData) };
      const response = await api.publications.create(enrichedData);
      if (response.success) await loadPublications();
      else throw new Error(response.message || 'Failed to add publication');
    } catch (error: any) {
      console.error('Failed to add publication:', error);
      throw error;
    }
  };

  const handleEditPublication = async (publicationData: any) => {
    if (!editingPublication) return;
    try {
      const enrichedData = {
        ...publicationData,
        apaFormat: generateAPAFormat(publicationData),
        lastEditedBy: user?.name || user?.facultyId || 'Unknown',
      };
      const response = await api.publications.update(editingPublication.id, enrichedData);
      if (response.success) { await loadPublications(); setEditingPublication(null); }
      else throw new Error(response.message || 'Failed to update publication');
    } catch (error) {
      console.error('Failed to edit publication:', error);
      throw error;
    }
  };

  const confirmDelete = (publication: Publication) => {
    setDeleteTargetId(publication.id);
    setDeleteTargetTitle(publication.title);
  };

  const handleDeletePublication = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const response = await api.publications.delete(deleteTargetId);
      if (response.success) {
        setDeleteTargetId(null);
        setDeleteTargetTitle('');
        await loadPublications();
        setShowDeleteSuccess(true);
        setTimeout(() => setShowDeleteSuccess(false), 2000);
      } else {
        alert('Failed to delete publication. Please try again.');
      }
    } catch (error) {
      alert('Failed to delete publication. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPublications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPublications.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleMultiDelete = async () => {
    setIsMultiDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => api.publications.delete(id)));
      setSelectedIds(new Set());
      setIsMultiDeleteConfirm(false);
      await loadPublications();
      setShowDeleteSuccess(true);
      setTimeout(() => setShowDeleteSuccess(false), 2000);
    } catch (error) {
      alert('Failed to delete some publications. Please try again.');
    } finally {
      setIsMultiDeleting(false);
    }
  };

  const generateAPAFormat = (data: any): string => {
    const authors = Array.isArray(data.authors) ? data.authors.join(', ') : data.authors;
    const year = data.monthYear?.split(' ')?.[1] || new Date().getFullYear();
    let apa = `${authors} (${year}). ${data.title}. ${data.journal}`;
    if (data.volume) apa += `, ${data.volume}`;
    if (data.issue) apa += `(${data.issue})`;
    if (data.startPage && data.lastPage) apa += `, ${data.startPage}-${data.lastPage}`;
    if (data.doi) apa += `. https://doi.org/${data.doi}`;
    return apa + '.';
  };

  const allAcademicYears = generateAcademicYears();
  const googleScholarUrl = user?.googleScholarUrl || '';
  const scopusUrl = user?.scopusUrl || '';
  const wosUrl = user?.wosUrl || '';

  const filteredPublications = publications.filter(pub => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      (pub.title || '').toLowerCase().includes(s) ||
      (pub.journal || '').toLowerCase().includes(s) ||
      (Array.isArray(pub.authors) ? pub.authors : []).some(a => (a || '').toLowerCase().includes(s));
    const matchesYear = selectedAcademicYear === 'all' || parseAcademicYear(pub.academicYear) === selectedAcademicYear;
    const matchesIndexing = selectedIndexingFilter.length === 0 ||
  selectedIndexingFilter.every(f =>
    (pub.indexing || '').toLowerCase().includes(f.toLowerCase())
  );
    return matchesSearch && matchesYear && matchesIndexing;
  });

  const allSelected = filteredPublications.length > 0 && selectedIds.size === filteredPublications.length;
  const someSelected = selectedIds.size > 0;

  const handleDownloadFile = (publication: Publication) => {
    const fileData = (publication as any).fileUrl || publication.fileData;
    if (fileData) {
      const link = document.createElement('a');
      link.href = fileData;
      link.download = publication.fileName || 'publication.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const stats = {
    total: publications.length,
    q1: publications.filter(p => p.quartile === 'Q1').length,
    q2: publications.filter(p => p.quartile === 'Q2').length,
    q3q4: publications.filter(p => p.quartile === 'Q3' || p.quartile === 'Q4').length,
    scopus: publications.filter(p => (p.indexing || '').toLowerCase().includes('scopus')).length,
    scholar: publications.filter(p => (p.indexing || '').toLowerCase().includes('google scholar')).length,
    wos: publications.filter(p => {
      const idx = (p.indexing || '').toLowerCase();
      return idx.includes('web of science') || idx.includes('wos');
    }).length,
  };

  // All flags (all types) for banner + popup — show unresolved only
  const allActiveFlags = myFlags.filter(f => f.status !== 'resolved');

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50">

      {/* ── Scholar Sync Modal ── */}
      {/* ── Scholar Sync Modal ── */}
      <ScholarSyncModal
  isOpen={isScholarModalOpen}
  defaultTab={scholarDefaultTab}
  onClose={() => { setIsScholarModalOpen(false); setScholarDefaultTab('scholar'); }}
  onImportComplete={async (report) => {
    await loadPublications();
    setLastSync(new Date());
    if (report && report.length > 0) setSimilarityWarnings(report);
  }}
/>

      {/* ── Scopus Sync Modal ── */}
      <ScopusSyncModal
        isOpen={isScopusSyncOpen}
        onClose={() => setIsScopusSyncOpen(false)}
        onImportComplete={() => { loadPublications(); setLastSync(new Date()); }}
      />

      {/* ── WoS Sync Modal ── */}
      <WosSyncModal
        isOpen={isWosSyncOpen}
        onClose={() => setIsWosSyncOpen(false)}
        onImportComplete={() => { loadPublications(); setLastSync(new Date()); }}
      />


      {/* ── Export CSV Modal ── */}
      <ExportCSVModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        facultyId={user?.facultyId || ''}
        authToken={authToken}
      />

      {/* ── Flag Detail Popup ── */}
      <FlagDetailPopup
        isOpen={isFlagPopupOpen}
        onClose={() => setIsFlagPopupOpen(false)}
        flags={allActiveFlags}
        onMarkResolved={handleMarkResolved}
      />

      {/* ── Single Delete Confirmation Modal ── */}
      <Dialog open={!!deleteTargetId} onOpenChange={() => { setDeleteTargetId(null); setDeleteTargetTitle(''); }}>
        <DialogContent className="max-w-md">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Publication?</h3>
            <p className="text-gray-500 text-sm mb-1">You are about to delete:</p>
            <p className="text-gray-800 font-medium text-sm mb-4 px-4 line-clamp-2">"{deleteTargetTitle}"</p>
            <p className="text-red-500 text-xs mb-6">This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => { setDeleteTargetId(null); setDeleteTargetTitle(''); }} disabled={isDeleting} className="px-6">Cancel</Button>
              <Button onClick={handleDeletePublication} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white px-6">
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Multi Delete Confirmation Modal ── */}
      <Dialog open={isMultiDeleteConfirm} onOpenChange={setIsMultiDeleteConfirm}>
        <DialogContent className="max-w-md">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete {selectedIds.size} Publications?</h3>
            <p className="text-gray-500 text-sm mb-4">
              You are about to permanently delete <span className="font-semibold text-red-600">{selectedIds.size}</span> selected publication{selectedIds.size !== 1 ? 's' : ''}.
            </p>
            <p className="text-red-500 text-xs mb-6">This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setIsMultiDeleteConfirm(false)} disabled={isMultiDeleting} className="px-6">Cancel</Button>
              <Button onClick={handleMultiDelete} disabled={isMultiDeleting} className="bg-red-600 hover:bg-red-700 text-white px-6">
                {isMultiDeleting ? 'Deleting...' : `Yes, Delete ${selectedIds.size}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Success Modal ── */}
      <Dialog open={showDeleteSuccess} onOpenChange={setShowDeleteSuccess}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Deleted Successfully!</h3>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
     {/* Header */}
<header style={{ backgroundColor: '#006B64', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px', position: 'relative', zIndex: 10 }} className="shadow-md">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between items-center h-16">

      {/* Left: Back + Logo + Title */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />Back
        </button>
        <div className="w-px h-5 bg-white/20" />
        <GitamLogo className="w-8 h-8" />
        <h1 className="text-base font-semibold text-white">Publications Management</h1>
      </div>

      {/* Right: Action buttons — scroll horizontally on small screens */}
      <div className="flex items-center gap-2 overflow-x-auto flex-shrink-0 max-w-[60%]">
        <Button onClick={() => { setScholarDefaultTab('scholar'); setIsScholarModalOpen(true); }}
          className="text-white border text-sm h-8 px-3 whitespace-nowrap flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Sync Scholar
        </Button>
        <Button onClick={() => setIsScopusSyncOpen(true)}
          className="text-white border text-sm h-8 px-3 whitespace-nowrap flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Sync Scopus
        </Button>
        <Button onClick={() => setIsWosSyncOpen(true)}
          className="text-white border text-sm h-8 px-3 whitespace-nowrap flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Sync WoS
        </Button>
        <Button onClick={() => { setScholarDefaultTab('csv'); setIsScholarModalOpen(true); }}
          className="text-white border text-sm h-8 px-3 whitespace-nowrap flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />Import CSV
        </Button>
        <Button onClick={() => setIsAddFormOpen(true)}
          className="text-white border text-sm h-8 px-3 whitespace-nowrap flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />Add Publication
        </Button>
      </div>

    </div>
  </div>
</header>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ position: 'relative', zIndex: 0 }}>

         {/* ── Flag Notification Banner ── */}
        {allActiveFlags.length > 0 && !bannerDismissed && (
          <FlagNotificationBanner
            flags={allActiveFlags}
            onViewDetails={() => setIsFlagPopupOpen(true)}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}

        {/* ── Potential Flag Banner ── */}
        {potentialFlags.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="inline-block w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" style={{ animation: 'flagBlink 1s infinite' }} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  {potentialFlags.length} publication{potentialFlags.length > 1 ? 's have' : ' has'} incomplete information
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Missing fields were detected during import. Please edit and submit to resolve.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-teal-800 mb-2">Publications Portfolio</h2>
          <p className="text-teal-600">Sync from Google Scholar, Scopus or import a Scopus CSV export, or add publications manually.</p>
          {lastSync && (
            <p className="text-sm text-gray-500 mt-1">Last synced: {lastSync.toLocaleDateString()} at {lastSync.toLocaleTimeString()}</p>
          )}
        </div>

        {/* ── Similarity Warnings Card ── */}
        {similarityWarnings.length > 0 && (
          <Card className="mb-6 border-amber-200 bg-amber-50 shadow-md rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      Similarity Report — {similarityWarnings.length} potential duplicate{similarityWarnings.length > 1 ? 's' : ''} detected during last import
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      We imported one entry from each similar pair. If the skipped entry is a different paper, add it manually.
                    </p>
                  </div>
                </div>
                <button onClick={() => setSimilarityWarnings([])} className="text-amber-500 hover:text-amber-700 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {similarityWarnings.map((flag, i) => (
                  <div key={i} className="bg-white border border-amber-200 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-100">
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">IMPORTED</span>
                      <p className="text-xs font-medium text-gray-800 truncate flex-1">{flag.imported.title}</p>
                      {flag.imported.link && (
                        <a href={flag.imported.link} target="_blank" rel="noopener noreferrer" className="text-teal-600 flex-shrink-0">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="px-3 py-1 bg-amber-50 border-b border-amber-100">
                      <p className="text-[10px] text-amber-600">
                        {flag.similarity}% title match{flag.imported.year === flag.skipped.year && flag.imported.year ? ` · both published in ${flag.imported.year}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">SKIPPED</span>
                      <p className="text-xs text-gray-600 truncate flex-1">{flag.skipped.title}</p>
                      {flag.skipped.link && (
                        <a href={flag.skipped.link} target="_blank" rel="noopener noreferrer" className="text-teal-600 flex-shrink-0">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <Card className="mb-6 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl" style={{ overflow: 'visible', position: 'relative', zIndex: 5 }}>
          <CardContent className="p-6" style={{ overflow: 'visible' }}>
            <div className="flex flex-wrap items-center justify-between gap-4" style={{ overflow: 'visible' }}>
              <div className="flex flex-wrap items-center gap-3" style={{ overflow: 'visible' }}>
                <FilterDropdown selectedValue={selectedAcademicYear} onValueChange={setSelectedAcademicYear} options={allAcademicYears} placeholder="All Years" />

<div className="flex items-center gap-2 flex-wrap">
{['Scopus', 'Google Scholar', 'WoS'].map(idx => {
    const active = selectedIndexingFilter.includes(idx);
    return (
      <button
        key={idx}
        onClick={() =>
          setSelectedIndexingFilter(prev =>
            prev.includes(idx) ? prev.filter(x => x !== idx) : [...prev, idx]
          )
        }
        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
          active
            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
            : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400 hover:text-teal-600'
        }`}
      >
        {active ? '✓ ' : ''}{idx}
      </button>
    );
  })}
  {selectedIndexingFilter.length > 0 && (
    <button
      onClick={() => setSelectedIndexingFilter([])}
      className="px-2 py-1.5 rounded-full text-xs text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
    >
      Clear
    </button>
  )}
</div>
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input placeholder="Search publications by title, journal, or author..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-gray-50 border-gray-200 focus:border-teal-400 focus:ring-teal-200" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                {someSelected && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                    <span className="text-sm font-medium text-red-700">{selectedIds.size} selected</span>
                    <Button size="sm" onClick={() => setIsMultiDeleteConfirm(true)} className="bg-red-600 hover:bg-red-700 text-white h-7 px-3 text-xs">
                      <Trash2 className="w-3.5 h-3.5 mr-1" />Delete Selected
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-red-500 hover:bg-red-100 h-7 px-2 text-xs">Clear</Button>
                  </div>
                )}
                <Button onClick={() => setIsExportModalOpen(true)} variant="outline" size="sm" className="border-teal-300 text-teal-700 hover:bg-teal-50 h-9 px-3 text-sm">
                  <FileDown className="w-4 h-4 mr-1.5" />Export CSV
                </Button>
                <div className="text-xs text-gray-500">{filteredPublications.length} publication{filteredPublications.length !== 1 ? 's' : ''} found</div>
              </div>
            </div>

{(selectedIndexingFilter.length > 0 || selectedAcademicYear !== 'all') && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Active filters:</span>
                {selectedAcademicYear !== 'all' && (
                  <span className="flex items-center gap-1 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                    {selectedAcademicYear}
                    <button onClick={() => setSelectedAcademicYear('all')} className="hover:text-teal-900"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedIndexingFilter.map(f => (
  <span key={f} className="flex items-center gap-1 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
    {f}
    <button onClick={() => setSelectedIndexingFilter(prev => prev.filter(x => x !== f))} className="hover:text-teal-900"><X className="w-3 h-3" /></button>
  </span>
))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Publications Table */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl overflow-hidden" style={{ marginTop: '24px', position: 'relative', zIndex: 1 }}>
          <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-700 text-white">
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Publications Database</span>
              <span className="ml-auto text-sm bg-white/20 px-2 py-1 rounded-full">{filteredPublications.length} records</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPublications.length === 0 ? (
              <div className="text-center py-16">
                <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-500 mb-2">No publications found</div>
                <div className="text-sm text-gray-400 mb-6">Import from Google Scholar, upload a Scopus CSV, or add manually</div>
                <div className="flex items-center justify-center gap-3">
                  <Button onClick={() => setIsScholarModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white">
                    <RefreshCw className="w-4 h-4 mr-2" />Sync from Scholar / CSV
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddFormOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />Add Manually
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[48px] text-center">
                        <button onClick={toggleSelectAll} className="flex items-center justify-center w-full text-teal-600 hover:text-teal-800 transition-colors" title={allSelected ? 'Deselect all' : 'Select all'}>
                          {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-gray-400" />}
                        </button>
                      </TableHead>
                      <TableHead className="w-[300px] font-semibold text-gray-700">Title</TableHead>
                      <TableHead className="w-[200px] font-semibold text-gray-700">Journal</TableHead>
                      <TableHead className="w-[80px] font-semibold text-gray-700">Quartile</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">Impact Factor</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">SJR Score</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">CiteScore</TableHead>
                      <TableHead className="w-[80px] font-semibold text-gray-700">WOS Citations</TableHead>
                      <TableHead className="w-[80px] font-semibold text-gray-700">Scopus Citations</TableHead>
                      <TableHead className="w-[80px] font-semibold text-gray-700">Google Citations</TableHead>
                      <TableHead className="w-[200px] font-semibold text-gray-700">Authors</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Indexing</TableHead>
                      <TableHead className="w-[150px] font-semibold text-gray-700">Area of Paper</TableHead>
                      <TableHead className="w-[300px] font-semibold text-gray-700">APA Format</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Author Position</TableHead>
                      <TableHead className="w-[80px] font-semibold text-gray-700">Volume</TableHead>
                      <TableHead className="w-[80px] font-semibold text-gray-700">Issue</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Pages</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Month Year</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Academic Year</TableHead>
                      <TableHead className="w-[150px] font-semibold text-gray-700">DOI</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">Link</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">File</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPublications.map((publication) => {
                      const fileData = (publication as any).fileUrl || publication.fileData;
                      const isSelected = selectedIds.has(publication.id);
                      const itemFlags = getItemFlags(publication.id);
                      const isFlagged = itemFlags.length > 0;
                      const flagColor = itemFlags.some(f => f.status === 'flagged') ? 'red' : 'amber';
                      return (
                        <TableRow
                          key={publication.id}
                          className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-teal-50 hover:bg-teal-50' : ''} ${isFlagged ? 'bg-red-50/30' : ''}`}
                        >
                          <TableCell className="text-center">
                            <button onClick={() => toggleSelect(publication.id)} className="flex items-center justify-center w-full text-teal-600 hover:text-teal-800 transition-colors">
                              {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-gray-300 hover:text-gray-500" />}
                            </button>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-start gap-1.5">
                              {isFlagged && <div className="mt-1 flex-shrink-0"><BlinkingDot color={flagColor} /></div>}
                              <div>
                                <div className="text-sm leading-tight">{publication.title}</div>
                                <EditedBadge by={(publication as any).lastEditedBy} at={(publication as any).lastEditedAt} />
                             {isFlagged && (
  <button
    onClick={() => setIsFlagPopupOpen(true)}
    className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors border border-red-200"
  >
    <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', backgroundColor: flagColor === 'red' ? '#ef4444' : '#f59e0b', animation:'pulse 1s infinite' }} />
    {itemFlags.length} flag{itemFlags.length > 1 ? 's' : ''} — view & resolve
  </button>
)}
                                {(() => {
                                  const pf = potentialFlags.find(p => String(p.publication_id) === publication.id);
                                  if (!pf) return null;
                                  const isExpanded = expandedPotential === pf.id;
                                  return (
                                    <div className="mt-1.5">
                                      <button
                                        onClick={() => setExpandedPotential(isExpanded ? null : pf.id)}
                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors border border-amber-200"
                                      >
                                        <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', backgroundColor:'#f59e0b', animation:'pulse 1s infinite' }} />
                                        ⚠️ Missing: {pf.missing_fields.join(', ')} — Fix & Submit
                                      </button>
                                      {isExpanded && (
                                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                          <p className="text-[10px] text-amber-700 font-medium mb-1">
                                            1. Edit this publication to fill the missing fields<br/>
                                            2. Describe what you fixed below and submit
                                          </p>
                                          <textarea
                                            value={potentialFlagNotes[pf.id] || ''}
                                            onChange={e => setPotentialFlagNotes(prev => ({ ...prev, [pf.id]: e.target.value }))}
                                            placeholder="Describe what you fixed..."
                                            rows={2}
                                            className="w-full border border-amber-300 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none mb-1.5 bg-white"
                                          />
                                         <div className="flex flex-col gap-1.5">
  <button
    onClick={() => handlePotentialFlagSubmit(pf.id)}
  style={{ backgroundColor: '#d97706', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', width: '100%', cursor: 'pointer' }}
  >
    {submittingPotential === pf.id ? 'Submitting...' : '✓ Submit Fix'}
  </button>
                                            <button
                                              onClick={() => setEditingPublication(publication)}
                                              className="flex items-center gap-1 px-2 py-1 bg-white border border-amber-300 text-amber-700 text-[10px] font-medium rounded-lg hover:bg-amber-50 transition-colors"
                                            >
                                              ✏️ Edit Publication
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{publication.journal}</TableCell>
                          <TableCell>
                            {publication.quartile ? (
  <span className={`px-2 py-1 rounded-full text-xs text-white ${
    publication.quartile === 'Q1' ? 'bg-green-600' :
    publication.quartile === 'Q2' ? 'bg-blue-600' :
    publication.quartile === 'Q3' ? 'bg-orange-600' : 'bg-red-600'
  }`}>{publication.quartile}</span>
) : <span className="text-xs text-gray-400">N/A</span>}
                          </TableCell>
                         <TableCell>{publication.impactFactor || '—'}</TableCell>
                          <TableCell>{(publication as any).sjrScore || '—'}</TableCell>
                          <TableCell>{publication.citeScore || '—'}</TableCell>
                          <TableCell className="text-center">{publication.wosCitations}</TableCell>
                          <TableCell className="text-center">{publication.scopusCitations}</TableCell>
                          <TableCell className="text-center">{publication.googleCitations}</TableCell>
                          <TableCell><div className="text-sm">{Array.isArray(publication.authors) ? publication.authors.join(', ') : publication.authors}</div></TableCell>
                          <TableCell>{publication.indexing}</TableCell>
                          <TableCell>{publication.areaOfPaper}</TableCell>
                          <TableCell><div className="text-xs leading-tight">{publication.apaFormat}</div></TableCell>
                          <TableCell>{publication.positionOfAuthor}</TableCell>
                          <TableCell>{publication.volume}</TableCell>
                          <TableCell>{publication.issue}</TableCell>
                          <TableCell>{publication.startPage}-{publication.lastPage}</TableCell>
                          <TableCell>{publication.monthYear}</TableCell>
                          <TableCell>{publication.academicYear}</TableCell>
                          <TableCell>
                            <a href={`https://doi.org/${publication.doi}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">{publication.doi}</a>
                          </TableCell>
                          <TableCell>
                            {publication.link && <a href={publication.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">View</a>}
                          </TableCell>
                          <TableCell>
                            {fileData ? (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm"
                                  onClick={() => { const w = window.open(); w?.document.write(`<html><body style="margin:0;">${publication.fileType?.startsWith('image/') ? `<img src="${fileData}" style="max-width:100%;" />` : `<iframe src="${fileData}" style="width:100%;height:100vh;border:none;"></iframe>`}</body></html>`); }}
                                  className="text-blue-600 hover:bg-blue-50">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDownloadFile(publication)} className="text-teal-600 hover:bg-teal-50">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : <span className="text-xs text-gray-400">No file</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setEditingPublication(publication)} className="text-teal-600 hover:bg-teal-50">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => confirmDelete(publication)} className="text-red-500 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Publication Statistics */}
        {publications.length > 0 && (
          <Card className="mt-8 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
            <CardHeader><CardTitle style={{ color: "#006B64" }}>Publication Statistics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { value: stats.total, label: 'Total Publications' },
                  { value: stats.q1, label: 'Q1 Papers' },
                  { value: stats.q2, label: 'Q2 Papers' },
                  { value: stats.q3q4, label: 'Q3/Q4 Papers' },
                ].map((item, i) => (
                  <div key={i} className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                    <p className="text-2xl font-medium" style={{ color: "#006B64" }}>{item.value}</p>
                    <p className="text-sm" style={{ color: "#005A54" }}>{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {[
                  { value: stats.scopus, label: 'Scopus Publications', sublabel: 'Indexed in Scopus' },
{ value: stats.scholar, label: 'Scholar Publications', sublabel: 'Indexed in Google Scholar' },
{ value: stats.wos, label: 'WoS Publications', sublabel: 'Indexed in Web of Science' },

                ].map((item, i) => (
                  <div key={i} className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                    <p className="text-2xl font-medium" style={{ color: "#006B64" }}>{item.value}</p>
                    <p className="text-sm font-medium" style={{ color: "#005A54" }}>{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.sublabel}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Academic Database Profiles */}
        <Card className="mt-6 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl" style={{ position: 'relative', zIndex: 1 }}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" style={{ color: "#006B64" }} />
              <span style={{ color: "#006B64" }}>Academic Database Profiles</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { url: googleScholarUrl, label: 'Google Scholar', desc: 'H-index and comprehensive citations', colorClass: 'from-orange-50 to-orange-100', textColor: 'text-orange-700', iconColor: 'text-orange-600' },
                { url: scopusUrl, label: 'Scopus', desc: 'Publications, citations, and indexing data', colorClass: 'from-blue-50 to-blue-100', textColor: 'text-blue-700', iconColor: 'text-blue-600' },
                { url: wosUrl, label: 'Web of Science', desc: 'Impact factors and citation metrics', colorClass: 'from-green-50 to-green-100', textColor: 'text-green-700', iconColor: 'text-green-600' },
              ].map(({ url, label, desc, colorClass, textColor, iconColor }) => (
                url ? (
                  <a key={label} href={url} target="_blank" rel="noopener noreferrer" className={`text-center p-4 rounded-lg bg-gradient-to-br ${colorClass} hover:shadow-md transition-shadow cursor-pointer group`}>
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <div className={`text-lg font-semibold ${textColor}`}>{label}</div>
                      <ExternalLink className={`w-4 h-4 ${iconColor} group-hover:translate-x-1 transition-transform`} />
                    </div>
                    <div className={`text-xs ${iconColor}`}>{desc}</div>
                  </a>
                ) : (
                  <div key={label} className={`text-center p-4 rounded-lg bg-gradient-to-br ${colorClass} opacity-50`}>
                    <div className={`text-lg font-semibold ${textColor} mb-1`}>{label}</div>
                    <div className={`text-xs ${iconColor}`}>URL not set — update in profile settings</div>
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Add / Edit Publication Forms */}
        <AddPublicationForm isOpen={isAddFormOpen} onClose={() => setIsAddFormOpen(false)} onSubmit={handleAddPublication} />
        {editingPublication && (
          <AddPublicationForm isOpen={!!editingPublication} onClose={() => setEditingPublication(null)} onSubmit={handleEditPublication} initialData={editingPublication} />
        )}
      </main>
    </div>
  );
}