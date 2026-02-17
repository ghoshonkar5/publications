import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authAPI } from '../utils/api';

// Types for our authentication system
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
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
    console.log('🚀 GITAM Faculty Management System - Connected to Backend');
    console.log('📋 Faculty Demo Credentials: Faculty ID: 1309, Password: password123');
    console.log('📋 Admin Credentials: Admin ID: admin, Password: admin123');
    console.log('✅ Backend API running on http://localhost:5000');
  }, []);

  const checkSession = async () => {
    try {
      // Check if we have a stored user
      const storedUser = authAPI.getCurrentUser();
      const token = localStorage.getItem('authToken');
      
      if (storedUser && token) {
        // Verify token is still valid by fetching current user
        try {
          const response: any = await authAPI.getMe();
          if (response.success && response.user) {
            setUser(response.user);
            console.log('✅ Session restored for user:', response.user.facultyId);
          } else {
            // Token invalid, clear storage
            authAPI.logout();
          }
        } catch (error) {
          // Token expired or invalid
          console.log('⚠️ Session expired, please login again');
          authAPI.logout();
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
      authAPI.logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (facultyId: string, password: string) => {
    try {
      setLoading(true);
      
      console.log('🔐 Attempting login for:', facultyId);
      
      // Call backend login API
      const response: any = await authAPI.login(facultyId, password);
      
      if (response.success && response.user) {
        console.log('✅ Login successful for user:', response.user.facultyId);
        
        // Map backend user to frontend User type
        const mappedUser: User = {
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          facultyId: response.user.facultyId,
          department: response.user.department,
          designation: response.user.designation,
          mobile: response.user.mobile,
          researchArea: response.user.researchArea,
          role: response.user.role,
          isFirstTimeLogin: !response.user.profileSetupComplete,
          profileSetupComplete: response.user.profileSetupComplete
        };
        
        setUser(mappedUser);
        
        return { 
          success: true, 
          isFirstTimeLogin: !response.user.profileSetupComplete,
          isAdmin: response.user.role === 'admin'
        };
      } else {
        console.log('❌ Login failed');
        return { 
          success: false, 
          error: response.message || 'Invalid credentials. Please check your Faculty ID and password.' 
        };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Unable to connect to server. Please ensure the backend is running on http://localhost:5000' 
      };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData: {
    facultyId: string;
    password: string;
    name: string;
    email: string;
    department: string;
    designation: string;
    mobile: string;
    researchArea: string;
  }) => {
    try {
      setLoading(true);
      
      console.log('📝 Attempting registration for:', userData.name);
      
      // Call backend register API
      const response: any = await authAPI.register(userData);
      
      if (response.success && response.user) {
        console.log('✅ Registration successful for:', response.user.facultyId);
        
        // Map backend user to frontend User type
        const mappedUser: User = {
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          facultyId: response.user.facultyId,
          department: response.user.department,
          designation: response.user.designation,
          mobile: response.user.mobile,
          researchArea: response.user.researchArea,
          role: response.user.role,
          isFirstTimeLogin: false,
          profileSetupComplete: true
        };
        
        setUser(mappedUser);
        
        return { 
          success: true
        };
      } else {
        return { 
          success: false, 
          error: response.message || 'Registration failed. Please try again.' 
        };
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      return { 
        success: false, 
        error: error.message || 'Unable to connect to server. Please ensure the backend is running.' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('👋 Logging out...');
      authAPI.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (profile: Partial<User>) => {
    try {
      if (!user) {
        return { success: false, error: 'No user logged in' };
      }

      console.log('📝 Updating profile...');
      
      // For now, update locally (you can add a backend endpoint for this later)
      const updatedUser = { 
        ...user, 
        ...profile, 
        isFirstTimeLogin: false,
        profileSetupComplete: true 
      };
      
      setUser(updatedUser);
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return { success: true };
    } catch (error: any) {
      console.error('Update profile error:', error);
      return { 
        success: false, 
        error: error.message || 'Profile update failed. Please try again.' 
      };
    }
  };

  const getAccessToken = () => {
    return localStorage.getItem('authToken');
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    updateProfile,
    getAccessToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}