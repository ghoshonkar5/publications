import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GitamLogo } from "./GitamLogo";
import {
  ArrowLeft, Search, Download, RefreshCw, BookOpen, ExternalLink, Plus,
  Database, Pencil, Trash2, CheckCircle, AlertTriangle, FileDown,
  CheckSquare, Square,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent } from "./ui/dialog";
import { AddBookForm } from "./AddBookForm";
import { FilterDropdown } from "./FilterDropdown";
import { FlagDetailPopup } from "./FlagDetailPopup";
import { FlagNotificationBanner } from "./FlagNotificationBanner";
import { useAuth } from "./AuthContext";
import { api } from "../utils/api";
import { generateAcademicYears, parseAcademicYear } from "../utils/academicYears";
import type { BookChapter } from "../utils/mockData";
  import { ScopusSyncModal } from "./ScopusSyncModal";
  import { WosSyncModal } from "./WosSyncModal";
import { ScholarSyncModal } from "./ScholarSyncModal";

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

// ── Edited Badge ──────────────────────────────────────────────────────────────
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

// ── Export Columns ────────────────────────────────────────────────────────────
const BOOKS_EXPORT_COLUMNS: { key: string; label: string }[] = [
  { key: 'title',                 label: 'Title' },
  { key: 'authorName',            label: 'Author Name' },
  { key: 'departmentAffiliation', label: 'Department Affiliation' },
  { key: 'isbnIssn',              label: 'ISBN/ISSN' },
  { key: 'publisher',             label: 'Publisher' },
  { key: 'monthYear',             label: 'Month & Year' },
  { key: 'academicYear',          label: 'Academic Year' },
  { key: 'type',                  label: 'Type' },
  { key: 'link',                  label: 'Link' },
];


// ── Export CSV Modal ──────────────────────────────────────────────────────────
function ExportBooksCSVModal({
  isOpen, onClose, facultyId, authToken,
}: {
  isOpen: boolean; onClose: () => void; facultyId: string; authToken: string;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1989 }, (_, i) => String(currentYear - i));

  const [fromYear, setFromYear] = useState('');
  const [toYear, setToYear] = useState('');
  const [selectedType, setSelectedType] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(BOOKS_EXPORT_COLUMNS.map(c => c.key));
  const [isExporting, setIsExporting] = useState(false);

  const toggleType = (val: string) =>
    setSelectedType(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);

  const toggleColumn = (key: string) =>
    setSelectedColumns(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);

  const handleExport = async () => {
    if (selectedColumns.length === 0) { alert('Please select at least one column.'); return; }
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('facultyId', facultyId);
      if (fromYear) params.set('fromYear', fromYear);
      if (toYear) params.set('toYear', toYear);
      if (selectedType.length === 1) params.set('type', selectedType[0]);
      params.set('columns', selectedColumns.join(','));

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/books/export/csv?${params.toString()}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `books_${facultyId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch {
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
            <h2 className="text-lg font-semibold text-gray-900">Export Books & Chapters to CSV</h2>
          </div>

          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Year Range</p>
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
          </div>

          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Type</p>
            <div className="flex gap-2">
              {['Book', 'Book Chapter'].map(t => (
                <button key={t} onClick={() => toggleType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedType.includes(t) ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
                  }`}>{t}</button>
              ))}
            </div>
            {selectedType.length === 0 && <p className="text-xs text-gray-400 mt-1">No filter — all types included</p>}
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Select Columns to Export</p>
              <div className="flex gap-2">
                <button onClick={() => setSelectedColumns(BOOKS_EXPORT_COLUMNS.map(c => c.key))} className="text-xs text-teal-600 hover:underline">Select All</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => setSelectedColumns([])} className="text-xs text-red-500 hover:underline">Clear All</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border border-gray-100 rounded-xl p-3 bg-gray-50">
              {BOOKS_EXPORT_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={selectedColumns.includes(col.key)} onChange={() => toggleColumn(col.key)} className="w-3.5 h-3.5 accent-teal-600" />
                  <span className={`text-xs ${selectedColumns.includes(col.key) ? 'text-gray-800' : 'text-gray-400'}`}>{col.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{selectedColumns.length} of {BOOKS_EXPORT_COLUMNS.length} columns selected</p>
          </div>

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
export function BooksChaptersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booksChapters, setBooksChapters] = useState<BookChapter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
  const [editingBook, setEditingBook] = useState<BookChapter | null>(null);
const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isScopusSyncOpen, setIsScopusSyncOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isWosSyncOpen, setIsWosSyncOpen] = useState(false);

  // Single delete states
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetTitle, setDeleteTargetTitle] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  // ── Multi-select delete states ─────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiDeleteConfirm, setIsMultiDeleteConfirm] = useState(false);
  const [isMultiDeleting, setIsMultiDeleting] = useState(false);

  // ── Flag states ────────────────────────────────────────────────────────────
  const [myFlags, setMyFlags] = useState<any[]>([]);
  const [isFlagPopupOpen, setIsFlagPopupOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const authToken = localStorage.getItem('authToken') || '';

  useEffect(() => {
    if (user?.facultyId) {
      loadBooksChapters();
      loadMyFlags();
    }
  }, [user]);

  const loadBooksChapters = async () => {
    if (!user?.facultyId) return;
    setIsLoading(true);
    try {
      const response = await api.books.getByFaculty(user.facultyId);
      if (response.success && response.data) setBooksChapters(response.data);
    } catch (error) {
      console.error('Failed to load books and chapters:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  // Flags for books only
  const bookFlags = myFlags.filter(f => f.item_type === 'book' && f.status !== 'resolved');
  const getItemFlags = (bookId: string) => bookFlags.filter(f => String(f.item_id) === bookId);

  // All active flags (all types) for the banner
  const allActiveFlags = myFlags.filter(f => f.status !== 'resolved');

  const syncBooksChapters = async () => {
    if (!user?.facultyId) return;
    setIsLoading(true);
    try {
      const response = await api.syncData(user.facultyId, '');
      if (response.success) { await loadBooksChapters(); setLastSync(new Date()); }
    } catch (error) {
      console.error('Failed to sync books and book chapters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBookChapter = async (bookData: any) => {
    try {
      const response = await api.books.create(bookData);
      if (response.success) await loadBooksChapters();
      else throw new Error(response.message || 'Failed to add book/chapter');
    } catch (error) {
      console.error('Failed to add book/chapter:', error);
      throw error;
    }
  };

  const handleEditBookChapter = async (bookData: any) => {
    if (!editingBook) return;
    try {
      const enrichedData = { ...bookData, lastEditedBy: user?.name || user?.facultyId || 'Unknown' };
      const response = await api.books.update(editingBook.id, enrichedData);
      if (response.success) { await loadBooksChapters(); setEditingBook(null); }
      else throw new Error(response.message || 'Failed to update book/chapter');
    } catch (error) {
      console.error('Failed to edit book/chapter:', error);
      throw error;
    }
  };

  const confirmDelete = (item: BookChapter) => {
    setDeleteTargetId(item.id);
    setDeleteTargetTitle(item.title);
  };

  const handleDeleteBookChapter = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const response = await api.books.delete(deleteTargetId);
      if (response.success) {
        setDeleteTargetId(null);
        setDeleteTargetTitle('');
        await loadBooksChapters();
        setShowDeleteSuccess(true);
        setTimeout(() => setShowDeleteSuccess(false), 2000);
      } else {
        alert('Failed to delete. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete book/chapter:', error);
      alert('Failed to delete. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Multi-select helpers ───────────────────────────────────────────────────
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredBooksChapters.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBooksChapters.map(i => i.id)));
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
      await Promise.all([...selectedIds].map(id => api.books.delete(id)));
      setSelectedIds(new Set());
      setIsMultiDeleteConfirm(false);
      await loadBooksChapters();
      setShowDeleteSuccess(true);
      setTimeout(() => setShowDeleteSuccess(false), 2000);
    } catch (error) {
      alert('Failed to delete some items. Please try again.');
    } finally {
      setIsMultiDeleting(false);
    }
  };

  const allAcademicYears = generateAcademicYears();

  const filteredBooksChapters = booksChapters.filter(item => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      (item.title || '').toLowerCase().includes(s) ||
      (item.authorName || '').toLowerCase().includes(s) ||
      (item.publisher || '').toLowerCase().includes(s) ||
      (item.departmentAffiliation || '').toLowerCase().includes(s);
    const matchesYear = selectedAcademicYear === 'all' || parseAcademicYear(item.academicYear) === selectedAcademicYear;
    return matchesSearch && matchesYear;
  });

  const allSelected = filteredBooksChapters.length > 0 && selectedIds.size === filteredBooksChapters.length;
  const someSelected = selectedIds.size > 0;

  const handleDownloadFile = (bookChapter: BookChapter) => {
    const fileData = (bookChapter as any).fileUrl || bookChapter.fileData;
    if (fileData) {
      const link = document.createElement('a');
      link.href = fileData;
      link.download = bookChapter.fileName || 'book.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const googleScholarUrl = user?.googleScholarUrl || '';
  const scopusUrl = user?.scopusUrl || '';
  const wosUrl = user?.wosUrl || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50">

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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Book/Chapter?</h3>
            <p className="text-gray-500 text-sm mb-1">You are about to delete:</p>
            <p className="text-gray-800 font-medium text-sm mb-4 px-4 line-clamp-2">"{deleteTargetTitle}"</p>
            <p className="text-red-500 text-xs mb-6">This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => { setDeleteTargetId(null); setDeleteTargetTitle(''); }} disabled={isDeleting} className="px-6">Cancel</Button>
              <Button onClick={handleDeleteBookChapter} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white px-6">
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete {selectedIds.size} Items?</h3>
            <p className="text-gray-500 text-sm mb-4">
              You are about to permanently delete <span className="font-semibold text-red-600">{selectedIds.size}</span> selected item{selectedIds.size !== 1 ? 's' : ''}.
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
            <p className="text-gray-600">The item has been removed from your portfolio.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Export CSV Modal ── */}
      <ExportBooksCSVModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        facultyId={user?.facultyId || ''}
        authToken={authToken}
      />

      {/* Header */}
      <header style={{ backgroundColor: '#006B64', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px', position: 'relative', zIndex: 10 }} className="shadow-md overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm">
                <ArrowLeft className="w-4 h-4" />Back
              </button>
              <div className="w-px h-5 bg-white/20" />
              <GitamLogo className="w-8 h-8" />
              <h1 className="text-base font-semibold text-white">Books & Book Chapters Management</h1>
            </div>
            <div className="flex items-center gap-2">
                  <Button onClick={() => setIsScopusSyncOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" />Sync Scopus
              </Button>
              <Button onClick={() => setIsWosSyncOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" />Sync WoS
              </Button>
              <Button onClick={() => setIsImportModalOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <FileDown className="w-3.5 h-3.5 mr-2" />Import CSV
              </Button>
              <Button onClick={() => setIsAddFormOpen(true)}
                className="text-white border text-sm h-8 px-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <Plus className="w-3.5 h-3.5 mr-2" />Add New Book/Chapter
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

        <div className="mb-6">
          <h2 className="text-2xl text-black mb-2">Books & Book Chapters</h2>
          <p style={{ color: "#006B64" }}>Your authored books and book chapters are automatically synced from academic databases and publisher records.</p>
          {lastSync && <p className="text-sm text-gray-500 mt-1">Last synced: {lastSync.toLocaleDateString()} at {lastSync.toLocaleTimeString()}</p>}
        </div>

        {/* Search & Filter Controls */}
        <Card className="mb-6 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl" style={{ overflow: 'visible', position: 'relative', zIndex: 5 }}>
          <CardContent className="p-6" style={{ overflow: 'visible' }}>
            <div className="flex flex-wrap items-center justify-between gap-4" style={{ overflow: 'visible' }}>
              <div className="flex items-center gap-4" style={{ overflow: 'visible' }}>
                <FilterDropdown selectedValue={selectedAcademicYear} onValueChange={setSelectedAcademicYear} options={allAcademicYears} placeholder="All Years" />
                <div className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input placeholder="Search by title, author, or publisher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-gray-50 border-gray-200 focus:border-teal-400 focus:ring-teal-200" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* ── Multi-select delete bar ── */}
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
                <div className="text-xs text-gray-500">{filteredBooksChapters.length} item{filteredBooksChapters.length !== 1 ? 's' : ''} found</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Books & Chapters Table */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
          <CardHeader className="text-white rounded-t-xl" style={{ background: "linear-gradient(135deg, #006B64 0%, #005A54 100%)" }}>
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5" />
                <span>Books & Book Chapters Database</span>
              </div>
              <span className="text-sm bg-white/20 px-2 py-1 rounded-full">{filteredBooksChapters.length} records</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredBooksChapters.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-500 mb-2">No books or book chapters found</div>
                <div className="text-sm text-gray-400 mb-4">Your authored books and book chapters will appear here after syncing with academic databases</div>
                <Button onClick={syncBooksChapters} disabled={isLoading} className="bg-teal-600 hover:bg-teal-700 text-white">
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />Sync Publications
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      {/* ── Select-all checkbox ── */}
                      <TableHead className="w-[48px] text-center">
                        <button
                          onClick={toggleSelectAll}
                          className="flex items-center justify-center w-full text-teal-600 hover:text-teal-800 transition-colors"
                          title={allSelected ? 'Deselect all' : 'Select all'}
                        >
                          {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-gray-400" />}
                        </button>
                      </TableHead>
                      <TableHead className="w-[300px] font-semibold text-gray-700">Title</TableHead>
                      <TableHead className="w-[200px] font-semibold text-gray-700">Name of the Author</TableHead>
                      <TableHead className="w-[200px] font-semibold text-gray-700">Department Affiliation</TableHead>
                      <TableHead className="w-[160px] font-semibold text-gray-700">ISBN/ISSN</TableHead>
                      <TableHead className="w-[180px] font-semibold text-gray-700">Publisher</TableHead>
                      <TableHead className="w-[140px] font-semibold text-gray-700">Month and Year of Publication</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Academic Year</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Type</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">Link</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">File</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBooksChapters.map((item) => {
                      const fileData = (item as any).fileUrl || item.fileData;
                      const isSelected = selectedIds.has(item.id);
                      const itemFlags = getItemFlags(item.id);
                      const isFlagged = itemFlags.length > 0;
                      const flagColor = itemFlags.some(f => f.status === 'flagged') ? 'red' : 'amber';
                      return (
                        <TableRow
                          key={item.id}
                          className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-teal-50 hover:bg-teal-50' : ''} ${isFlagged ? 'bg-red-50/30' : ''}`}
                        >
                          {/* ── Row checkbox ── */}
                          <TableCell className="text-center">
                            <button onClick={() => toggleSelect(item.id)} className="flex items-center justify-center w-full text-teal-600 hover:text-teal-800 transition-colors">
                              {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-gray-300 hover:text-gray-500" />}
                            </button>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-start gap-1.5">
                              {isFlagged && <div className="mt-1 flex-shrink-0"><BlinkingDot color={flagColor} /></div>}
                              <div>
                                <div className="text-sm leading-tight">{item.title}</div>
                                <EditedBadge by={(item as any).lastEditedBy} at={(item as any).lastEditedAt} />
                                {isFlagged && (
                                  <button
                                    onClick={() => setIsFlagPopupOpen(true)}
                                    className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors border border-red-200"
                                  >
                                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: flagColor === 'red' ? '#ef4444' : '#f59e0b', animation: 'pulse 1s infinite' }} />
                                    {itemFlags.length} flag{itemFlags.length > 1 ? 's' : ''} — view & resolve
                                  </button>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><div className="text-sm">{item.authorName}</div></TableCell>
                          <TableCell><div className="text-sm">{item.departmentAffiliation}</div></TableCell>
                          <TableCell><div className="text-sm font-mono">{item.isbnIssn}</div></TableCell>
                          <TableCell><div className="text-sm leading-tight">{item.publisher}</div></TableCell>
                          <TableCell><div className="text-sm">{item.monthYear}</div></TableCell>
                          <TableCell><div className="text-sm">{item.academicYear}</div></TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded-full text-xs text-white" style={{ backgroundColor: item.type === 'Book' ? '#006B64' : '#10B981' }}>
                              {item.type}
                            </span>
                          </TableCell>
                          <TableCell>
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 rounded text-xs text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: "#006B64" }}>
                              <ExternalLink className="w-3 h-3 mr-1" />View
                            </a>
                          </TableCell>
                          <TableCell>
                            {fileData ? (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => { const w = window.open(); w?.document.write(`<html><head><title>${item.fileName || 'Document'}</title></head><body style="margin:0;">${item.fileType?.startsWith('image/') ? `<img src="${fileData}" style="max-width:100%;height:auto;" />` : `<iframe src="${fileData}" style="width:100%;height:100vh;border:none;"></iframe>`}</body></html>`); }} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="View file">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDownloadFile(item)} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50" title="Download file">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">No file uploaded</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setEditingBook(item)} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50" title="Edit book/chapter">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => confirmDelete(item)} className="text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete book/chapter">
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

        {/* Summary Statistics */}
        {filteredBooksChapters.length > 0 && (
          <Card className="mt-8 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
            <CardHeader><CardTitle style={{ color: "#006B64" }}>Publication Statistics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>{booksChapters.filter(i => i.type === 'Book').length}</p>
                  <p className="text-sm" style={{ color: "#005A54" }}>Books</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>{booksChapters.filter(i => i.type === 'Book Chapter').length}</p>
                  <p className="text-sm" style={{ color: "#005A54" }}>Book Chapters</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>{booksChapters.length}</p>
                  <p className="text-sm" style={{ color: "#005A54" }}>Total Publications</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>{new Set(booksChapters.map(i => i.publisher)).size}</p>
                  <p className="text-sm" style={{ color: "#005A54" }}>Publishers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Academic Database Profiles */}
        <Card className="mt-6 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
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

          <AddBookForm isOpen={isAddFormOpen} onClose={() => setIsAddFormOpen(false)} onSubmit={handleAddBookChapter} />
        {editingBook && (
          <AddBookForm isOpen={!!editingBook} onClose={() => setEditingBook(null)} onSubmit={handleEditBookChapter} initialData={editingBook} />
        )}

        {/* ── Scopus Sync Modal ── */}
        <ScopusSyncModal
          isOpen={isScopusSyncOpen}
          onClose={() => setIsScopusSyncOpen(false)}
          onImportComplete={() => { loadBooksChapters(); setLastSync(new Date()); }}
        />

        {/* ── WoS Sync Modal ── */}
        <WosSyncModal
          isOpen={isWosSyncOpen}
          onClose={() => setIsWosSyncOpen(false)}
          onImportComplete={() => { loadBooksChapters(); setLastSync(new Date()); }}
        />

      </main>
      <ScholarSyncModal
  isOpen={isImportModalOpen}
  defaultTab="csv"
  onClose={() => setIsImportModalOpen(false)}
  onImportComplete={() => { loadBooksChapters(); setLastSync(new Date()); }}
/>
    </div>
  );
}