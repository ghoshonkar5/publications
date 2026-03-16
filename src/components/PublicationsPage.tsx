import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GitamLogo } from "./GitamLogo";
import { ArrowLeft, Search, Download, RefreshCw, Database, Plus, ExternalLink, Pencil, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent } from "./ui/dialog";
import { AddPublicationForm } from "./AddPublicationForm";
import { FilterDropdown } from "./FilterDropdown";
import { useAuth } from "./AuthContext";
import { api } from "../utils/api";
import { generateAcademicYears, parseAcademicYear } from "../utils/academicYears";
import type { Publication } from "../utils/mockData";

interface PublicationsPageProps {
  onBackToDashboard: () => void;
}

// ✅ Improved time ago — minutes, hours, yesterday, then full date
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

// ✅ Subtle "last edited" badge shown under the title
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

export function PublicationsPage({ onBackToDashboard }: PublicationsPageProps) {
  const { user } = useAuth();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
  const [editingPublication, setEditingPublication] = useState<Publication | null>(null);

  // Delete modal states
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetTitle, setDeleteTargetTitle] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  useEffect(() => {
    if (user?.facultyId) {
      loadPublications();
    }
  }, [user]);

  const loadPublications = async () => {
    if (!user?.facultyId) return;
    setIsLoading(true);
    try {
      const response = await api.publications.getByFaculty(user.facultyId);
      if (response.success && response.data) {
        setPublications(response.data);
      }
    } catch (error) {
      console.error('Failed to load publications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const syncPublications = async () => {
    if (!user?.facultyId) return;
    setIsLoading(true);
    try {
      const response = await api.syncData(user.facultyId, '');
      if (response.success) {
        await loadPublications();
        setLastSync(new Date());
      }
    } catch (error) {
      console.error('Failed to sync publications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPublication = async (publicationData: any) => {
    try {
      const enrichedData = {
        ...publicationData,
        apaFormat: generateAPAFormat(publicationData)
      };
      const response = await api.publications.create(enrichedData);
      if (response.success) {
        await loadPublications();
      } else {
        throw new Error(response.message || 'Failed to add publication');
      }
    } catch (error) {
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
        // ✅ Inject edit tracking automatically
        lastEditedBy: user?.name || user?.facultyId || 'Unknown',
        lastEditedAt: new Date().toISOString(),
      };
      const response = await api.publications.update(editingPublication.id, enrichedData);
      if (response.success) {
        await loadPublications();
        setEditingPublication(null);
      } else {
        throw new Error(response.message || 'Failed to update publication');
      }
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
      console.error('Failed to delete publication:', error);
      alert('Failed to delete publication. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const generateAPAFormat = (data: any): string => {
    const authors = data.authors.join(', ');
    const year = data.monthYear.split(' ')[1] || new Date().getFullYear();
    let apa = `${authors} (${year}). ${data.title}. ${data.journal}`;
    if (data.volume) apa += `, ${data.volume}`;
    if (data.issue) apa += `(${data.issue})`;
    if (data.startPage && data.lastPage) apa += `, ${data.startPage}-${data.lastPage}`;
    if (data.doi) apa += `. https://doi.org/${data.doi}`;
    return apa + '.';
  };

  const allAcademicYears = generateAcademicYears();

  const filteredPublications = publications.filter(pub => {
    const matchesSearch =
      pub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.journal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.authors.some(author => author.toLowerCase().includes(searchTerm.toLowerCase()));
    const publicationYear = parseAcademicYear(pub.academicYear);
    const matchesYear = selectedAcademicYear === 'all' || publicationYear === selectedAcademicYear;
    return matchesSearch && matchesYear;
  });

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

  // ✅ Dynamic profile URLs from user object
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

      {/* ── Delete Success Modal ── */}
      <Dialog open={showDeleteSuccess} onOpenChange={setShowDeleteSuccess}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Publication Deleted Successfully!</h3>
            <p className="text-gray-600">The publication has been removed from your portfolio.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-teal-100" style={{ zIndex: 100, position: 'relative' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button onClick={onBackToDashboard} variant="ghost" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                <ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                <GitamLogo className="w-8 h-8" />
                <h1 className="text-lg font-semibold text-teal-800">Publications Management</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button onClick={syncPublications} disabled={isLoading} className="bg-teal-600 hover:bg-teal-700 text-white">
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Syncing...' : 'Sync Publications'}
              </Button>
              <Button onClick={() => setIsAddFormOpen(true)} variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50">
                <Plus className="w-4 h-4 mr-2" />Add New Publication
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ position: 'relative', zIndex: 0 }}>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-teal-800 mb-2">Publications Portfolio</h2>
          <p className="text-teal-600">Your publications are automatically synced from Scopus, Web of Science, and Google Scholar.</p>
          {lastSync && (
            <p className="text-sm text-gray-500 mt-1">Last synced: {lastSync.toLocaleDateString()} at {lastSync.toLocaleTimeString()}</p>
          )}
        </div>

        {/* Controls */}
        <Card className="mb-6 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl" style={{ overflow: 'visible', position: 'relative', zIndex: 5 }}>
          <CardContent className="p-6" style={{ overflow: 'visible' }}>
            <div className="flex items-center justify-between gap-4" style={{ overflow: 'visible' }}>
              <div className="flex items-center gap-4" style={{ overflow: 'visible' }}>
                <FilterDropdown selectedValue={selectedAcademicYear} onValueChange={setSelectedAcademicYear} options={allAcademicYears} placeholder="All Years" />
                <div className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input placeholder="Search publications by title, journal, or author..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-gray-50 border-gray-200 focus:border-teal-400 focus:ring-teal-200" />
                </div>
              </div>
              <div className="text-xs text-gray-500">{filteredPublications.length} publication{filteredPublications.length !== 1 ? 's' : ''} found</div>
            </div>
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
                <div className="text-sm text-gray-400 mb-4">Your publications will appear here after syncing with academic databases</div>
                <Button onClick={syncPublications} disabled={isLoading} className="bg-teal-600 hover:bg-teal-700 text-white">
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />Sync Publications
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[300px] font-semibold text-gray-700">Title</TableHead>
                      <TableHead className="w-[200px] font-semibold text-gray-700">Journal</TableHead>
                      <TableHead className="w-[80px] font-semibold text-gray-700">Quartile</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">Impact Factor</TableHead>
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
                      return (
                        <TableRow key={publication.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {/* ✅ Title + subtle edit badge */}
                            <div className="text-sm leading-tight">{publication.title}</div>
                            <EditedBadge by={(publication as any).lastEditedBy} at={(publication as any).lastEditedAt} />
                          </TableCell>
                          <TableCell>{publication.journal}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs text-white ${
                              publication.quartile === 'Q1' ? 'bg-green-600' :
                              publication.quartile === 'Q2' ? 'bg-blue-600' :
                              publication.quartile === 'Q3' ? 'bg-orange-600' :
                              'bg-red-600'
                            }`}>
                              {publication.quartile}
                            </span>
                          </TableCell>
                          <TableCell>{publication.impactFactor}</TableCell>
                          <TableCell>{publication.citeScore}</TableCell>
                          <TableCell className="text-center">{publication.wosCitations}</TableCell>
                          <TableCell className="text-center">{publication.scopusCitations}</TableCell>
                          <TableCell className="text-center">{publication.googleCitations}</TableCell>
                          <TableCell><div className="text-sm">{publication.authors.join(', ')}</div></TableCell>
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
                            <a href={`https://doi.org/${publication.doi}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                              {publication.doi}
                            </a>
                          </TableCell>
                          <TableCell>
                            <a href={publication.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">View</a>
                          </TableCell>
                          <TableCell>
                            {fileData ? (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm"
                                  onClick={() => { const w = window.open(); w?.document.write(`<html><head><title>${publication.fileName || 'Document'}</title></head><body style="margin:0;">${publication.fileType?.startsWith('image/') ? `<img src="${fileData}" style="max-width:100%;height:auto;" />` : `<iframe src="${fileData}" style="width:100%;height:100vh;border:none;"></iframe>`}</body></html>`); }}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="View file">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDownloadFile(publication)} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50" title="Download file">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">No file uploaded</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setEditingPublication(publication)} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50" title="Edit publication">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => confirmDelete(publication)} className="text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete publication">
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

        {/* ✅ Academic Database Profiles — dynamic URLs */}
        <Card className="mt-6 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl" style={{ position: 'relative', zIndex: 1 }}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" style={{ color: "#006B64" }} />
              <span style={{ color: "#006B64" }}>Academic Database Profiles</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {googleScholarUrl ? (
                <a href={googleScholarUrl} target="_blank" rel="noopener noreferrer"
                  className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-md transition-shadow cursor-pointer group">
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
                <a href={scopusUrl} target="_blank" rel="noopener noreferrer"
                  className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-md transition-shadow cursor-pointer group">
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
                <a href={wosUrl} target="_blank" rel="noopener noreferrer"
                  className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-md transition-shadow cursor-pointer group">
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

        {/* Add Publication Form */}
        <AddPublicationForm isOpen={isAddFormOpen} onClose={() => setIsAddFormOpen(false)} onSubmit={handleAddPublication} />

        {/* Edit Publication Form */}
        {editingPublication && (
          <AddPublicationForm isOpen={!!editingPublication} onClose={() => setEditingPublication(null)} onSubmit={handleEditPublication} initialData={editingPublication} />
        )}
      </main>
    </div>
  );
}