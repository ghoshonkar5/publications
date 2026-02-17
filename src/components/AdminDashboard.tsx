import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GitamLogo } from "./GitamLogo";
import { FacultyDirectory } from "./FacultyDirectory";
import { FilterDropdown } from "./FilterDropdown";
import { 
  BookOpen, 
  Users, 
  Book, 
  LogOut, 
  Settings,
  BarChart3,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Database,
  FileText,
  Download
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { mockPublications, mockConferences, mockBooksChapters } from "../utils/mockData";
import { generateAcademicYears, parseAcademicYear } from "../utils/academicYears";
import type { Publication, Conference, BookChapter } from "../utils/mockData";

interface AdminDashboardProps {
  onLogout: () => void;
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeMenuItem, setActiveMenuItem] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
  const [publicationsOpen, setPublicationsOpen] = useState(true);
  const [conferencesOpen, setConferencesOpen] = useState(false);
  const [booksOpen, setBooksOpen] = useState(false);

  // Use shared mock data
  const allPublications = mockPublications;
  const allConferences = mockConferences;
  const allBooksChapters = mockBooksChapters;

  // Generate academic year ranges (2024-2025, 2023-2024, ... 1999-2000)
  const allAcademicYears = generateAcademicYears();

  // Filter publications
  const filteredPublications = allPublications.filter(pub => {
    const matchesSearch = searchTerm === '' || 
      pub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.journal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.authors.some(author => author.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pub.facultyName && pub.facultyName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Match against academic year - handle both formats
    const publicationYear = parseAcademicYear(pub.academicYear);
    const matchesYear = selectedAcademicYear === 'all' || publicationYear === selectedAcademicYear;
    
    return matchesSearch && matchesYear;
  });

  // Filter conferences
  const filteredConferences = allConferences.filter(conf => {
    const matchesSearch = searchTerm === '' ||
      conf.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conf.conferenceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conf.authors.some(author => author.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (conf.facultyName && conf.facultyName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Match against academic year - handle both formats
    const conferenceYear = parseAcademicYear(conf.academicYear);
    const matchesYear = selectedAcademicYear === 'all' || conferenceYear === selectedAcademicYear;
    
    return matchesSearch && matchesYear;
  });

  // Filter books/chapters
  const filteredBooksChapters = allBooksChapters.filter(item => {
    const matchesSearch = searchTerm === '' ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.publisher.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.facultyName && item.facultyName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Match against academic year - handle both formats
    const bookYear = parseAcademicYear(item.academicYear);
    const matchesYear = selectedAcademicYear === 'all' || bookYear === selectedAcademicYear;
    
    return matchesSearch && matchesYear;
  });

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'faculty', label: 'Faculty Directory', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Calculate totals
  const totalPublications = filteredPublications.length;
  const totalConferences = filteredConferences.length;
  const totalBooksChapters = filteredBooksChapters.length;
  const totalBooks = filteredBooksChapters.filter(b => b.type === 'Book').length;
  const totalChapters = filteredBooksChapters.filter(b => b.type === 'Book Chapter').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50">
      {/* Top Navigation */}
      <header className="bg-white shadow-sm border-b border-teal-100">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <GitamLogo className="w-10 h-10" />
              <div>
                <h1 className="text-xl text-gray-800">Admin Dashboard</h1>
                <p className="text-sm" style={{ color: "#006B64" }}>GITAM University Research Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={onLogout}
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-screen border-r border-teal-100">
          <nav className="p-4">
            <ul className="space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveMenuItem(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                        activeMenuItem === item.id
                          ? 'bg-teal-50 text-teal-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8">
          {activeMenuItem === 'overview' && (
            <div className="space-y-6">
              {/* Page Header */}
              <div>
                <h2 className="text-2xl text-gray-800 mb-2">Research Overview</h2>
                <p className="text-gray-600">
                  Comprehensive view of all academic publications, conferences, and books across GITAM faculty
                </p>
              </div>

              {/* Search and Filter Controls */}
              <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl" style={{ overflow: 'visible' }}>
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
                            placeholder="Search by title, author, faculty, or journal..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-gray-50 border-gray-200 focus:border-teal-400 focus:ring-teal-200"
                          />
                        </div>
                      </div>
                      <div className="text-xs text-gray-500" style={{ fontSize: '12px' }}>
                        {totalPublications + totalConferences + totalBooksChapters} total records
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" style={{ position: 'relative', zIndex: 1 }}>
                <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Publications</p>
                        <p className="text-3xl text-gray-800">{totalPublications}</p>
                      </div>
                      <div className="p-3 rounded-full" style={{ backgroundColor: "#E6F5F4" }}>
                        <FileText className="w-6 h-6" style={{ color: "#006B64" }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Conferences</p>
                        <p className="text-3xl text-gray-800">{totalConferences}</p>
                      </div>
                      <div className="p-3 rounded-full" style={{ backgroundColor: "#E6F5F4" }}>
                        <Users className="w-6 h-6" style={{ color: "#006B64" }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Books</p>
                        <p className="text-3xl text-gray-800">{totalBooks}</p>
                      </div>
                      <div className="p-3 rounded-full" style={{ backgroundColor: "#E6F5F4" }}>
                        <Book className="w-6 h-6" style={{ color: "#006B64" }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Book Chapters</p>
                        <p className="text-3xl text-gray-800">{totalChapters}</p>
                      </div>
                      <div className="p-3 rounded-full" style={{ backgroundColor: "#E6F5F4" }}>
                        <BookOpen className="w-6 h-6" style={{ color: "#006B64" }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Publications Section */}
              <Collapsible open={publicationsOpen} onOpenChange={setPublicationsOpen}>
                <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-700 text-white cursor-pointer hover:from-teal-700 hover:to-teal-800 transition-all">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Database className="w-5 h-5" />
                          <span>Publications Database</span>
                          <span className="ml-2 text-sm bg-white/20 px-2 py-1 rounded-full">
                            {totalPublications} records
                          </span>
                        </div>
                        {publicationsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-0">
                      {filteredPublications.length === 0 ? (
                        <div className="text-center py-16">
                          <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <div className="text-gray-500 mb-2">No publications found</div>
                          <div className="text-sm text-gray-400">Try adjusting your search or filter criteria</div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead className="w-[300px] font-semibold text-gray-700">Title</TableHead>
                                <TableHead className="w-[180px] font-semibold text-gray-700">Journal</TableHead>
                                <TableHead className="w-[80px] font-semibold text-gray-700">Quartile</TableHead>
                                <TableHead className="w-[100px] font-semibold text-gray-700">Impact Factor</TableHead>
                                <TableHead className="w-[100px] font-semibold text-gray-700">Cite Score</TableHead>
                                <TableHead className="w-[200px] font-semibold text-gray-700">Authors</TableHead>
                                <TableHead className="w-[120px] font-semibold text-gray-700">Position</TableHead>
                                <TableHead className="w-[100px] font-semibold text-gray-700">Volume/Issue</TableHead>
                                <TableHead className="w-[100px] font-semibold text-gray-700">Pages</TableHead>
                                <TableHead className="w-[120px] font-semibold text-gray-700">Date</TableHead>
                                <TableHead className="w-[100px] font-semibold text-gray-700">Academic Year</TableHead>
                                <TableHead className="w-[150px] font-semibold text-gray-700">DOI</TableHead>
                                <TableHead className="w-[100px] font-semibold text-gray-700">Link</TableHead>
                                <TableHead className="w-[150px] font-semibold text-gray-700">Faculty</TableHead>
                                <TableHead className="w-[100px] font-semibold text-gray-700">File</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredPublications.map((pub) => (
                                <TableRow key={pub.id} className="hover:bg-gray-50">
                                  <TableCell className="font-medium">
                                    <div className="text-sm leading-tight">{pub.title}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{pub.journal}</div>
                                  </TableCell>
                                  <TableCell>
                                    <span 
                                      className="px-2 py-1 rounded text-xs text-white"
                                      style={{ backgroundColor: "#006B64" }}
                                    >
                                      {pub.quartile}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm font-medium">{pub.impactFactor}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm font-medium">{pub.citeScore}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{pub.authors.join(', ')}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{pub.positionOfAuthor}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      {pub.volume}{pub.issue ? `(${pub.issue})` : ''}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{pub.startPage}-{pub.lastPage}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{pub.monthYear}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{pub.academicYear}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm font-mono text-xs">{pub.doi}</div>
                                  </TableCell>
                                  <TableCell>
                                    <a
                                      href={pub.link}
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
                                    <div className="text-sm">{pub.facultyName}</div>
                                  </TableCell>
                                  <TableCell>
                                    {pub.fileData ? (
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const newWindow = window.open();
                                            if (newWindow && pub.fileData) {
                                              newWindow.document.write(`
                                                <html>
                                                  <head><title>${pub.fileName || 'Document'}</title></head>
                                                  <body style="margin:0;">
                                                    ${pub.fileType?.startsWith('image/') 
                                                      ? `<img src="${pub.fileData}" style="max-width:100%;height:auto;" />`
                                                      : `<iframe src="${pub.fileData}" style="width:100%;height:100vh;border:none;"></iframe>`
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
                                          onClick={() => {
                                            if (pub.fileData) {
                                              const link = document.createElement('a');
                                              link.href = pub.fileData;
                                              link.download = pub.fileName || 'publication.pdf';
                                              document.body.appendChild(link);
                                              link.click();
                                              document.body.removeChild(link);
                                            }
                                          }}
                                          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                          title="Download file"
                                        >
                                          <Download className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400">No file</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Conferences Section */}
              <Collapsible open={conferencesOpen} onOpenChange={setConferencesOpen}>
                <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-700 text-white cursor-pointer hover:from-teal-700 hover:to-teal-800 transition-all">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Users className="w-5 h-5" />
                          <span>Conferences Database</span>
                          <span className="ml-2 text-sm bg-white/20 px-2 py-1 rounded-full">
                            {totalConferences} records
                          </span>
                        </div>
                        {conferencesOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-0">
                      {filteredConferences.length === 0 ? (
                        <div className="text-center py-16">
                          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <div className="text-gray-500 mb-2">No conferences found</div>
                          <div className="text-sm text-gray-400">Try adjusting your search or filter criteria</div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead className="w-[300px] font-semibold text-gray-700">Title</TableHead>
                                <TableHead className="w-[250px] font-semibold text-gray-700">Conference Name</TableHead>
                                <TableHead className="w-[120px] font-semibold text-gray-700">Date</TableHead>
                                <TableHead className="w-[200px] font-semibold text-gray-700">Authors</TableHead>
                                <TableHead className="w-[120px] font-semibold text-gray-700">Type</TableHead>
                                <TableHead className="w-[100px] font-semibold text-gray-700">Academic Year</TableHead>
                                <TableHead className="w-[150px] font-semibold text-gray-700">Host</TableHead>
                                <TableHead className="w-[150px] font-semibold text-gray-700">DOI</TableHead>
                                <TableHead className="w-[100px] font-semibold text-gray-700">Link</TableHead>
                                <TableHead className="w-[150px] font-semibold text-gray-700">Faculty</TableHead>
                                <TableHead className="w-[100px] font-semibold text-gray-700">File</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredConferences.map((conf) => (
                                <TableRow key={conf.id} className="hover:bg-gray-50">
                                  <TableCell className="font-medium">
                                    <div className="text-sm leading-tight">{conf.title}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm leading-tight">{conf.conferenceName}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{new Date(conf.date).toLocaleDateString()}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{conf.authors.join(', ')}</div>
                                  </TableCell>
                                  <TableCell>
                                    <span 
                                      className="px-2 py-1 rounded text-xs text-white"
                                      style={{ 
                                        backgroundColor: conf.type === 'International' ? '#006B64' : '#10B981' 
                                      }}
                                    >
                                      {conf.type}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{conf.academicYear}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{conf.host}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm font-mono text-xs">{conf.doi}</div>
                                  </TableCell>
                                  <TableCell>
                                    <a
                                      href={conf.link}
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
                                    <div className="text-sm">{conf.facultyName}</div>
                                  </TableCell>
                                  <TableCell>
                                    {conf.fileData ? (
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const newWindow = window.open();
                                            if (newWindow && conf.fileData) {
                                              newWindow.document.write(`
                                                <html>
                                                  <head><title>${conf.fileName || 'Document'}</title></head>
                                                  <body style="margin:0;">
                                                    ${conf.fileType?.startsWith('image/') 
                                                      ? `<img src="${conf.fileData}" style="max-width:100%;height:auto;" />`
                                                      : `<iframe src="${conf.fileData}" style="width:100%;height:100vh;border:none;"></iframe>`
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
                                          onClick={() => {
                                            if (conf.fileData) {
                                              const link = document.createElement('a');
                                              link.href = conf.fileData;
                                              link.download = conf.fileName || 'conference.pdf';
                                              document.body.appendChild(link);
                                              link.click();
                                              document.body.removeChild(link);
                                            }
                                          }}
                                          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                          title="Download file"
                                        >
                                          <Download className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400">No file</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Books & Book Chapters Section */}
              <Collapsible open={booksOpen} onOpenChange={setBooksOpen}>
                <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-700 text-white cursor-pointer hover:from-teal-700 hover:to-teal-800 transition-all">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="w-5 h-5" />
                          <span>Books & Book Chapters Database</span>
                          <span className="ml-2 text-sm bg-white/20 px-2 py-1 rounded-full">
                            {totalBooksChapters} records
                          </span>
                        </div>
                        {booksOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-0">
                      {filteredBooksChapters.length === 0 ? (
                        <div className="text-center py-16">
                          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <div className="text-gray-500 mb-2">No books or chapters found</div>
                          <div className="text-sm text-gray-400">Try adjusting your search or filter criteria</div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead className="w-[300px] font-semibold text-gray-700">Title</TableHead>
                                <TableHead className="w-[200px] font-semibold text-gray-700">Name of the Author</TableHead>
                                <TableHead className="w-[200px] font-semibold text-gray-700">Department Affiliation</TableHead>
                                <TableHead className="w-[160px] font-semibold text-gray-700">ISBN/ISSN</TableHead>
                                <TableHead className="w-[180px] font-semibold text-gray-700">Publisher</TableHead>
                                <TableHead className="w-[140px] font-semibold text-gray-700">Month and Year of Publication</TableHead>
                                <TableHead className="w-[120px] font-semibold text-gray-700">Academic Year</TableHead>
                                <TableHead className="w-[120px] font-semibold text-gray-700">Type</TableHead>
                                <TableHead className="w-[100px] font-semibold text-gray-700">Link</TableHead>
                                <TableHead className="w-[150px] font-semibold text-gray-700">Faculty</TableHead>
                                <TableHead className="w-[100px] font-semibold text-gray-700">File</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredBooksChapters.map((item) => (
                                <TableRow key={item.id} className="hover:bg-gray-50">
                                  <TableCell className="font-medium">
                                    <div className="text-sm leading-tight">{item.title}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{item.authorName}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{item.departmentAffiliation}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm font-mono">{item.isbnIssn}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm leading-tight">{item.publisher}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{item.monthYear}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">{item.academicYear}</div>
                                  </TableCell>
                                  <TableCell>
                                    <span 
                                      className="px-2 py-1 rounded-full text-xs text-white"
                                      style={{ 
                                        backgroundColor: item.type === 'Book' ? '#006B64' : '#10B981' 
                                      }}
                                    >
                                      {item.type}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <a
                                      href={item.link}
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
                                    <div className="text-sm">{item.facultyName}</div>
                                  </TableCell>
                                  <TableCell>
                                    {item.fileData ? (
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const newWindow = window.open();
                                            if (newWindow && item.fileData) {
                                              newWindow.document.write(`
                                                <html>
                                                  <head><title>${item.fileName || 'Document'}</title></head>
                                                  <body style="margin:0;">
                                                    ${item.fileType?.startsWith('image/') 
                                                      ? `<img src="${item.fileData}" style="max-width:100%;height:auto;" />`
                                                      : `<iframe src="${item.fileData}" style="width:100%;height:100vh;border:none;"></iframe>`
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
                                          onClick={() => {
                                            if (item.fileData) {
                                              const link = document.createElement('a');
                                              link.href = item.fileData;
                                              link.download = item.fileName || 'book.pdf';
                                              document.body.appendChild(link);
                                              link.click();
                                              document.body.removeChild(link);
                                            }
                                          }}
                                          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                          title="Download file"
                                        >
                                          <Download className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400">No file</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>
          )}

          {activeMenuItem === 'faculty' && (
            <div>
              <FacultyDirectory />
            </div>
          )}

          {activeMenuItem === 'settings' && (
            <div>
              <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Admin settings and configuration options will be available here.</p>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}