import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthContext";
import { LoginForm } from "./components/LoginForm";
import { SignUpForm } from "./components/SignUpForm";
import { ProfileSetup } from "./components/ProfileSetup";
import { EditProfile } from "./components/EditProfile";
import { FacultyDashboard } from "./components/FacultyDashboard";
import { PublicationsPage } from "./components/PublicationsPage";
import { ConferencesPage } from "./components/ConferencesPage";
import { BooksChaptersPage } from "./components/BooksChaptersPage";
import { AdminDashboard } from "./components/AdminDashboard";
import { GitamLogo } from "./components/GitamLogo";

// ── Protected route wrapper ──────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true });
  }, [user, loading]);

  if (loading) return <LoadingScreen />;
  if (!user) return null;
  return <>{children}</>;
}

// ── Admin-only route wrapper ─────────────────────────────────────
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) navigate('/login', { replace: true });
      else if (user.role !== 'admin' && user.facultyId !== 'admin') navigate('/dashboard', { replace: true });
    }
  }, [user, loading]);

  if (loading) return <LoadingScreen />;
  if (!user || (user.role !== 'admin' && user.facultyId !== 'admin')) return null;
  return <>{children}</>;
}

// ── Loading screen ───────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50 flex items-center justify-center">
      <div className="text-center">
        <GitamLogo className="w-20 h-20 mx-auto mb-4 animate-pulse" />
        <div className="text-teal-600">Loading...</div>
      </div>
    </div>
  );
}

// ── Auth redirect — sends logged-in users to correct home ────────
function AuthRedirect({ view }: { view: 'login' | 'signup' }) {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    // handled by AuthContext user state change → useEffect below
  };

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin' || user.facultyId === 'admin') navigate('/admin', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  }, [user, loading]);

  if (loading) return <LoadingScreen />;
  if (user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50 flex">
      {/* Left Side */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ backgroundColor: "#006E63" }}>
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white w-full">
          <GitamLogo className="w-40 h-40 mb-12" />
          <div className="text-center">
            <h1 className="text-4xl font-semibold mb-4 text-white">GITAM University</h1>
            <p className="text-xl mb-6 text-white/90">Excellence in Education and Research</p>
            <p className="text-lg text-white/80 max-w-md leading-relaxed">
              {view === 'login'
                ? "Access your academic portal and stay connected with the GITAM community."
                : "Join the GITAM faculty portal to showcase your research and manage publications."}
            </p>
            <div className="mt-12 flex justify-center space-x-8">
              {[['50+', 'Years of Excellence'], ['100K+', 'Alumni Worldwide'], ['200+', 'Programs']].map(([val, label]) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-semibold text-white">{val}</div>
                  <div className="text-sm text-white/80">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white/30">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <GitamLogo className="w-20 h-20 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-teal-800">GITAM University</h1>
            <p className="text-teal-600">Academic Portal</p>
          </div>
          {view === 'login' ? (
            <LoginForm onSwitchToSignUp={() => navigate('/signup')} />
          ) : (
            <SignUpForm onSwitchToLogin={() => navigate('/login')} />
          )}
          <div className="mt-8 text-center text-sm text-teal-500">
            <p>Need help? Contact IT Support</p>
            <p className="mt-1">Email: <a href="mailto:support@gitam.edu" className="text-teal-600 hover:underline">support@gitam.edu</a></p>
            <p>Phone: +91-863-2344700</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Root redirect ────────────────────────────────────────────────
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin' || user.facultyId === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

// ── App content with routes ──────────────────────────────────────
function AppRoutes() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<AuthRedirect view="login" />} />
      <Route path="/signup" element={<AuthRedirect view="signup" />} />

      {/* Faculty routes */}
      <Route path="/dashboard" element={<RequireAuth><FacultyDashboard onLogout={handleLogout} /></RequireAuth>} />
      <Route path="/publications" element={<RequireAuth><PublicationsPage /></RequireAuth>} />
      <Route path="/conferences" element={<RequireAuth><ConferencesPage /></RequireAuth>} />
      <Route path="/books" element={<RequireAuth><BooksChaptersPage /></RequireAuth>} />
      <Route path="/profile-setup" element={<RequireAuth><ProfileSetup /></RequireAuth>} />
      <Route path="/edit-profile" element={<RequireAuth><EditProfile /></RequireAuth>} />

      {/* Admin routes */}
      <Route path="/admin" element={<RequireAdmin><AdminDashboard onLogout={handleLogout} /></RequireAdmin>} />
      <Route path="/admin/faculty" element={<RequireAdmin><AdminDashboard onLogout={handleLogout} /></RequireAdmin>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}