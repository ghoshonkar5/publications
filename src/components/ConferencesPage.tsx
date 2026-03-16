import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GitamLogo } from "./GitamLogo";
import { ArrowLeft, Search, Download, RefreshCw, Calendar, ExternalLink, Plus, Database, Pencil, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent } from "./ui/dialog";
import { AddConferenceForm } from "./AddConferenceForm";
import { FilterDropdown } from "./FilterDropdown";
import { useAuth } from "./AuthContext";
import { api } from "../utils/api";
import { generateAcademicYears, parseAcademicYear } from "../utils/academicYears";
import type { Conference } from "../utils/mockData";

interface ConferencesPageProps {
  onBackToDashboard: () => void;
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

export function ConferencesPage({ onBackToDashboard }: ConferencesPageProps) {
  const { user } = useAuth();
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
  const [editingConference, setEditingConference] = useState<Conference | null>(null);

  // Delete modal states
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetTitle, setDeleteTargetTitle] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  useEffect(() => {
    if (user?.facultyId) {
      loadConferences();
    }
  }, [user]);

  const loadConferences = async () => {
    if (!user?.facultyId) return;
    setIsLoading(true);
    try {
      const response = await api.conferences.getByFaculty(user.facultyId);
      if (response.success && response.data) {
        setConferences(response.data);
      }
    } catch (error) {
      console.error('Failed to load conferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const syncConferences = async () => {
    if (!user?.facultyId) return;
    setIsLoading(true);
    try {
      const response = await api.syncData(user.facultyId, '');
      if (response.success) {
        await loadConferences();
        setLastSync(new Date());
      }
    } catch (error) {
      console.error('Failed to sync conferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddConference = async (conferenceData: any) => {
    try {
      const response = await api.conferences.create(conferenceData);
      if (response.success) {
        await loadConferences();
      } else {
        throw new Error(response.message || 'Failed to add conference');
      }
    } catch (error) {
      console.error('Failed to add conference:', error);
      throw error;
    }
  };

  const handleEditConference = async (conferenceData: any) => {
    if (!editingConference) return;
    try {
      // ✅ Inject edit tracking automatically
      const enrichedData = {
        ...conferenceData,
        lastEditedBy: user?.name || user?.facultyId || 'Unknown',
        lastEditedAt: new Date().toISOString(),
      };
      const response = await api.conferences.update(editingConference.id, enrichedData);
      if (response.success) {
        await loadConferences();
        setEditingConference(null);
      } else {
        throw new Error(response.message || 'Failed to update conference');
      }
    } catch (error) {
      console.error('Failed to edit conference:', error);
      throw error;
    }
  };

  const confirmDelete = (conference: Conference) => {
    setDeleteTargetId(conference.id);
    setDeleteTargetTitle(conference.title);
  };

  const handleDeleteConference = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const response = await api.conferences.delete(deleteTargetId);
      if (response.success) {
        setDeleteTargetId(null);
        setDeleteTargetTitle('');
        await loadConferences();
        setShowDeleteSuccess(true);
        setTimeout(() => setShowDeleteSuccess(false), 2000);
      } else {
        alert('Failed to delete conference. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete conference:', error);
      alert('Failed to delete conference. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const allAcademicYears = generateAcademicYears();

  const filteredConferences = conferences.filter(conference => {
    const matchesSearch =
      conference.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conference.conferenceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conference.authors.some(author => author.toLowerCase().includes(searchTerm.toLowerCase()));
    const conferenceYear = parseAcademicYear(conference.academicYear);
    const matchesYear = selectedAcademicYear === 'all' || conferenceYear === selectedAcademicYear;
    return matchesSearch && matchesYear;
  });

  const handleDownloadFile = (conference: Conference) => {
    const fileData = (conference as any).fileUrl || conference.fileData;
    if (fileData) {
      const link = document.createElement('a');
      link.href = fileData;
      link.download = conference.fileName || 'conference.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // ✅ Dynamic profile URLs from user object, fallback to empty
  const googleScholarUrl = user?.googleScholarUrl || '';
  const scopusUrl = user?.scopusUrl || '';
  const wosUrl = user?.wosUrl || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50">

      {/* ── Delete Confirmation Modal ── */}
      <Dialog open={!!deleteTargetId} onOpenChange={() => { setDeleteTargetId(null); setDeleteTargetTitle(''); }}>
        <DialogContent className="max-w-md">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Conference?</h3>
            <p className="text-gray-500 text-sm mb-1">You are about to delete:</p>
            <p className="text-gray-800 font-medium text-sm mb-4 px-4 line-clamp-2">"{deleteTargetTitle}"</p>
            <p className="text-red-500 text-xs mb-6">This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => { setDeleteTargetId(null); setDeleteTargetTitle(''); }} disabled={isDeleting} className="px-6">Cancel</Button>
              <Button onClick={handleDeleteConference} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white px-6">
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Conference Deleted Successfully!</h3>
            <p className="text-gray-600">The conference has been removed from your portfolio.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-teal-100" style={{ zIndex: 100, position: 'relative' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button onClick={onBackToDashboard} variant="ghost" className="hover:bg-teal-50" style={{ color: "#006B64" }}>
                <ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                <GitamLogo className="w-8 h-8" />
                <h1 className="text-lg text-black">Conferences Management</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button onClick={syncConferences} disabled={isLoading} className="bg-teal-600 hover:bg-teal-700 text-white">
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Syncing...' : 'Sync Conferences'}
              </Button>
              <Button onClick={() => setIsAddFormOpen(true)} variant="outline" className="border-teal-300 hover:bg-teal-50" style={{ color: "#006B64" }}>
                <Plus className="w-4 h-4 mr-2" />Add New Conference
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ position: 'relative', zIndex: 0 }}>
        <div className="mb-6">
          <h2 className="text-2xl text-black mb-2">Conference Presentations</h2>
          <p style={{ color: "#006B64" }}>
            Your conference presentations are automatically synced from academic databases and conference proceedings.
          </p>
          {lastSync && (
            <p className="text-sm text-gray-500 mt-1">
              Last synced: {lastSync.toLocaleDateString()} at {lastSync.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Search Controls */}
        <Card className="mb-6 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl" style={{ overflow: 'visible', position: 'relative', zIndex: 5 }}>
          <CardContent className="p-6" style={{ overflow: 'visible' }}>
            <div className="flex items-center justify-between gap-4" style={{ overflow: 'visible' }}>
              <div className="flex items-center gap-4" style={{ overflow: 'visible' }}>
                <FilterDropdown selectedValue={selectedAcademicYear} onValueChange={setSelectedAcademicYear} options={allAcademicYears} placeholder="All Years" />
                <div className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input placeholder="Search by title, conference, or author..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-gray-50 border-gray-200 focus:border-teal-400 focus:ring-teal-200" />
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {filteredConferences.length} conference{filteredConferences.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conferences Table */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
          <CardHeader className="text-white rounded-t-xl" style={{ background: "linear-gradient(135deg, #006B64 0%, #005A54 100%)" }}>
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Conferences Database</span>
              </div>
              <span className="text-sm bg-white/20 px-2 py-1 rounded-full">{filteredConferences.length} records</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredConferences.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-500 mb-2">No conferences found</div>
                <div className="text-sm text-gray-400 mb-4">Your conference presentations will appear here after syncing with academic databases</div>
                <Button onClick={syncConferences} disabled={isLoading} className="bg-teal-600 hover:bg-teal-700 text-white">
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />Sync Conferences
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[300px] font-semibold text-gray-700">Title</TableHead>
                      <TableHead className="w-[280px] font-semibold text-gray-700">Conference Name</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Date</TableHead>
                      <TableHead className="w-[200px] font-semibold text-gray-700">Authors</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Type</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Academic Year</TableHead>
                      <TableHead className="w-[200px] font-semibold text-gray-700">Host</TableHead>
                      <TableHead className="w-[180px] font-semibold text-gray-700">DOI</TableHead>
                      <TableHead className="w-[140px] font-semibold text-gray-700">Indexing</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">Link</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">File</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConferences.map((conference) => {
                      const fileData = (conference as any).fileUrl || conference.fileData;
                      return (
                        <TableRow key={conference.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {/* ✅ Title + subtle edit badge */}
                            <div className="text-sm leading-tight">{conference.title}</div>
                            <EditedBadge by={(conference as any).lastEditedBy} at={(conference as any).lastEditedAt} />
                          </TableCell>
                          <TableCell><div className="text-sm leading-tight">{conference.conferenceName}</div></TableCell>
                          <TableCell>{formatDate(conference.date)}</TableCell>
                          <TableCell><div className="text-sm leading-tight">{conference.authors.join(', ')}</div></TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded-full text-xs text-white" style={{ backgroundColor: conference.type === 'International' ? '#006B64' : '#10B981' }}>
                              {conference.type}
                            </span>
                          </TableCell>
                          <TableCell><div className="text-sm">{conference.academicYear}</div></TableCell>
                          <TableCell><div className="text-sm leading-tight">{conference.host}</div></TableCell>
                          <TableCell>
                            <a href={`https://doi.org/${conference.doi}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-xs" style={{ color: "#006B64" }}>
                              {conference.doi}
                            </a>
                          </TableCell>
                          <TableCell><div className="text-sm">{conference.indexing}</div></TableCell>
                          <TableCell>
                            <a href={conference.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 rounded text-xs text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: "#006B64" }}>
                              <ExternalLink className="w-3 h-3 mr-1" />View
                            </a>
                          </TableCell>
                          <TableCell>
                            {fileData ? (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => { const w = window.open(); w?.document.write(`<html><head><title>${conference.fileName || 'Document'}</title></head><body style="margin:0;">${conference.fileType?.startsWith('image/') ? `<img src="${fileData}" style="max-width:100%;height:auto;" />` : `<iframe src="${fileData}" style="width:100%;height:100vh;border:none;"></iframe>`}</body></html>`); }} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="View file">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDownloadFile(conference)} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50" title="Download file">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">No file uploaded</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setEditingConference(conference)} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50" title="Edit conference">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => confirmDelete(conference)} className="text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete conference">
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
        {filteredConferences.length > 0 && (
          <Card className="mt-8 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
            <CardHeader><CardTitle style={{ color: "#006B64" }}>Conference Statistics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>{conferences.filter(c => c.type === 'International').length}</p>
                  <p className="text-sm" style={{ color: "#005A54" }}>International</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>{conferences.filter(c => c.type === 'National').length}</p>
                  <p className="text-sm" style={{ color: "#005A54" }}>National</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>{conferences.length}</p>
                  <p className="text-sm" style={{ color: "#005A54" }}>Total Conferences</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>{new Date().getFullYear()}</p>
                  <p className="text-sm" style={{ color: "#005A54" }}>Current Year</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ✅ Academic Database Profiles — dynamic URLs */}
        <Card className="mt-6 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" style={{ color: "#006B64" }} />
              <span style={{ color: "#006B64" }}>Academic Database Profiles</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {googleScholarUrl ? (
                <a href={googleScholarUrl} target="_blank" rel="noopener noreferrer" className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <div className="text-lg font-semibold text-orange-700">Google Scholar</div>
                    <ExternalLink className="w-4 h-4 text-orange-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="text-xs text-orange-600">H-index and comprehensive citations</div>
                </a>
              ) : (
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 opacity-50">
                  <div className="text-lg font-semibold text-orange-700 mb-1">Google Scholar</div>
                  <div className="text-xs text-orange-500">URL not set — update in profile settings</div>
                </div>
              )}
              {scopusUrl ? (
                <a href={scopusUrl} target="_blank" rel="noopener noreferrer" className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <div className="text-lg font-semibold text-blue-700">Scopus</div>
                    <ExternalLink className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="text-xs text-blue-600">Publications, citations, and indexing data</div>
                </a>
              ) : (
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 opacity-50">
                  <div className="text-lg font-semibold text-blue-700 mb-1">Scopus</div>
                  <div className="text-xs text-blue-500">URL not set — update in profile settings</div>
                </div>
              )}
              {wosUrl ? (
                <a href={wosUrl} target="_blank" rel="noopener noreferrer" className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <div className="text-lg font-semibold text-green-700">Web of Science</div>
                    <ExternalLink className="w-4 h-4 text-green-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="text-xs text-green-600">Impact factors and citation metrics</div>
                </a>
              ) : (
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 opacity-50">
                  <div className="text-lg font-semibold text-green-700 mb-1">Web of Science</div>
                  <div className="text-xs text-green-500">URL not set — update in profile settings</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Conference Form */}
        <AddConferenceForm isOpen={isAddFormOpen} onClose={() => setIsAddFormOpen(false)} onSubmit={handleAddConference} />

        {/* Edit Conference Form */}
        {editingConference && (
          <AddConferenceForm isOpen={!!editingConference} onClose={() => setEditingConference(null)} onSubmit={handleEditConference} initialData={editingConference} />
        )}
      </main>
    </div>
  );
}