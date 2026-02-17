import { useState } from 'react';
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
  const [formData, setFormData] = useState({
    facultyId: '',
    password: '',
    userType: 'faculty'
  });
  const [currentTab, setCurrentTab] = useState('faculty');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    // Clear form data and errors when switching tabs
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
                <a href="#" className="text-sm text-teal-600 hover:text-teal-700 hover:underline transition-colors block">
                  Forgot your password?
                </a>
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
                <a href="#" className="text-sm text-teal-600 hover:text-teal-700 hover:underline transition-colors">
                  Forgot your password?
                </a>
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
    </Card>
  );
}