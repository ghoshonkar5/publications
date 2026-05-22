import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext";

interface LoginFormProps {
  onSwitchToSignUp: () => void;
}

export function LoginForm({ onSwitchToSignUp }: LoginFormProps) {
  const { login } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    facultyId: '',
    password: '',
    userType: 'faculty'
  });
  const [currentTab, setCurrentTab] = useState(() => searchParams.get('tab') === 'admin' ? 'admin' : 'faculty');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotId, setForgotId] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    setSearchParams(value === 'admin' ? { tab: 'admin' } : {}, { replace: true });
    setFormData({
      facultyId: '',
      password: '',
      userType: value
    });
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // If it's faculty ID on Faculty tab, only allow numeric input
    if (name === 'facultyId' && currentTab === 'faculty') {
      // Remove any non-numeric characters
      const numericValue = value.replace(/[^0-9]/g, '');
      setFormData({
        ...formData,
        [name]: numericValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent, userType: string) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Basic validation
    if (!formData.facultyId || !formData.password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    // Validate faculty ID is numeric only for Faculty tab
    if (currentTab === 'faculty' && !/^\d+$/.test(formData.facultyId)) {
      setError('Faculty ID must contain only numbers');
      setIsLoading(false);
      return;
    }
    
    try {
      console.log('🔐 LoginForm: Attempting login with facultyId:', formData.facultyId);
      const result = await login(formData.facultyId, formData.password);
      
      console.log('📥 LoginForm: Login result:', result);
      
      if (result.success) {
        console.log('✅ LoginForm: Login successful, AuthContext will handle navigation');
        // Navigation is now handled by App.tsx useEffect based on user state
      } else {
        console.log('❌ LoginForm: Login failed:', result.error);
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl text-teal-800">Welcome to GITAM</CardTitle>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-teal-50 p-1 rounded-lg">
            <TabsTrigger 
              value="faculty" 
              className="text-sm rounded-md data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm text-teal-600"
            >
              Faculty
            </TabsTrigger>
            <TabsTrigger 
              value="admin" 
              className="text-sm rounded-md data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm text-teal-600"
            >
              Admin
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="faculty">
            <form onSubmit={(e) => handleSubmit(e, 'faculty')} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="faculty-id" className="text-teal-700">Faculty ID</Label>
                <Input
                  id="faculty-id"
                  name="facultyId"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter your Faculty ID (numbers only)"
                  value={formData.facultyId}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="bg-teal-50/80 border-teal-200 focus:border-teal-400 focus:ring-teal-200 rounded-lg h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faculty-password" className="text-teal-700">Password</Label>
                <div className="relative">
                  <Input
                    id="faculty-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className="bg-teal-50/80 border-teal-200 focus:border-teal-400 focus:ring-teal-200 rounded-lg h-11 pr-12"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-teal-600 hover:text-teal-700 transition-colors disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg h-11 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In as Faculty'
                )}
              </Button>
              <div className="text-center space-y-2">
                <button type="button" onClick={() => { setForgotId(formData.facultyId); setForgotSubmitted(false); setShowForgotModal(true); }} className="text-sm text-teal-600 hover:text-teal-700 hover:underline transition-colors block w-full">
                  Forgot your password?
                </button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="admin">
            <form onSubmit={(e) => handleSubmit(e, 'admin')} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="admin-id" className="text-teal-700">Admin ID</Label>
                <Input
                  id="admin-id"
                  name="facultyId"
                  type="text"
                  placeholder="Enter your Admin ID (e.g., admin)"
                  value={formData.facultyId}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="bg-teal-50/80 border-teal-200 focus:border-teal-400 focus:ring-teal-200 rounded-lg h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-teal-700">Password</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className="bg-teal-50/80 border-teal-200 focus:border-teal-400 focus:ring-teal-200 rounded-lg h-11 pr-12"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-teal-600 hover:text-teal-700 transition-colors disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg h-11 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In as Admin'
                )}
              </Button>
              <div className="text-center">
                <button type="button" onClick={() => { setForgotId(formData.facultyId); setForgotSubmitted(false); setShowForgotModal(true); }} className="text-sm text-teal-600 hover:text-teal-700 hover:underline transition-colors">
                  Forgot your password?
                </button>
              </div>
            </form>
          </TabsContent>
        </Tabs>

        {/* Sign Up Button */}
        <div className="mt-6 pt-6 border-t border-teal-100">
          <div className="text-center">
            <p className="text-sm text-teal-600 mb-3">
              Don't have an account?
            </p>
            <Button
              onClick={onSwitchToSignUp}
              variant="outline"
              className="w-full border-teal-300 text-teal-700 hover:bg-teal-50 hover:text-teal-800 rounded-lg h-11 transition-colors"
            >
              Sign Up
            </Button>
          </div>
        </div>


      </CardContent>
      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForgotModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            {!forgotSubmitted ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Reset Password</h3>
                <p className="text-sm text-gray-500 mb-4">Enter your Faculty ID and we'll send a reset request to IT support.</p>
                <label className="block text-sm font-medium text-gray-700 mb-1">Faculty ID</label>
                <input
                  type="text"
                  value={forgotId}
                  onChange={e => setForgotId(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                  placeholder="Enter your Faculty ID"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 mb-4"
                />
                <div className="flex gap-3">
                  <button onClick={() => setShowForgotModal(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={() => { if (forgotId.trim()) setForgotSubmitted(true); }}
                    disabled={!forgotId.trim()}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm transition-colors"
                  >
                    Submit
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Received</h3>
                  <p className="text-sm text-gray-600 mb-1">Please contact IT Support to reset your password:</p>
                  <p className="text-sm font-medium text-teal-700 mb-1">support@gitam.edu</p>
                  <p className="text-sm text-gray-500 mb-1">Phone: +91-863-2344700</p>
                  <p className="text-xs text-gray-400 mt-3">Mention your Faculty ID: <span className="font-medium text-gray-600">{forgotId}</span></p>
                </div>
                <button onClick={() => setShowForgotModal(false)} className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2 text-sm transition-colors">
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}