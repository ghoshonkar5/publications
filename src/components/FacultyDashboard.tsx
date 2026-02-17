import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { GitamLogo } from "./GitamLogo";
import { BookOpen, Users, Book, LogOut, User, Mail, Phone, MapPin, Award, RefreshCw, Database, TrendingUp, ExternalLink } from "lucide-react";
import { useAuth } from "./AuthContext";
import { api } from "../utils/api";

interface FacultyData {
  name: string;
  facultyId: string;
  department: string;
  designation: string;
  email: string;
  mobile: string;
  researchArea: string;
}

interface AcademicStats {
  publications: {
    total: number;
    thisYear: number;
    journals: number;
  };
  conferences: {
    total: number;
    international: number;
    national: number;
  };
  books: {
    total: number;
    books: number;
    chapters: number;
  };
  citations: {
    total: number;
    hIndex: number;
    i10Index: number;
  };
}

interface FacultyDashboardProps {
  onNavigateToPublications: () => void;
  onNavigateToConferences: () => void;
  onNavigateToBooksChapters: () => void;
  onLogout: () => void;
}

export function FacultyDashboard({ 
  onNavigateToPublications, 
  onNavigateToConferences,
  onNavigateToBooksChapters,
  onLogout 
}: FacultyDashboardProps) {
  const { user } = useAuth();
  // State for faculty data and academic statistics
  const [facultyData, setFacultyData] = useState<FacultyData | null>(null);
  const [academicStats, setAcademicStats] = useState<AcademicStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Load faculty profile and academic data
  useEffect(() => {
    if (user?.id && user?.accessToken) {
      loadFacultyData();
      loadAcademicStats();
    }
  }, [user]);

  const loadFacultyData = async () => {
    try {
      console.log('Loading faculty profile data...');
      
      // Use authenticated user data
      if (user) {
        setFacultyData({
          name: user.name || "Faculty User",
          facultyId: user.facultyId || "FAC000000",
          department: user.department || "Computer Science & Engineering", 
          designation: user.designation || "Assistant Professor",
          email: user.email,
          mobile: user.mobile || "+91-0000000000",
          researchArea: user.researchArea || "Research Area"
        });
      }
      
    } catch (error) {
      console.error('Failed to load faculty data:', error);
    }
  };

  const loadAcademicStats = async () => {
    if (!user?.id || !user?.accessToken) return;
    
    try {
      console.log('Loading academic statistics...');
      
      const response = await api.getFacultyData(user.id, user.accessToken);
      
      if (response.success && response.data) {
        setAcademicStats(response.data.academicStats);
      } else {
        // Fallback to default stats with dummy data (updated with new entries)
        setAcademicStats({
          publications: { total: 6, thisYear: 15, journals: 6 },
          conferences: { total: 6, international: 5, national: 1 },
          books: { total: 6, books: 3, chapters: 3 },
          citations: { total: 2847, hIndex: 24, i10Index: 32 }
        });
      }
      
    } catch (error) {
      console.error('Failed to load academic statistics:', error);
      // Fallback to default stats with dummy data (updated with new entries)
      setAcademicStats({
        publications: { total: 6, thisYear: 15, journals: 6 },
        conferences: { total: 6, international: 5, national: 1 },
        books: { total: 6, books: 3, chapters: 3 },
        citations: { total: 2847, hIndex: 24, i10Index: 32 }
      });
    }
  };

  const syncAllData = async () => {
    if (!user?.id || !user?.accessToken) return;
    
    setIsLoading(true);
    try {
      console.log('Syncing all academic data from external sources...');
      
      const response = await api.syncData(user.id, user.accessToken);
      
      if (response.success) {
        // Reload all data after sync
        await Promise.all([
          loadFacultyData(),
          loadAcademicStats()
        ]);
        
        setLastSync(new Date());
      } else {
        console.error('Sync failed:', response.error);
      }
    } catch (error) {
      console.error('Failed to sync academic data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-teal-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <GitamLogo className="w-10 h-10" />
              <div>
                <h1 className="text-xl text-black">
                  Research Management Dashboard
                </h1>
                <p className="text-sm" style={{ color: "#006B64" }}>GITAM University Faculty Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={syncAllData}
                disabled={isLoading}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Syncing...' : 'Sync All Academic Data'}
              </Button>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {facultyData ? (
          <>
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-3xl text-black mb-2">
                Welcome back, {facultyData.name.split(' ')[facultyData.name.split(' ').length - 1]}!
              </h2>
              <p style={{ color: "#006B64" }}>Manage your academic portfolio and research activities.</p>
              {lastSync && (
                <p className="text-sm text-gray-500 mt-1">
                  Last synced: {lastSync.toLocaleDateString()} at {lastSync.toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Faculty Details Section */}
            <Card className="mb-8 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
              <CardHeader className="text-white rounded-t-xl" style={{ background: "linear-gradient(135deg, #006B64 0%, #005A54 100%)" }}>
                <CardTitle className="flex items-center space-x-3 text-white">
                  <User className="w-6 h-6" />
                  <span>Faculty Profile</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#E6F7F5" }}>
                      <User className="w-5 h-5" style={{ color: "#006B64" }} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="text-black">{facultyData.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#E6F7F5" }}>
                      <Award className="w-5 h-5" style={{ color: "#006B64" }} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Faculty ID</p>
                      <p className="text-black">{facultyData.facultyId}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#E6F7F5" }}>
                      <MapPin className="w-5 h-5" style={{ color: "#006B64" }} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Department</p>
                      <p className="text-black">{facultyData.department}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#E6F7F5" }}>
                      <Award className="w-5 h-5" style={{ color: "#006B64" }} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Designation</p>
                      <p className="text-black">{facultyData.designation}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#E6F7F5" }}>
                      <Mail className="w-5 h-5" style={{ color: "#006B64" }} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-black">{facultyData.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#E6F7F5" }}>
                      <BookOpen className="w-5 h-5" style={{ color: "#006B64" }} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Research Area</p>
                      <p className="text-black">{facultyData.researchArea}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          /* Loading State for Faculty Profile */
          <div className="mb-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-96 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-64"></div>
            </div>
          </div>
        )}

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Publications Card */}
          <Card 
            className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl hover:shadow-xl transition-all duration-200 cursor-pointer group"
            onClick={onNavigateToPublications}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200" style={{ background: "linear-gradient(135deg, #006B64 0%, #005A54 100%)" }}>
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-2xl text-black">
                    {academicStats?.publications.total || '—'}
                  </p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
              </div>
              <h3 className="text-lg text-black mb-2">Publications</h3>
              <p className="text-gray-600 text-sm mb-4">Manage your research papers, journal articles, and academic publications.</p>
              <Button className="w-full text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: "#006B64" }}>
                View Publications
              </Button>
            </CardContent>
          </Card>

          {/* Conferences Card */}
          <Card 
            className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl hover:shadow-xl transition-all duration-200 cursor-pointer group"
            onClick={onNavigateToConferences}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200" style={{ background: "linear-gradient(135deg, #006B64 0%, #005A54 100%)" }}>
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-2xl text-black">
                    {academicStats?.conferences.total || '—'}
                  </p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
              </div>
              <h3 className="text-lg text-black mb-2">Conferences</h3>
              <p className="text-gray-600 text-sm mb-4">Track your conference presentations, proceedings, and academic events.</p>
              <Button className="w-full text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: "#006B64" }}>
                View Conferences
              </Button>
            </CardContent>
          </Card>

          {/* Books & Book Chapters Card */}
          <Card 
            className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl hover:shadow-xl transition-all duration-200 cursor-pointer group"
            onClick={onNavigateToBooksChapters}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200" style={{ background: "linear-gradient(135deg, #006B64 0%, #005A54 100%)" }}>
                  <Book className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-2xl text-black">
                    {academicStats?.books.total || '—'}
                  </p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
              </div>
              <h3 className="text-lg text-black mb-2">Books & Book Chapters</h3>
              <p className="text-gray-600 text-sm mb-4">Manage your authored books, book chapters, and editorial works.</p>
              <Button className="w-full text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: "#006B64" }}>
                View Books & Chapters
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Statistics */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" style={{ color: "#006B64" }} />
                <span style={{ color: "#006B64" }}>Academic Impact Metrics</span>
              </div>
              <div className="text-sm text-gray-500">
                Auto-updated from verified sources
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {academicStats ? (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>{academicStats.publications.total}</p>
                  <p className="text-sm" style={{ color: "#005A54" }}>Total Publications</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>{academicStats.publications.thisYear}</p>
                  <p className="text-sm" style={{ color: "#005A54" }}>This Year</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>{academicStats.conferences.total}</p>
                  <p className="text-sm" style={{ color: "#005A54" }}>Conferences</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>{academicStats.books.total}</p>
                  <p className="text-sm" style={{ color: "#005A54" }}>Books & Chapters</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>{academicStats.citations.total}</p>
                  <p className="text-sm" style={{ color: "#005A54" }}>Total Citations</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                  <p className="text-2xl" style={{ color: "#006B64" }}>{academicStats.citations.hIndex}</p>
                  <p className="text-sm" style={{ color: "#005A54" }}>H-Index</p>
                </div>
              </div>
            ) : (
              /* Loading State for Statistics */
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="text-center p-4 rounded-lg animate-pulse" style={{ background: "linear-gradient(135deg, #E6F7F5 0%, #CCF2E8 100%)" }}>
                    <div className="h-8 bg-gray-300 rounded mb-2 mx-auto w-12"></div>
                    <div className="h-4 bg-gray-200 rounded mx-auto w-16"></div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
      </main>
    </div>
  );
}