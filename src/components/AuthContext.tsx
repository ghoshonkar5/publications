import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authAPI } from '../utils/api';

export interface User {
  id: string;
  email: string;
  name?: string;
  facultyId?: string;
  department?: string;
  designation?: string;
  mobile?: string;
  researchArea?: string;
  role?: string;
  isFirstTimeLogin?: boolean;
  profileSetupComplete?: boolean;
  // Academic profile URLs
  googleScholarUrl?: string | null;
  scopusUrl?: string | null;
  scopusUrl2?: string | null;
  scopusUrl3?: string | null;
  wosUrl?: string | null;
  // Extended profile fields
  officeRoom?: string | null;
  officeHours?: string | null;
  coursesTaught?: string | null;
  roles?: string | null;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  yearsOfExperience?: number | null;
  profilePhoto?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (facultyId: string, password: string) => Promise<{ success: boolean; error?: string; isFirstTimeLogin?: boolean; isAdmin?: boolean }>;
  signup: (userData: {
    facultyId: string;
    password: string;
    name: string;
    email: string;
    department: string;
    designation: string;
    mobile: string;
    researchArea: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<User>) => Promise<{ success: boolean; error?: string }>;
updateProfileUrls: (urls: { googleScholarUrl?: string; scopusUrl?: string; scopusUrl2?: string; scopusUrl3?: string; wosUrl?: string }) => Promise<{ success: boolean; error?: string }>;  saveExtendedProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const mapBackendUser = (backendUser: any): User => ({
  id: backendUser.id,
  email: backendUser.email,
  name: backendUser.name,
  facultyId: backendUser.facultyId ?? (backendUser.role === 'admin' ? 'admin' : undefined),
  department: backendUser.department,
  designation: backendUser.designation,
  mobile: backendUser.mobile,
  researchArea: backendUser.researchArea,
  role: backendUser.role,
  isFirstTimeLogin: !backendUser.profileSetupComplete,
  profileSetupComplete: backendUser.profileSetupComplete,
  googleScholarUrl: backendUser.googleScholarUrl || null,
  scopusUrl: backendUser.scopusUrl || null,
  scopusUrl2: backendUser.scopusUrl2 || null,
  scopusUrl3: backendUser.scopusUrl3 || null,
  wosUrl: backendUser.wosUrl || null,
  officeRoom: backendUser.officeRoom || null,
  officeHours: backendUser.officeHours || null,
  coursesTaught: backendUser.coursesTaught || null,
  roles: backendUser.roles || null,
  linkedinUrl: backendUser.linkedinUrl || null,
  websiteUrl: backendUser.websiteUrl || null,
  yearsOfExperience: backendUser.yearsOfExperience || null,
  profilePhoto: backendUser.profilePhoto || null,
});

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
    console.log('🚀 GITAM Faculty Management System - Connected to Backend');
  }, []);

  const checkSession = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const response: any = await authAPI.getMe();
          if (response.success && response.user) {
            setUser(mapBackendUser(response.user));
          } else {
            authAPI.logout();
            setUser(null);
          }
        } catch (error) {
          authAPI.logout();
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      authAPI.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (facultyId: string, password: string) => {
    try {
      const response: any = await authAPI.login(facultyId, password);
      if (response.success && response.user) {
        const mappedUser = mapBackendUser(response.user);
        setUser(mappedUser);
        return {
          success: true,
          isFirstTimeLogin: !response.user.profileSetupComplete,
          isAdmin: response.user.role === 'admin'
        };
      } else {
        return { success: false, error: response.message || 'Invalid credentials.' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Unable to connect to server.' };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData: {
    facultyId: string; password: string; name: string; email: string;
    department: string; designation: string; mobile: string; researchArea: string;
  }) => {
    try {
      const response: any = await authAPI.register(userData);
      if (response.success && response.user) {
        const mappedUser = mapBackendUser(response.user);
        setUser(mappedUser);
        return { success: true };
      } else {
        return { success: false, error: response.message || 'Registration failed.' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Unable to connect to server.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    authAPI.logout();
    setUser(null);
  };

  // Local-only profile update (for small changes)
  const updateProfile = async (profile: Partial<User>) => {
    try {
      if (!user) return { success: false, error: 'No user logged in' };
      const updatedUser = { ...user, ...profile, isFirstTimeLogin: false, profileSetupComplete: true };
      setUser(updatedUser);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Profile update failed.' };
    }
  };

  // Save extended profile to DB via PUT /api/auth/profile
  const saveExtendedProfile = async (data: Partial<User>) => {
    try {
      if (!user) return { success: false, error: 'No user logged in' };
      const response: any = await authAPI.updateExtendedProfile(data);
      if (response.success) {
        // ✅ Re-fetch from DB so user state has exactly what was saved
        const meResponse: any = await authAPI.getMe();
        if (meResponse.success && meResponse.user) {
          setUser(mapBackendUser(meResponse.user));
        } else {
          // Fallback: merge locally if getMe fails
          setUser({ ...user, ...data, profileSetupComplete: true, isFirstTimeLogin: false });
        }
        return { success: true };
      } else {
        return { success: false, error: response.message || 'Failed to save profile' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to save profile' };
    }
  };

  const updateProfileUrls = async (urls: { googleScholarUrl?: string; scopusUrl?: string; scopusUrl2?: string; scopusUrl3?: string; wosUrl?: string }) => {
    try {
      if (!user) return { success: false, error: 'No user logged in' };
      const response: any = await authAPI.updateProfileUrls(urls);
      if (response.success) {
        // ✅ Re-fetch from DB to keep everything in sync
        const meResponse: any = await authAPI.getMe();
        if (meResponse.success && meResponse.user) {
          setUser(mapBackendUser(meResponse.user));
        } else {
          setUser({
            ...user,
            googleScholarUrl: urls.googleScholarUrl ?? user.googleScholarUrl,
            scopusUrl: urls.scopusUrl ?? user.scopusUrl,
            scopusUrl2: urls.scopusUrl2 ?? user.scopusUrl2,
            scopusUrl3: urls.scopusUrl3 ?? user.scopusUrl3,
            wosUrl: urls.wosUrl ?? user.wosUrl,
          });
        }
        return { success: true };
      } else {
        return { success: false, error: response.message || 'Failed to update profile URLs' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update profile URLs' };
    }
  };

  const getAccessToken = () => localStorage.getItem('authToken');

  const value: AuthContextType = {
    user, loading, login, signup, logout,
    updateProfile, updateProfileUrls, saveExtendedProfile, getAccessToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}