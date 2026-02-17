import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GitamLogo } from "./GitamLogo";
import { ArrowLeft, Search, Download, RefreshCw, Database, Plus, ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { AddPublicationForm } from "./AddPublicationForm";
import { FilterDropdown } from "./FilterDropdown";
import { useAuth } from "./AuthContext";
import { api } from "../utils/api";
import { mockPublications } from "../utils/mockData";
import { generateAcademicYears, parseAcademicYear } from "../utils/academicYears";
import type { Publication } from "../utils/mockData";

interface PublicationsPageProps {
  onBackToDashboard: () => void;
}

export function PublicationsPage({ onBackToDashboard }: PublicationsPageProps) {
  const { user } = useAuth();
  const [publications, setPublications] = useState<Publication[]>(mockPublications);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
  const [editingPublication, setEditingPublication] = useState<Publication | null>(null);

  // Load publications when component mounts
  useEffect(() => {
    if (user?.id && user?.accessToken) {
      loadPublications();
    }
  }, [user]);

  const loadPublications = async () => {
    if (!user?.id || !user?.accessToken) return;
    
    setIsLoading(true);
    try {
      const response = await api.getPublications(user.id, user.accessToken);
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
    if (!user?.id || !user?.accessToken) return;
    
    setIsLoading(true);
    try {
      const response = await api.syncData(user.id, user.accessToken);
      if (response.success) {
        // Reload publications after sync
        await loadPublications();
        setLastSync(new Date());
      } else {
        console.error('Sync failed:', response.error);
      }
    } catch (error) {
      console.error('Failed to sync publications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportPublications = () => {
    // Export functionality for publication data
    console.log('Exporting publications data...');
  };

  const handleAddPublication = async (publicationData: any) => {
    if (!user?.accessToken) {
      throw new Error('No access token available');
    }
    
    try {
      // Generate APA format automatically
      const enrichedData = {
        ...publicationData,
        apaFormat: generateAPAFormat(publicationData)
      };

      const response = await api.addPublication(enrichedData, user.accessToken);
      
      if (response.success) {
        // Reload publications to get the updated list
        await loadPublications();
      } else {
        throw new Error(response.error || 'Failed to add publication');
      }
      
    } catch (error) {
      console.error('Failed to add publication:', error);
      throw error;
    }
  };

  const handleEditPublication = async (publicationData: any) => {
    if (!editingPublication) return;
    
    try {
      // Update the publication in local state
      const updatedPublications = publications.map(pub => 
        pub.id === editingPublication.id 
          ? { ...pub, ...publicationData, id: editingPublication.id, apaFormat: generateAPAFormat(publicationData) }
          : pub
      );
      setPublications(updatedPublications);
      setEditingPublication(null);
      console.log('Publication updated successfully');
    } catch (error) {
      console.error('Failed to edit publication:', error);
      throw error;
    }
  };

  const generateAPAFormat = (data: any): string => {
    const authors = data.authors.join(', ');
    const year = data.monthYear.split(' ')[1] || new Date().getFullYear();
    const title = data.title;
    const journal = data.journal;
    const volume = data.volume;
    const issue = data.issue;
    const pages = data.startPage && data.lastPage ? `${data.startPage}-${data.lastPage}` : '';
    
    let apa = `${authors} (${year}). ${title}. ${journal}`;
    if (volume) apa += `, ${volume}`;
    if (issue) apa += `(${issue})`;
    if (pages) apa += `, ${pages}`;
    if (data.doi) apa += `. https://doi.org/${data.doi}`;
    
    return apa + '.';
  };

  // Generate academic year ranges (2024-2025, 2023-2024, ... 1999-2000)
  const allAcademicYears = generateAcademicYears();

  const filteredPublications = publications.filter(pub => {
    const matchesSearch = pub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.journal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.authors.some(author => author.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Match against academic year - handle both formats
    const publicationYear = parseAcademicYear(pub.academicYear);
    const matchesYear = selectedAcademicYear === 'all' || publicationYear === selectedAcademicYear;
    
    return matchesSearch && matchesYear;
  });

  const handleDownloadFile = (publication: Publication) => {
    if (publication.fileData) {
      const link = document.createElement('a');
      link.href = publication.fileData;
      link.download = publication.fileName || 'publication.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-teal-100" style={{ zIndex: 100, position: 'relative' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={onBackToDashboard}
                variant="ghost"
                className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                <GitamLogo className="w-8 h-8" />
                <div>
                  <h1 className="text-lg font-semibold text-teal-800">Publications Management</h1>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={syncPublications}
                disabled={isLoading}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Syncing...' : 'Sync Publications'}
              </Button>
              <Button 
                onClick={() => setIsAddFormOpen(true)}
                variant="outline" 
                className="border-teal-300 text-teal-700 hover:bg-teal-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Publication
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ position: 'relative', zIndex: 0 }}>
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-teal-800 mb-2">Publications Portfolio</h2>
          <p className="text-teal-600">
            Your publications are automatically synced from Scopus, Web of Science, and Google Scholar.
          </p>
          {lastSync && (
            <p className="text-sm text-gray-500 mt-1">
              Last synced: {lastSync.toLocaleDateString()} at {lastSync.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Controls */}
        <Card className="mb-6 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl" style={{ overflow: 'visible', position: 'relative', zIndex: 5 }}>
          <CardContent className="p-6" style={{ overflow: 'visible' }}>
            <div className="flex flex-col space-y-4" style={{ overflow: 'visible' }}>
              {/* Filter and Search Row */}
              <div className="flex items-center justify-between gap-4" style={{ overflow: 'visible' }}>
                <div className="flex items-center gap-4" style={{ overflow: 'visible' }}>
                  <FilterDropdown
                    selectedValue={selectedAcademicYear}
                    onValueChange={setSelectedAcademicYear}
                    options={allAcademicYears}
                    placeholder="All Years"
                  />
                  <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search publications by title, journal, or author..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-50 border-gray-200 focus:border-teal-400 focus:ring-teal-200"
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500" style={{ fontSize: '12px' }}>
                  {filteredPublications.length} publication{filteredPublications.length !== 1 ? 's' : ''} found
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Publications Table */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl overflow-hidden" style={{ marginTop: '24px', position: 'relative', zIndex: 1 }}>
          <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-700 text-white">
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Publications Database</span>
              <span className="ml-auto text-sm bg-white/20 px-2 py-1 rounded-full">
                {filteredPublications.length} records
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPublications.length === 0 ? (
              <div className="text-center py-16">
                <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-500 mb-2">No publications found</div>
                <div className="text-sm text-gray-400 mb-4">
                  Your publications will appear here after syncing with academic databases
                </div>
                <Button 
                  onClick={syncPublications}
                  disabled={isLoading}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Sync Publications
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPublications.map((publication) => (
                      <TableRow key={publication.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="text-sm leading-tight">{publication.title}</div>
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
                        <TableCell>
                          <div className="text-sm">{publication.authors.join(', ')}</div>
                        </TableCell>
                        <TableCell>{publication.indexing}</TableCell>
                        <TableCell>{publication.areaOfPaper}</TableCell>
                        <TableCell>
                          <div className="text-xs leading-tight">{publication.apaFormat}</div>
                        </TableCell>
                        <TableCell>{publication.positionOfAuthor}</TableCell>
                        <TableCell>{publication.volume}</TableCell>
                        <TableCell>{publication.issue}</TableCell>
                        <TableCell>{publication.startPage}-{publication.lastPage}</TableCell>
                        <TableCell>{publication.monthYear}</TableCell>
                        <TableCell>{publication.academicYear}</TableCell>
                        <TableCell>
                          <a 
                            href={`https://doi.org/${publication.doi}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:underline text-xs"
                          >
                            {publication.doi}
                          </a>
                        </TableCell>
                        <TableCell>
                          <a
                            href={publication.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs"
                          >
                            View
                          </a>
                        </TableCell>
                        <TableCell>
                          {publication.fileData ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newWindow = window.open();
                                  if (newWindow && publication.fileData) {
                                    newWindow.document.write(`
                                      <html>
                                        <head><title>${publication.fileName || 'Document'}</title></head>
                                        <body style="margin:0;">
                                          ${publication.fileType?.startsWith('image/') 
                                            ? `<img src="${publication.fileData}" style="max-width:100%;height:auto;" />`
                                            : `<iframe src="${publication.fileData}" style="width:100%;height:100vh;border:none;"></iframe>`
                                          }
                                        </body>
                                      </html>
                                    `);
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="View file"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadFile(publication)}
                                className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                title="Download file"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No file uploaded</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Sources Info */}
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
              <a 
                href="https://scholar.google.com/citations?user=TlKA96IAAAAJ" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="text-lg font-semibold text-orange-700">Google Scholar</div>
                  <ExternalLink className="w-4 h-4 text-orange-600 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="text-xs text-orange-600">H-index and comprehensive citations</div>
              </a>
              <a 
                href="https://www.scopus.com/authid/detail.uri?authorId=57211100966" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="text-lg font-semibold text-blue-700">Scopus</div>
                  <ExternalLink className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="text-xs text-blue-600">Publications, citations, and indexing data</div>
              </a>
              <a 
                href="https://www.webofscience.com/wos/author/record/AAG-6911-2021" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="text-lg font-semibold text-green-700">Web of Science</div>
                  <ExternalLink className="w-4 h-4 text-green-600 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="text-xs text-green-600">Impact factors and citation metrics</div>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Add Publication Form */}
        <AddPublicationForm
          isOpen={isAddFormOpen}
          onClose={() => setIsAddFormOpen(false)}
          onSubmit={handleAddPublication}
        />

        {/* Edit Publication Form */}
        {editingPublication && (
          <AddPublicationForm
            isOpen={!!editingPublication}
            onClose={() => setEditingPublication(null)}
            onSubmit={handleEditPublication}
            initialData={editingPublication}
          />
        )}
      </main>
    </div>
  );
}