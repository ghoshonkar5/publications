import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./components/AuthContext";
import { LoginForm } from "./components/LoginForm";
import { SignUpForm } from "./components/SignUpForm";
import { ProfileSetup } from "./components/ProfileSetup";
import { FacultyDashboard } from "./components/FacultyDashboard";
import { PublicationsPage } from "./components/PublicationsPage";
import { ConferencesPage } from "./components/ConferencesPage";
import { BooksChaptersPage } from "./components/BooksChaptersPage";
import { AdminDashboard } from "./components/AdminDashboard";
import { GitamLogo } from "./components/GitamLogo";

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [currentView, setCurrentView] = useState<"login" | "signup" | "profile-setup" | "dashboard" | "publications" | "conferences" | "books" | "admin">("login");
  const [isAdminMode, setIsAdminMode] = useState(false);

  const switchToSignUp = () => setCurrentView("signup");
  const switchToLogin = () => {
    setCurrentView("login");
    setIsAdminMode(false);
  };
  const switchToDashboard = () => setCurrentView("dashboard");
  const switchToPublications = () => setCurrentView("publications");
  const switchToConferences = () => setCurrentView("conferences");
  const switchToBooksChapters = () => setCurrentView("books");

  const handleLogout = async () => {
    await logout();
    setCurrentView("login");
    setIsAdminMode(false);
  };

  // Handle authentication state changes
  useEffect(() => {
    console.log('🔍 App.tsx useEffect - User changed:', user);
    if (user) {
      console.log('✅ User found, facultyId:', user.facultyId);
      // Check if this is an admin user (facultyId 'admin')
      if (user.facultyId === 'admin') {
        console.log('🔐 Admin user detected, switching to admin view');
        setIsAdminMode(true);
        setCurrentView("admin");
      } else if (user.isFirstTimeLogin) {
        console.log('👋 First time login, switching to profile setup');
        setCurrentView("profile-setup");
      } else {
        console.log('📊 Regular user, switching to dashboard');
        setCurrentView("dashboard");
      }
    } else {
      console.log('❌ No user, switching to login view');
      setCurrentView("login");
      setIsAdminMode(false);
    }
  }, [user]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <GitamLogo className="w-20 h-20 mx-auto mb-4 animate-pulse" />
          <div className="text-teal-600">Loading...</div>
        </div>
      </div>
    );
  }

  // Profile Setup view
  if (currentView === "profile-setup") {
    return <ProfileSetup />;
  }

  // Dashboard view
  if (currentView === "dashboard") {
    return (
      <FacultyDashboard 
        onNavigateToPublications={switchToPublications}
        onNavigateToConferences={switchToConferences}
        onNavigateToBooksChapters={switchToBooksChapters}
        onLogout={handleLogout}
      />
    );
  }

  // Publications page
  if (currentView === "publications") {
    return (
      <PublicationsPage onBackToDashboard={switchToDashboard} />
    );
  }

  // Conferences page
  if (currentView === "conferences") {
    return (
      <ConferencesPage onBackToDashboard={switchToDashboard} />
    );
  }

  // Books & Book Chapters page
  if (currentView === "books") {
    return (
      <BooksChaptersPage onBackToDashboard={switchToDashboard} />
    );
  }

  // Admin Dashboard
  if (currentView === "admin") {
    return (
      <AdminDashboard onLogout={handleLogout} />
    );
  }

  // Login/Signup view
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50 flex">
      {/* Left Side - Branding and Information */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ backgroundColor: "#006E63" }}
      >
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white w-full">
          <GitamLogo className="w-40 h-40 mb-12" />
          <div className="text-center">
            <h1 className="text-4xl font-semibold mb-4 text-white">
              GITAM University
            </h1>
            <p className="text-xl mb-6 text-white/90">
              Excellence in Education and Research
            </p>
            <p className="text-lg text-white/80 max-w-md leading-relaxed">
              {currentView === "login"
                ? "Access your academic portal and stay connected with the GITAM community. Empowering minds, shaping futures."
                : "Join the GITAM faculty portal to showcase your research, manage publications, and collaborate with fellow academicians. Advancing knowledge through innovation."}
            </p>

            <div className="mt-12 flex justify-center space-x-8">
              <div className="text-center">
                <div className="text-2xl font-semibold text-white">
                  50+
                </div>
                <div className="text-sm text-white/80">
                  Years of Excellence
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-white">
                  100K+
                </div>
                <div className="text-sm text-white/80">
                  Alumni Worldwide
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-white">
                  200+
                </div>
                <div className="text-sm text-white/80">
                  Programs
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white/30">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <GitamLogo className="w-20 h-20 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-teal-800">
              GITAM University
            </h1>
            <p className="text-teal-600">Academic Portal</p>
          </div>

          {/* Conditional Form Rendering */}
          {currentView === "login" ? (
            <LoginForm 
              onSwitchToSignUp={switchToSignUp}
            />
          ) : (
            <SignUpForm onSwitchToLogin={switchToLogin} />
          )}

          <div className="mt-8 text-center text-sm text-teal-500">
            <p>Need help? Contact IT Support</p>
            <p className="mt-1">
              Email:{" "}
              <a
                href="mailto:support@gitam.edu"
                className="text-teal-600 hover:text-teal-700 hover:underline transition-colors"
              >
                support@gitam.edu
              </a>
            </p>
            <p>Phone: +91-863-2344700</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}