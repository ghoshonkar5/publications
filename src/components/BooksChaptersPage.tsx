import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GitamLogo } from "./GitamLogo";
import { ArrowLeft, Search, Download, RefreshCw, BookOpen, ExternalLink, Plus, Database } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { AddBookForm } from "./AddBookForm";
import { FilterDropdown } from "./FilterDropdown";
import { mockBooksChapters } from "../utils/mockData";
import { generateAcademicYears, parseAcademicYear } from "../utils/academicYears";
import type { BookChapter } from "../utils/mockData";

interface BooksChaptersPageProps {
  onBackToDashboard: () => void;
}

export function BooksChaptersPage({ onBackToDashboard }: BooksChaptersPageProps) {
  const [booksChapters, setBooksChapters] = useState<BookChapter[]>(mockBooksChapters);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');

  // This will be replaced with actual API calls to academic databases and publisher APIs
  const syncBooksChapters = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement API calls to:
      // 1. Scopus API for book publications and book chapters
      // 2. Web of Science Book Citation Index
      // 3. Google Scholar for book publications
      // 4. WorldCat API for ISBN/ISSN validation and metadata
      // 5. Publisher APIs (Springer, Elsevier, etc.) for additional metadata
      
      console.log('Syncing books and book chapters from academic databases...');
      // Placeholder for actual API integration
      setLastSync(new Date());
    } catch (error) {
      console.error('Failed to sync books and book chapters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportBooksChapters = () => {
    // Export functionality for books and book chapters data
    console.log('Exporting books and book chapters data...');
  };

  const handleAddBookChapter = async (bookData: any) => {
    try {
      // Generate a unique ID for the new book/chapter
      const newBookChapter: BookChapter = {
        id: Date.now().toString(),
        title: bookData.title,
        authorName: bookData.authors.join(', '),
        departmentAffiliation: bookData.subject || 'N/A',
        isbnIssn: bookData.isbn || '',
        publisher: bookData.publisher,
        monthYear: new Date(bookData.publicationDate).toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        }),
        academicYear: bookData.academicYear || '',
        type: bookData.type as 'Book' | 'Book Chapter',
        link: bookData.link || '',
        fileData: bookData.fileData || undefined,
        fileName: bookData.fileName || undefined,
        fileType: bookData.fileType || undefined
      };

      // Add to books/chapters list
      setBooksChapters(prev => [...prev, newBookChapter]);
      
      console.log('Book/Chapter added:', newBookChapter);
      
      // In a real app, this would make an API call to save the data
      // await api.addBookChapter(newBookChapter);
      
    } catch (error) {
      console.error('Failed to add book/chapter:', error);
      throw error;
    }
  };

  // Generate academic year ranges (2024-2025, 2023-2024, ... 1999-2000)
  const allAcademicYears = generateAcademicYears();

  const filteredBooksChapters = booksChapters.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.publisher.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.departmentAffiliation.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Match against academic year - handle both formats
    const bookYear = parseAcademicYear(item.academicYear);
    const matchesYear = selectedAcademicYear === 'all' || bookYear === selectedAcademicYear;
    
    return matchesSearch && matchesYear;
  });

  const handleDownloadFile = (bookChapter: BookChapter) => {
    if (bookChapter.fileData) {
      const link = document.createElement('a');
      link.href = bookChapter.fileData;
      link.download = bookChapter.fileName || 'book.pdf';
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
                className="hover:bg-teal-50"
                style={{ color: "#006B64" }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                <GitamLogo className="w-8 h-8" />
                <div>
                  <h1 className="text-lg text-black">Books & Book Chapters Management</h1>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={syncBooksChapters}
                disabled={isLoading}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Syncing...' : 'Sync Publications'}
              </Button>
              <Button 
                onClick={() => setIsAddFormOpen(true)}
                variant="outline" 
                className="border-teal-300 hover:bg-teal-50"
                style={{ color: "#006B64" }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Book/Chapter
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ position: 'relative', zIndex: 0 }}>
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl text-black mb-2">Books & Book Chapters</h2>
          <p style={{ color: "#006B64" }}>
            Your authored books and book chapters are automatically synced from academic databases and publisher records.
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
                      placeholder="Search by title, author, or publisher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-50 border-gray-200 focus:border-teal-400 focus:ring-teal-200"
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500" style={{ fontSize: '12px' }}>
                  {filteredBooksChapters.length} item{filteredBooksChapters.length !== 1 ? 's' : ''} found
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Books & Book Chapters Table */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
          <CardHeader className="text-white rounded-t-xl" style={{ background: "linear-gradient(135deg, #006B64 0%, #005A54 100%)" }}>
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5" />
                <span>Books & Book Chapters Database</span>
              </div>
              <span className="text-sm bg-white/20 px-2 py-1 rounded-full">
                {filteredBooksChapters.length} records
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredBooksChapters.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-500 mb-2">No books or book chapters found</div>
                <div className="text-sm text-gray-400 mb-4">
                  Your authored books and book chapters will appear here after syncing with academic databases
                </div>
                <Button 
                  onClick={syncBooksChapters}
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
                      <TableHead className="w-[200px] font-semibold text-gray-700">Name of the Author</TableHead>
                      <TableHead className="w-[200px] font-semibold text-gray-700">Department Affiliation</TableHead>
                      <TableHead className="w-[160px] font-semibold text-gray-700">ISBN/ISSN</TableHead>
                      <TableHead className="w-[180px] font-semibold text-gray-700">Publisher</TableHead>
                      <TableHead className="w-[140px] font-semibold text-gray-700">Month and Year of Publication</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Academic Year</TableHead>
                      <TableHead className="w-[120px] font-semibold text-gray-700">Type</TableHead>
                      <TableHead className="w-[100px] font-semibold text-gray-700">Link</TableHead>
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
                                onClick={() => handleDownloadFile(item)}
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
        {filteredBooksChapters.length > 0 && (
          <Card className="mt-8 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
            <CardHeader>
              <CardTitle style={{ color: "#006B64" }}>Publication Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>
                    {booksChapters.filter(item => item.type === 'Book').length}
                  </p>
                  <p className="text-sm" style={{ color: "#005A54" }}>Books</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>
                    {booksChapters.filter(item => item.type === 'Book Chapter').length}
                  </p>
                  <p className="text-sm" style={{ color: "#005A54" }}>Book Chapters</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>
                    {booksChapters.length}
                  </p>
                  <p className="text-sm" style={{ color: "#005A54" }}>Total Publications</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>
                    {new Set(booksChapters.map(item => item.publisher)).size}
                  </p>
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

        {/* Add Book/Chapter Form */}
        <AddBookForm
          isOpen={isAddFormOpen}
          onClose={() => setIsAddFormOpen(false)}
          onSubmit={handleAddBookChapter}
        />
      </main>
    </div>
  );
}