import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GitamLogo } from "./GitamLogo";
import { ArrowLeft, Search, Download, RefreshCw, Calendar, ExternalLink, Plus, Database } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { AddConferenceForm } from "./AddConferenceForm";
import { FilterDropdown } from "./FilterDropdown";
import { mockConferences } from "../utils/mockData";
import { generateAcademicYears, parseAcademicYear } from "../utils/academicYears";
import type { Conference } from "../utils/mockData";

interface ConferencesPageProps {
  onBackToDashboard: () => void;
}

export function ConferencesPage({ onBackToDashboard }: ConferencesPageProps) {
  const [conferences, setConferences] = useState<Conference[]>(mockConferences);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
  const [editingConference, setEditingConference] = useState<Conference | null>(null);

  // This will be replaced with actual API calls to academic databases
  const syncConferences = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement API calls to:
      // 1. Scopus API for conference papers and proceedings
      // 2. Web of Science API for conference publications
      // 3. Google Scholar API for conference presentations
      // 4. IEEE Xplore, ACM Digital Library for additional conference data
      
      console.log('Syncing conferences from academic databases...');
      // Placeholder for actual API integration
      setLastSync(new Date());
    } catch (error) {
      console.error('Failed to sync conferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportConferences = () => {
    // Export functionality for conference data
    console.log('Exporting conferences data...');
  };

  const handleAddConference = async (conferenceData: any) => {
    try {
      // Generate a unique ID for the new conference
      const newConference: Conference = {
        id: Date.now().toString(),
        title: conferenceData.title,
        conferenceName: conferenceData.conferenceName,
        date: conferenceData.conferenceDate,
        authors: conferenceData.authors,
        type: conferenceData.conferenceType as 'National' | 'International',
        doi: conferenceData.doi || '',
        indexing: conferenceData.indexing || '',
        link: conferenceData.link || '',
        academicYear: conferenceData.academicYear || '',
        host: conferenceData.host || '',
        fileData: conferenceData.fileData || undefined,
        fileName: conferenceData.fileName || undefined,
        fileType: conferenceData.fileType || undefined
      };

      // Add to conferences list
      setConferences(prev => [...prev, newConference]);
      
      console.log('Conference added:', newConference);
      
      // In a real app, this would make an API call to save the data
      // await api.addConference(newConference);
      
    } catch (error) {
      console.error('Failed to add conference:', error);
      throw error;
    }
  };

  // Generate academic year ranges (2024-2025, 2023-2024, ... 1999-2000)
  const allAcademicYears = generateAcademicYears();

  const filteredConferences = conferences.filter(conference => {
    const matchesSearch = conference.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conference.conferenceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conference.authors.some(author => author.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Match against academic year - handle both formats
    const conferenceYear = parseAcademicYear(conference.academicYear);
    const matchesYear = selectedAcademicYear === 'all' || conferenceYear === selectedAcademicYear;
    
    return matchesSearch && matchesYear;
  });

  const handleDownloadFile = (conference: Conference) => {
    if (conference.fileData) {
      const link = document.createElement('a');
      link.href = conference.fileData;
      link.download = conference.fileName || 'conference.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
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
                className="hover:bg-teal-50"
                style={{ color: "#006B64" }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                <GitamLogo className="w-8 h-8" />
                <div>
                  <h1 className="text-lg text-black">Conferences Management</h1>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={syncConferences}
                disabled={isLoading}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Syncing...' : 'Sync Conferences'}
              </Button>
              <Button 
                onClick={() => setIsAddFormOpen(true)}
                variant="outline" 
                className="border-teal-300 hover:bg-teal-50"
                style={{ color: "#006B64" }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Conference
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ position: 'relative', zIndex: 0 }}>
        {/* Page Header */}
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
                      placeholder="Search by title, conference, or author..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-50 border-gray-200 focus:border-teal-400 focus:ring-teal-200"
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500" style={{ fontSize: '12px' }}>
                  {filteredConferences.length} conference{filteredConferences.length !== 1 ? 's' : ''} found
                </div>
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
              <span className="text-sm bg-white/20 px-2 py-1 rounded-full">
                {filteredConferences.length} records
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredConferences.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-500 mb-2">No conferences found</div>
                <div className="text-sm text-gray-400 mb-4">
                  Your conference presentations will appear here after syncing with academic databases
                </div>
                <Button 
                  onClick={syncConferences}
                  disabled={isLoading}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Sync Conferences
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConferences.map((conference) => (
                      <TableRow key={conference.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="text-sm leading-tight">{conference.title}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm leading-tight">{conference.conferenceName}</div>
                        </TableCell>
                        <TableCell>
                          {formatDate(conference.date)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm leading-tight">{conference.authors.join(', ')}</div>
                        </TableCell>
                        <TableCell>
                          <span 
                            className="px-2 py-1 rounded-full text-xs text-white"
                            style={{ 
                              backgroundColor: conference.type === 'International' ? '#006B64' : '#10B981' 
                            }}
                          >
                            {conference.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{conference.academicYear}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm leading-tight">{conference.host}</div>
                        </TableCell>
                        <TableCell>
                          <a 
                            href={`https://doi.org/${conference.doi}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:underline text-xs"
                            style={{ color: "#006B64" }}
                          >
                            {conference.doi}
                          </a>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{conference.indexing}</div>
                        </TableCell>
                        <TableCell>
                          <a
                            href={conference.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-2 py-1 rounded text-xs text-white hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: "#006B64" }}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View
                          </a>
                        </TableCell>
                        <TableCell>
                          {conference.fileData ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newWindow = window.open();
                                  if (newWindow && conference.fileData) {
                                    newWindow.document.write(`
                                      <html>
                                        <head><title>${conference.fileName || 'Document'}</title></head>
                                        <body style="margin:0;">
                                          ${conference.fileType?.startsWith('image/') 
                                            ? `<img src="${conference.fileData}" style="max-width:100%;height:auto;" />`
                                            : `<iframe src="${conference.fileData}" style="width:100%;height:100vh;border:none;"></iframe>`
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
                                onClick={() => handleDownloadFile(conference)}
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

        {/* Summary Statistics */}
        {filteredConferences.length > 0 && (
          <Card className="mt-8 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
            <CardHeader>
              <CardTitle style={{ color: "#006B64" }}>Conference Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>
                    {conferences.filter(c => c.type === 'International').length}
                  </p>
                  <p className="text-sm" style={{ color: "#005A54" }}>International</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>
                    {conferences.filter(c => c.type === 'National').length}
                  </p>
                  <p className="text-sm" style={{ color: "#005A54" }}>National</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>
                    {conferences.length}
                  </p>
                  <p className="text-sm" style={{ color: "#005A54" }}>Total Conferences</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>
                    {new Date().getFullYear()}
                  </p>
                  <p className="text-sm" style={{ color: "#005A54" }}>Current Year</p>
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

        {/* Add Conference Form */}
        <AddConferenceForm
          isOpen={isAddFormOpen}
          onClose={() => setIsAddFormOpen(false)}
          onSubmit={handleAddConference}
        />
      </main>
    </div>
  );
}