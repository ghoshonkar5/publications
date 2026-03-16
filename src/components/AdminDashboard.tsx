import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GitamLogo } from "./GitamLogo";
import { FacultyDirectory } from "./FacultyDirectory";
import { FilterDropdown } from "./FilterDropdown";
import { Dialog, DialogContent } from "./ui/dialog";
import { AddPublicationForm } from "./AddPublicationForm";
import { AddConferenceForm } from "./AddConferenceForm";
import { AddBookForm } from "./AddBookForm";
import {
  BookOpen, Users, Book, LogOut, Settings, BarChart3,
  Search, ChevronDown, ChevronUp, ExternalLink, Database,
  FileText, Download, Menu, X, Pencil, Trash2, CheckCircle, AlertTriangle
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { generateAcademicYears, parseAcademicYear } from "../utils/academicYears";
import { api } from "../utils/api";
import type { Publication, Conference, BookChapter } from "../utils/mockData";

interface AdminDashboardProps {
  onLogout: () => void;
}

// ✅ Subtle "last edited" badge
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 1) return 'just now';
    return `${minutes}m ago`;
  }

  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h ago`;
  }

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return `yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  }

  return date.toLocaleString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

function EditedBadge({ by, at }: { by?: string | null; at?: string | null }) {
  if (!by || !at) return null;
  const date = new Date(at);
  return (
    <div className="flex items-center gap-1 mt-0.5" title={`Edited on ${date.toLocaleString()}`}>
      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      <span className="text-[10px] text-gray-400">Edited by {by} · {getTimeAgo(date)}</span>
    </div>
  );
}

function DeleteModal({ open, title, itemTitle, isDeleting, onConfirm, onCancel }: {
  open: boolean; title: string; itemTitle: string;
  isDeleting: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-500 text-sm mb-1">You are about to delete:</p>
          <p className="text-gray-800 font-medium text-sm mb-4 px-4 line-clamp-2">"{itemTitle}"</p>
          <p className="text-red-500 text-xs mb-6">This action cannot be undone.</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={onCancel} disabled={isDeleting} className="px-6">Cancel</Button>
            <Button onClick={onConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white px-6">
              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SuccessModal({ open, message, onClose }: { open: boolean; message: string; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="text-center py-6">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{message}</h3>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeMenuItem, setActiveMenuItem] = useState('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [globalSearch, setGlobalSearch] = useState('');
  const [globalYear, setGlobalYear] = useState<string>('all');
  const [pubSearch, setPubSearch] = useState('');
  const [pubYear, setPubYear] = useState<string>('all');
  const [confSearch, setConfSearch] = useState('');
  const [confYear, setConfYear] = useState<string>('all');
  const [bookSearch, setBookSearch] = useState('');
  const [bookYear, setBookYear] = useState<string>('all');

  const [publicationsOpen, setPublicationsOpen] = useState(true);
  const [conferencesOpen, setConferencesOpen] = useState(false);
  const [booksOpen, setBooksOpen] = useState(false);

  const [allPublications, setAllPublications] = useState<Publication[]>([]);
  const [allConferences, setAllConferences] = useState<Conference[]>([]);
  const [allBooksChapters, setAllBooksChapters] = useState<BookChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editingPub, setEditingPub] = useState<Publication | null>(null);
  const [editingConf, setEditingConf] = useState<Conference | null>(null);
  const [editingBook, setEditingBook] = useState<BookChapter | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; type: 'pub' | 'conf' | 'book' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState('');

  const allAcademicYears = generateAcademicYears();

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [pubsRes, confsRes, booksRes] = await Promise.all([
        api.publications.getAll(),
        api.conferences.getAll(),
        api.books.getAll(),
      ]);
      if (pubsRes.success && pubsRes.data) setAllPublications(pubsRes.data);
      if (confsRes.success && confsRes.data) setAllConferences(confsRes.data);
      if (booksRes.success && booksRes.data) setAllBooksChapters(booksRes.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPubs = (pubs: Publication[], search: string, year: string) =>
    pubs.filter(p => {
      const s = search.toLowerCase();
      const matchSearch = !search || p.title.toLowerCase().includes(s) || p.journal.toLowerCase().includes(s) ||
        p.authors.some(a => a.toLowerCase().includes(s)) || (p.facultyName && p.facultyName.toLowerCase().includes(s));
      return matchSearch && (year === 'all' || parseAcademicYear(p.academicYear) === year);
    });

  const filterConfs = (confs: Conference[], search: string, year: string) =>
    confs.filter(c => {
      const s = search.toLowerCase();
      const matchSearch = !search || c.title.toLowerCase().includes(s) || c.conferenceName.toLowerCase().includes(s) ||
        c.authors.some(a => a.toLowerCase().includes(s)) || (c.facultyName && c.facultyName.toLowerCase().includes(s));
      return matchSearch && (year === 'all' || parseAcademicYear(c.academicYear) === year);
    });

  const filterBooks = (books: BookChapter[], search: string, year: string) =>
    books.filter(b => {
      const s = search.toLowerCase();
      const matchSearch = !search || b.title.toLowerCase().includes(s) || b.authorName.toLowerCase().includes(s) ||
        b.publisher.toLowerCase().includes(s) || (b.facultyName && b.facultyName.toLowerCase().includes(s));
      return matchSearch && (year === 'all' || parseAcademicYear(b.academicYear) === year);
    });

  const basePubs = filterPubs(allPublications, globalSearch, globalYear);
  const baseConfs = filterConfs(allConferences, globalSearch, globalYear);
  const baseBooks = filterBooks(allBooksChapters, globalSearch, globalYear);
  const filteredPublications = filterPubs(basePubs, pubSearch, pubYear);
  const filteredConferences = filterConfs(baseConfs, confSearch, confYear);
  const filteredBooksChapters = filterBooks(baseBooks, bookSearch, bookYear);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      let res;
      if (deleteTarget.type === 'pub') res = await api.publications.delete(deleteTarget.id);
      else if (deleteTarget.type === 'conf') res = await api.conferences.delete(deleteTarget.id);
      else res = await api.books.delete(deleteTarget.id);
      if (res.success) {
        setDeleteTarget(null);
        await loadAllData();
        setDeleteSuccess('Deleted Successfully!');
        setTimeout(() => setDeleteSuccess(''), 2000);
      }
    } catch (e) { console.error('Delete failed:', e); }
    finally { setIsDeleting(false); }
  };

  // ✅ Admin edit handlers — inject "Admin" as editor name
  const handleEditPub = async (data: any) => {
    if (!editingPub) return;
    const enrichedData = {
      ...data,
      lastEditedBy: 'Admin',
      lastEditedAt: new Date().toISOString(),
    };
    const res = await api.publications.update(editingPub.id, enrichedData);
    if (res.success) { await loadAllData(); setEditingPub(null); } else throw new Error('Failed');
  };

  const handleEditConf = async (data: any) => {
    if (!editingConf) return;
    const enrichedData = {
      ...data,
      lastEditedBy: 'Admin',
      lastEditedAt: new Date().toISOString(),
    };
    const res = await api.conferences.update(editingConf.id, enrichedData);
    if (res.success) { await loadAllData(); setEditingConf(null); } else throw new Error('Failed');
  };

  const handleEditBook = async (data: any) => {
    if (!editingBook) return;
    const enrichedData = {
      ...data,
      lastEditedBy: 'Admin',
      lastEditedAt: new Date().toISOString(),
    };
    const res = await api.books.update(editingBook.id, enrichedData);
    if (res.success) { await loadAllData(); setEditingBook(null); } else throw new Error('Failed');
  };

  const getFileData = (item: any) => (item as any).fileUrl || item.fileData;

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'faculty', label: 'Faculty Directory', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const SidebarContent = () => (
    <nav className="p-4">
      <ul className="space-y-1">
        {sidebarItems.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              onClick={() => { setActiveMenuItem(id); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeMenuItem === id ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );

  const ActionCell = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
    <TableCell>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 p-1">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </TableCell>
  );

  const SectionSearch = ({ search, setSearch, year, setYear, placeholder }: {
    search: string; setSearch: (v: string) => void;
    year: string; setYear: (v: string) => void; placeholder: string;
  }) => (
    <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100 bg-gray-50/50" style={{ overflow: 'visible', position: 'relative', zIndex: 5 }}>
      <div style={{ overflow: 'visible', position: 'relative', zIndex: 10 }}>
        <FilterDropdown selectedValue={year} onValueChange={setYear} options={allAcademicYears} placeholder="All Years" />
      </div>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input placeholder={placeholder} value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white border-gray-200 focus:border-teal-400 h-9 text-sm" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50">

      {/* Modals */}
      <DeleteModal
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.type === 'pub' ? 'Publication' : deleteTarget?.type === 'conf' ? 'Conference' : 'Book/Chapter'}?`}
        itemTitle={deleteTarget?.title || ''} isDeleting={isDeleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
      <SuccessModal open={!!deleteSuccess} message={deleteSuccess} onClose={() => setDeleteSuccess('')} />
      {editingPub && <AddPublicationForm isOpen={!!editingPub} onClose={() => setEditingPub(null)} onSubmit={handleEditPub} initialData={editingPub} />}
      {editingConf && <AddConferenceForm isOpen={!!editingConf} onClose={() => setEditingConf(null)} onSubmit={handleEditConf} initialData={editingConf} />}
      {editingBook && <AddBookForm isOpen={!!editingBook} onClose={() => setEditingBook(null)} onSubmit={handleEditBook} initialData={editingBook} />}

      {/* ── DESKTOP LAYOUT ── */}
      <div className="hidden md:flex min-h-screen">
        <aside className="w-56 bg-white border-r border-teal-100 shadow-sm flex-shrink-0 flex flex-col">
          <div className="p-4 border-b border-teal-50">
            <div className="flex items-center space-x-3">
              <GitamLogo className="w-9 h-9" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Admin</p>
                <p className="text-xs" style={{ color: "#006B64" }}>GITAM Portal</p>
              </div>
            </div>
          </div>
          <SidebarContent />
          <div className="mt-auto p-4 border-t border-gray-100">
            <Button onClick={onLogout} variant="outline" size="sm" className="w-full text-red-600 border-red-300 hover:bg-red-50 text-xs">
              <LogOut className="w-4 h-4 mr-2" />Logout
            </Button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white shadow-sm border-b border-teal-100 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
            <h1 className="text-lg font-semibold text-gray-800">
              {activeMenuItem === 'overview' ? 'Research Overview' : activeMenuItem === 'faculty' ? 'Faculty Directory' : 'Settings'}
            </h1>
            <p className="text-sm text-gray-500">GITAM University Research Portal</p>
          </header>
          <main className="flex-1 p-6 lg:p-8 overflow-auto">
            <PageContent
              activeMenuItem={activeMenuItem} isLoading={isLoading}
              globalSearch={globalSearch} setGlobalSearch={setGlobalSearch}
              globalYear={globalYear} setGlobalYear={setGlobalYear}
              allPublications={allPublications} allConferences={allConferences} allBooksChapters={allBooksChapters}
              filteredPublications={filteredPublications} filteredConferences={filteredConferences} filteredBooksChapters={filteredBooksChapters}
              pubSearch={pubSearch} setPubSearch={setPubSearch} pubYear={pubYear} setPubYear={setPubYear}
              confSearch={confSearch} setConfSearch={setConfSearch} confYear={confYear} setConfYear={setConfYear}
              bookSearch={bookSearch} setBookSearch={setBookSearch} bookYear={bookYear} setBookYear={setBookYear}
              publicationsOpen={publicationsOpen} setPublicationsOpen={setPublicationsOpen}
              conferencesOpen={conferencesOpen} setConferencesOpen={setConferencesOpen}
              booksOpen={booksOpen} setBooksOpen={setBooksOpen}
              allAcademicYears={allAcademicYears}
              setEditingPub={setEditingPub} setEditingConf={setEditingConf} setEditingBook={setEditingBook}
              setDeleteTarget={setDeleteTarget}
              getFileData={getFileData} SectionSearch={SectionSearch} ActionCell={ActionCell}
            />
          </main>
        </div>
      </div>

      {/* ── MOBILE LAYOUT ── */}
      <div className="md:hidden flex flex-col min-h-screen">
        <header className="bg-white shadow-sm border-b border-teal-100 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center space-x-3">
            <button onClick={() => setMobileSidebarOpen(true)} className="p-2 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <GitamLogo className="w-8 h-8" />
            <h1 className="text-base font-semibold text-gray-800">Admin Dashboard</h1>
          </div>
          <Button onClick={onLogout} variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50 text-xs">
            <LogOut className="w-3 h-3 mr-1" />Exit
          </Button>
        </header>

        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
            <div className="relative z-10 w-64 bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <GitamLogo className="w-8 h-8" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Admin</p>
                    <p className="text-xs" style={{ color: "#006B64" }}>GITAM Portal</p>
                  </div>
                </div>
                <button onClick={() => setMobileSidebarOpen(false)} className="p-1 text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent />
              <div className="mt-auto p-4 border-t border-gray-100">
                <Button onClick={onLogout} variant="outline" size="sm" className="w-full text-red-600 border-red-300 hover:bg-red-50 text-xs">
                  <LogOut className="w-4 h-4 mr-2" />Logout
                </Button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4">
          <PageContent
            activeMenuItem={activeMenuItem} isLoading={isLoading}
            globalSearch={globalSearch} setGlobalSearch={setGlobalSearch}
            globalYear={globalYear} setGlobalYear={setGlobalYear}
            allPublications={allPublications} allConferences={allConferences} allBooksChapters={allBooksChapters}
            filteredPublications={filteredPublications} filteredConferences={filteredConferences} filteredBooksChapters={filteredBooksChapters}
            pubSearch={pubSearch} setPubSearch={setPubSearch} pubYear={pubYear} setPubYear={setPubYear}
            confSearch={confSearch} setConfSearch={setConfSearch} confYear={confYear} setConfYear={setConfYear}
            bookSearch={bookSearch} setBookSearch={setBookSearch} bookYear={bookYear} setBookYear={setBookYear}
            publicationsOpen={publicationsOpen} setPublicationsOpen={setPublicationsOpen}
            conferencesOpen={conferencesOpen} setConferencesOpen={setConferencesOpen}
            booksOpen={booksOpen} setBooksOpen={setBooksOpen}
            allAcademicYears={allAcademicYears}
            setEditingPub={setEditingPub} setEditingConf={setEditingConf} setEditingBook={setEditingBook}
            setDeleteTarget={setDeleteTarget}
            getFileData={getFileData} SectionSearch={SectionSearch} ActionCell={ActionCell}
          />
        </main>
      </div>
    </div>
  );
}

// ── Page Content (shared between desktop and mobile) ──────────────
function PageContent({
  activeMenuItem, isLoading,
  globalSearch, setGlobalSearch, globalYear, setGlobalYear,
  allPublications, allConferences, allBooksChapters,
  filteredPublications, filteredConferences, filteredBooksChapters,
  pubSearch, setPubSearch, pubYear, setPubYear,
  confSearch, setConfSearch, confYear, setConfYear,
  bookSearch, setBookSearch, bookYear, setBookYear,
  publicationsOpen, setPublicationsOpen,
  conferencesOpen, setConferencesOpen,
  booksOpen, setBooksOpen,
  allAcademicYears,
  setEditingPub, setEditingConf, setEditingBook,
  setDeleteTarget,
  getFileData, SectionSearch, ActionCell,
}: any) {

  const openFile = (fileData: string, fileName: string) => {
    const w = window.open();
    w?.document.write(`<html><body style="margin:0"><iframe src="${fileData}" style="width:100%;height:100vh;border:none"></iframe></body></html>`);
  };

  const downloadFile = (fileData: string, fileName: string) => {
    const a = document.createElement('a'); a.href = fileData; a.download = fileName || 'file'; a.click();
  };

  if (activeMenuItem === 'faculty') return <FacultyDirectory />;

  if (activeMenuItem === 'settings') return (
    <Card className="bg-white/95 shadow-lg border-0 rounded-xl">
      <CardHeader><CardTitle className="flex items-center space-x-2"><Settings className="w-5 h-5" /><span>Settings</span></CardTitle></CardHeader>
      <CardContent><p className="text-gray-600">Admin settings and configuration options will be available here.</p></CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl text-gray-800 mb-1 font-medium">Research Overview</h2>
        <p className="text-sm text-gray-600">Comprehensive view of all academic publications, conferences, and books across GITAM faculty</p>
      </div>

      {/* Global Search */}
      <Card className="bg-white/95 shadow-lg border-0 rounded-xl" style={{ overflow: 'visible', position: 'relative', zIndex: 20 }}>
        <CardContent className="p-4" style={{ overflow: 'visible' }}>
          <div className="flex flex-col sm:flex-row gap-3" style={{ overflow: 'visible' }}>
            <div style={{ overflow: 'visible', position: 'relative', zIndex: 30 }}>
              <FilterDropdown selectedValue={globalYear} onValueChange={setGlobalYear} options={allAcademicYears} placeholder="All Years" />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Global search: title, author, faculty, journal..." value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 focus:border-teal-400 w-full" />
            </div>
            <div className="text-xs text-gray-500 self-center whitespace-nowrap">
              {allPublications.length + allConferences.length + allBooksChapters.length} total records
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Publications', value: allPublications.length, icon: FileText },
          { label: 'Conferences', value: allConferences.length, icon: Users },
          { label: 'Books', value: allBooksChapters.filter((b: any) => b.type === 'Book').length, icon: Book },
          { label: 'Book Chapters', value: allBooksChapters.filter((b: any) => b.type === 'Book Chapter').length, icon: BookOpen },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="bg-white/95 shadow-lg border-0 rounded-xl hover:shadow-xl transition-shadow">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">{label}</p>
                  <p className="text-2xl sm:text-3xl text-gray-800 font-medium">{isLoading ? '...' : value}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-full" style={{ backgroundColor: "#E6F5F4" }}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: "#006B64" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <Card className="bg-white/95 shadow-lg border-0 rounded-xl">
          <CardContent className="p-16 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Loading data...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Publications */}
          <Collapsible open={publicationsOpen} onOpenChange={setPublicationsOpen}>
            <Card className="bg-white/95 shadow-lg border-0 rounded-xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-700 text-white cursor-pointer hover:from-teal-700 hover:to-teal-800 transition-all">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Publications Database</span>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{filteredPublications.length}</span>
                    </div>
                    {publicationsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SectionSearch search={pubSearch} setSearch={setPubSearch} year={pubYear} setYear={setPubYear} placeholder="Search publications..." />
                <CardContent className="p-0">
                  {filteredPublications.length === 0 ? (
                    <div className="text-center py-12"><Database className="w-12 h-12 text-gray-300 mx-auto mb-3" /><div className="text-gray-500 text-sm">No publications found</div></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div style={{ maxHeight: filteredPublications.length > 10 ? '520px' : 'none', overflowY: filteredPublications.length > 10 ? 'auto' : 'visible' }}>
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-gray-50">
                            <TableRow className="bg-gray-50">
                              <TableHead className="font-semibold text-gray-700 min-w-[200px]">Title</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[150px]">Journal</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[70px]">Quartile</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[90px]">Impact Factor</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[90px]">CiteScore</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[160px]">Authors</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[100px]">Position</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[90px]">Volume/Issue</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[80px]">Pages</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[100px]">Date</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[100px]">Academic Year</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[130px]">DOI</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[70px]">Link</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[120px]">Faculty</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[80px]">File</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPublications.map((pub: Publication) => {
                              const fd = getFileData(pub);
                              return (
                                <TableRow key={pub.id} className="hover:bg-gray-50">
                                  <TableCell className="font-medium">
                                    {/* ✅ Title + subtle edit badge */}
                                    <div className="text-sm leading-tight">{pub.title}</div>
                                    <EditedBadge by={(pub as any).lastEditedBy} at={(pub as any).lastEditedAt} />
                                  </TableCell>
                                  <TableCell><div className="text-sm">{pub.journal}</div></TableCell>
                                  <TableCell><span className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: "#006B64" }}>{pub.quartile}</span></TableCell>
                                  <TableCell><div className="text-sm">{pub.impactFactor}</div></TableCell>
                                  <TableCell><div className="text-sm">{pub.citeScore}</div></TableCell>
                                  <TableCell><div className="text-sm">{pub.authors.join(', ')}</div></TableCell>
                                  <TableCell><div className="text-sm">{pub.positionOfAuthor}</div></TableCell>
                                  <TableCell><div className="text-sm">{pub.volume}{pub.issue ? `(${pub.issue})` : ''}</div></TableCell>
                                  <TableCell><div className="text-sm">{pub.startPage}-{pub.lastPage}</div></TableCell>
                                  <TableCell><div className="text-sm">{pub.monthYear}</div></TableCell>
                                  <TableCell><div className="text-sm">{pub.academicYear}</div></TableCell>
                                  <TableCell><div className="text-xs font-mono">{pub.doi}</div></TableCell>
                                  <TableCell><a href={pub.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 rounded text-xs text-white hover:opacity-90" style={{ backgroundColor: "#006B64" }}><ExternalLink className="w-3 h-3 mr-1" />View</a></TableCell>
                                  <TableCell><div className="text-sm">{pub.facultyName}</div></TableCell>
                                  <TableCell>{fd ? <div className="flex gap-1"><Button variant="ghost" size="sm" className="p-1 text-blue-600 hover:bg-blue-50" onClick={() => openFile(fd, pub.fileName || '')}><ExternalLink className="w-3 h-3" /></Button><Button variant="ghost" size="sm" className="p-1 text-teal-600 hover:bg-teal-50" onClick={() => downloadFile(fd, pub.fileName || '')}><Download className="w-3 h-3" /></Button></div> : <span className="text-xs text-gray-400">No file</span>}</TableCell>
                                  <ActionCell onEdit={() => setEditingPub(pub)} onDelete={() => setDeleteTarget({ id: pub.id, title: pub.title, type: 'pub' })} />
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Conferences */}
          <Collapsible open={conferencesOpen} onOpenChange={setConferencesOpen}>
            <Card className="bg-white/95 shadow-lg border-0 rounded-xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-700 text-white cursor-pointer hover:from-teal-700 hover:to-teal-800 transition-all">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Conferences Database</span>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{filteredConferences.length}</span>
                    </div>
                    {conferencesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SectionSearch search={confSearch} setSearch={setConfSearch} year={confYear} setYear={setConfYear} placeholder="Search conferences..." />
                <CardContent className="p-0">
                  {filteredConferences.length === 0 ? (
                    <div className="text-center py-12"><Users className="w-12 h-12 text-gray-300 mx-auto mb-3" /><div className="text-gray-500 text-sm">No conferences found</div></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div style={{ maxHeight: filteredConferences.length > 10 ? '520px' : 'none', overflowY: filteredConferences.length > 10 ? 'auto' : 'visible' }}>
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-gray-50">
                            <TableRow className="bg-gray-50">
                              <TableHead className="font-semibold text-gray-700 min-w-[200px]">Title</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[180px]">Conference Name</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[100px]">Date</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[160px]">Authors</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[100px]">Type</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[100px]">Academic Year</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[120px]">Host</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[130px]">DOI</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[70px]">Link</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[120px]">Faculty</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[80px]">File</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredConferences.map((conf: Conference) => {
                              const fd = getFileData(conf);
                              return (
                                <TableRow key={conf.id} className="hover:bg-gray-50">
                                  <TableCell className="font-medium">
                                    {/* ✅ Title + subtle edit badge */}
                                    <div className="text-sm leading-tight">{conf.title}</div>
                                    <EditedBadge by={(conf as any).lastEditedBy} at={(conf as any).lastEditedAt} />
                                  </TableCell>
                                  <TableCell><div className="text-sm">{conf.conferenceName}</div></TableCell>
                                  <TableCell><div className="text-sm">{new Date(conf.date).toLocaleDateString()}</div></TableCell>
                                  <TableCell><div className="text-sm">{conf.authors.join(', ')}</div></TableCell>
                                  <TableCell><span className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: conf.type === 'International' ? '#006B64' : '#10B981' }}>{conf.type}</span></TableCell>
                                  <TableCell><div className="text-sm">{conf.academicYear}</div></TableCell>
                                  <TableCell><div className="text-sm">{conf.host}</div></TableCell>
                                  <TableCell><div className="text-xs font-mono">{conf.doi}</div></TableCell>
                                  <TableCell><a href={conf.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 rounded text-xs text-white hover:opacity-90" style={{ backgroundColor: "#006B64" }}><ExternalLink className="w-3 h-3 mr-1" />View</a></TableCell>
                                  <TableCell><div className="text-sm">{conf.facultyName}</div></TableCell>
                                  <TableCell>{fd ? <div className="flex gap-1"><Button variant="ghost" size="sm" className="p-1 text-blue-600 hover:bg-blue-50" onClick={() => openFile(fd, conf.fileName || '')}><ExternalLink className="w-3 h-3" /></Button><Button variant="ghost" size="sm" className="p-1 text-teal-600 hover:bg-teal-50" onClick={() => downloadFile(fd, conf.fileName || '')}><Download className="w-3 h-3" /></Button></div> : <span className="text-xs text-gray-400">No file</span>}</TableCell>
                                  <ActionCell onEdit={() => setEditingConf(conf)} onDelete={() => setDeleteTarget({ id: conf.id, title: conf.title, type: 'conf' })} />
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Books */}
          <Collapsible open={booksOpen} onOpenChange={setBooksOpen}>
            <Card className="bg-white/95 shadow-lg border-0 rounded-xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-700 text-white cursor-pointer hover:from-teal-700 hover:to-teal-800 transition-all">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Books & Book Chapters</span>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{filteredBooksChapters.length}</span>
                    </div>
                    {booksOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SectionSearch search={bookSearch} setSearch={setBookSearch} year={bookYear} setYear={setBookYear} placeholder="Search books and chapters..." />
                <CardContent className="p-0">
                  {filteredBooksChapters.length === 0 ? (
                    <div className="text-center py-12"><BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" /><div className="text-gray-500 text-sm">No books or chapters found</div></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div style={{ maxHeight: filteredBooksChapters.length > 10 ? '520px' : 'none', overflowY: filteredBooksChapters.length > 10 ? 'auto' : 'visible' }}>
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-gray-50">
                            <TableRow className="bg-gray-50">
                              <TableHead className="font-semibold text-gray-700 min-w-[200px]">Title</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[150px]">Author</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[150px]">Department</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[130px]">ISBN/ISSN</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[140px]">Publisher</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[120px]">Month/Year</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[100px]">Academic Year</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[100px]">Type</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[70px]">Link</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[120px]">Faculty</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[80px]">File</TableHead>
                              <TableHead className="font-semibold text-gray-700 min-w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredBooksChapters.map((item: BookChapter) => {
                              const fd = getFileData(item);
                              return (
                                <TableRow key={item.id} className="hover:bg-gray-50">
                                  <TableCell className="font-medium">
                                    {/* ✅ Title + subtle edit badge */}
                                    <div className="text-sm leading-tight">{item.title}</div>
                                    <EditedBadge by={(item as any).lastEditedBy} at={(item as any).lastEditedAt} />
                                  </TableCell>
                                  <TableCell><div className="text-sm">{item.authorName}</div></TableCell>
                                  <TableCell><div className="text-sm">{item.departmentAffiliation}</div></TableCell>
                                  <TableCell><div className="text-sm font-mono">{item.isbnIssn}</div></TableCell>
                                  <TableCell><div className="text-sm">{item.publisher}</div></TableCell>
                                  <TableCell><div className="text-sm">{item.monthYear}</div></TableCell>
                                  <TableCell><div className="text-sm">{item.academicYear}</div></TableCell>
                                  <TableCell><span className="px-2 py-1 rounded-full text-xs text-white" style={{ backgroundColor: item.type === 'Book' ? '#006B64' : '#10B981' }}>{item.type}</span></TableCell>
                                  <TableCell><a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 rounded text-xs text-white hover:opacity-90" style={{ backgroundColor: "#006B64" }}><ExternalLink className="w-3 h-3 mr-1" />View</a></TableCell>
                                  <TableCell><div className="text-sm">{item.facultyName}</div></TableCell>
                                  <TableCell>{fd ? <div className="flex gap-1"><Button variant="ghost" size="sm" className="p-1 text-blue-600 hover:bg-blue-50" onClick={() => openFile(fd, item.fileName || '')}><ExternalLink className="w-3 h-3" /></Button><Button variant="ghost" size="sm" className="p-1 text-teal-600 hover:bg-teal-50" onClick={() => downloadFile(fd, item.fileName || '')}><Download className="w-3 h-3" /></Button></div> : <span className="text-xs text-gray-400">No file</span>}</TableCell>
                                  <ActionCell onEdit={() => setEditingBook(item)} onDelete={() => setDeleteTarget({ id: item.id, title: item.title, type: 'book' })} />
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </>
      )}
    </div>
  );
}