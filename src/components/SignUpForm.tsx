import { useState } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "./AuthContext";

interface FormData {
  fullName: string;
  userId: string;
  mobile: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface ValidationErrors {
  fullName?: string;
  userId?: string;
  mobile?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface SignUpFormProps {
  onSwitchToLogin: () => void;
}

export function SignUpForm({ onSwitchToLogin }: SignUpFormProps) {
  const { signup } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    userId: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validateField = (name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case 'fullName':
        return value.trim().length < 2 ? 'Full name must be at least 2 characters' : undefined;
      
      case 'userId':
        if (value.length < 3) return 'Faculty ID must be at least 3 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Faculty ID can only contain letters, numbers, and underscores';
        return undefined;
      
      case 'mobile':
        const mobileRegex = /^(\+91|91)?[6-9]\d{9}$/;
        if (!mobileRegex.test(value.replace(/\s/g, ''))) {
          return 'Please enter a valid 10-digit Indian mobile number';
        }
        return undefined;
      
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value) ? 'Please enter a valid email address' : undefined;
      
      case 'password':
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
          return 'Password must contain both letters and numbers';
        }
        return undefined;
      
      case 'confirmPassword':
        return value !== formData.password ? 'Passwords do not match' : undefined;
      
      default:
        return undefined;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof FormData;
    
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Real-time validation
    const error = validateField(fieldName, value);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
    
    // Also revalidate confirm password if password changes
    if (fieldName === 'password' && formData.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.confirmPassword);
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const isFormValid = (): boolean => {
    const hasErrors = Object.values(errors).some(error => error !== undefined);
    const hasEmptyFields = Object.values(formData).some(value => value.trim() === '');
    return !hasErrors && !hasEmptyFields;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    
    setIsLoading(true);
    setSuccessMessage('');
    
    try {
      const result = await signup(formData.email, formData.password, formData.fullName);
      
      if (result.success) {
        setSuccessMessage('Account created successfully! You can now sign in.');
        setFormData({
          fullName: '',
          userId: '',
          mobile: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        setErrors({});
      } else {
        setErrors({ email: result.error || 'Signup failed' });
      }
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ email: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl text-teal-800">Create Account</CardTitle>
        <CardDescription className="text-teal-600">
          Join the GITAM community
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              {successMessage}
            </div>
          )}
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-teal-700">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleInputChange}
              required
              className="bg-teal-50/80 border-teal-200 focus:border-teal-400 focus:ring-teal-200 rounded-lg h-11"
            />
            {errors.fullName && (
              <p className="text-red-500 text-sm">{errors.fullName}</p>
            )}
          </div>

          {/* Faculty ID */}
          <div className="space-y-2">
            <Label htmlFor="userId" className="text-teal-700">Faculty ID</Label>
            <Input
              id="userId"
              name="userId"
              type="text"
              placeholder="Enter Faculty ID"
              value={formData.userId}
              onChange={handleInputChange}
              required
              className="bg-teal-50/80 border-teal-200 focus:border-teal-400 focus:ring-teal-200 rounded-lg h-11"
            />
            {errors.userId && (
              <p className="text-red-500 text-sm">{errors.userId}</p>
            )}
          </div>

          {/* Mobile Number */}
          <div className="space-y-2">
            <Label htmlFor="mobile" className="text-teal-700">Mobile Number</Label>
            <Input
              id="mobile"
              name="mobile"
              type="tel"
              placeholder="Enter your 10-digit mobile number"
              value={formData.mobile}
              onChange={handleInputChange}
              required
              className="bg-teal-50/80 border-teal-200 focus:border-teal-400 focus:ring-teal-200 rounded-lg h-11"
            />
            {errors.mobile && (
              <p className="text-red-500 text-sm">{errors.mobile}</p>
            )}
          </div>

          {/* Email Address */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-teal-700">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="bg-teal-50/80 border-teal-200 focus:border-teal-400 focus:ring-teal-200 rounded-lg h-11"
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email}</p>
            )}
          </div>

          {/* Create Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-teal-700">Create Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="bg-teal-50/80 border-teal-200 focus:border-teal-400 focus:ring-teal-200 rounded-lg h-11 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-teal-600 hover:text-teal-700 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-teal-700">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                className="bg-teal-50/80 border-teal-200 focus:border-teal-400 focus:ring-teal-200 rounded-lg h-11 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-teal-600 hover:text-teal-700 transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={!isFormValid() || isLoading}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg h-11 transition-colors mt-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Sign Up'
            )}
          </Button>

          {/* Terms and Privacy */}
          <div className="text-center text-sm text-teal-600 mt-4">
            <p>
              By signing up, you agree to our{" "}
              <a href="#" className="text-teal-700 hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href="#" className="text-teal-700 hover:underline">Privacy Policy</a>.
            </p>
          </div>

          {/* Login Link */}
          <div className="text-center text-sm text-teal-600 mt-4">
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-teal-700 hover:underline font-medium cursor-pointer"
              >
                Login here
              </button>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}