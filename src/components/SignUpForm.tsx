import { useState } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "./AuthContext";

const DEPARTMENTS = [
  'Computer Science and Engineering',
  'Electronics and Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Information Technology',
  'Chemical Engineering',
  'Biotechnology',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Management Studies',
  'Other',
];

const DESIGNATIONS = [
  'Assistant Professor',
  'Associate Professor',
  'Professor',
  'Senior Professor',
  'Professor Emeritus',
  'Visiting Faculty',
  'Adjunct Faculty',
];

interface FormData {
  fullName: string;
  userId: string;
  mobile: string;
  email: string;
  department: string;
  designation: string;
  researchArea: string;
  password: string;
  confirmPassword: string;
}

interface ValidationErrors {
  fullName?: string;
  userId?: string;
  mobile?: string;
  email?: string;
  department?: string;
  designation?: string;
  password?: string;
  confirmPassword?: string;
}

interface SignUpFormProps {
  onSwitchToLogin: () => void;
}

const inputClass = "bg-teal-50/80 border-teal-200 focus:border-teal-400 focus:ring-teal-200 rounded-lg h-11";
const selectClass = "w-full bg-teal-50/80 border border-teal-200 focus:border-teal-400 rounded-lg h-11 px-3 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-200";

export function SignUpForm({ onSwitchToLogin }: SignUpFormProps) {
  const { signup } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    userId: '',
    mobile: '',
    email: '',
    department: '',
    designation: '',
    researchArea: '',
    password: '',
    confirmPassword: '',
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
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Only letters, numbers, and underscores allowed';
        return undefined;
      case 'mobile':
        return !/^(\+91|91)?[6-9]\d{9}$/.test(value.replace(/\s/g, ''))
          ? 'Enter a valid 10-digit Indian mobile number' : undefined;
      case 'email':
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Enter a valid email address' : undefined;
      case 'department':
        return !value ? 'Please select a department' : undefined;
      case 'designation':
        return !value ? 'Please select a designation' : undefined;
      case 'password':
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) return 'Must contain both letters and numbers';
        return undefined;
      case 'confirmPassword':
        return value !== formData.password ? 'Passwords do not match' : undefined;
      default:
        return undefined;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof FormData;
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    const error = validateField(fieldName, value);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
    if (fieldName === 'password' && formData.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: value !== formData.confirmPassword ? 'Passwords do not match' : undefined }));
    }
  };

  const isFormValid = (): boolean => {
    const requiredFields: (keyof FormData)[] = ['fullName', 'userId', 'mobile', 'email', 'department', 'designation', 'password', 'confirmPassword'];
    const hasEmpty = requiredFields.some(f => !formData[f].trim());
    const hasErrors = Object.values(errors).some(e => e !== undefined);
    return !hasEmpty && !hasErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    setIsLoading(true);
    setSuccessMessage('');
    try {
      const result = await signup({
        facultyId: formData.userId,
        password: formData.password,
        name: formData.fullName,
        email: formData.email,
        department: formData.department,
        designation: formData.designation,
        mobile: formData.mobile,
        researchArea: formData.researchArea,
      });
      if (result.success) {
        setSuccessMessage('Account created! You can now sign in.');
        setFormData({ fullName: '', userId: '', mobile: '', email: '', department: '', designation: '', researchArea: '', password: '', confirmPassword: '' });
        setErrors({});
      } else {
        setErrors({ email: result.error || 'Signup failed' });
      }
    } catch (error) {
      setErrors({ email: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl text-teal-800">Create Account</CardTitle>
        <CardDescription className="text-teal-600">Join the GITAM community</CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />{successMessage}
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-teal-700">Full Name</Label>
            <Input id="fullName" name="fullName" type="text" placeholder="Enter your full name"
              value={formData.fullName} onChange={handleInputChange} required className={inputClass} />
            {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName}</p>}
          </div>

          {/* Faculty ID */}
          <div className="space-y-2">
            <Label htmlFor="userId" className="text-teal-700">Faculty ID</Label>
            <Input id="userId" name="userId" type="text" placeholder="Enter Faculty ID"
              value={formData.userId} onChange={handleInputChange} required className={inputClass} />
            {errors.userId && <p className="text-red-500 text-xs">{errors.userId}</p>}
          </div>

          {/* Department + Designation side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-teal-700">Department</Label>
              <select name="department" value={formData.department} onChange={handleInputChange} required className={selectClass}>
                <option value="">Select dept.</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.department && <p className="text-red-500 text-xs">{errors.department}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-teal-700">Designation</Label>
              <select name="designation" value={formData.designation} onChange={handleInputChange} required className={selectClass}>
                <option value="">Select role</option>
                {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.designation && <p className="text-red-500 text-xs">{errors.designation}</p>}
            </div>
          </div>

          {/* Research Area */}
          <div className="space-y-2">
            <Label htmlFor="researchArea" className="text-teal-700">Research Area <span className="text-gray-400 text-xs font-normal">(optional)</span></Label>
            <Input id="researchArea" name="researchArea" type="text"
              placeholder="e.g. AI, Machine Learning, Cloud Computing"
              value={formData.researchArea} onChange={handleInputChange} className={inputClass} />
          </div>

          {/* Mobile */}
          <div className="space-y-2">
            <Label htmlFor="mobile" className="text-teal-700">Mobile Number</Label>
            <Input id="mobile" name="mobile" type="tel" placeholder="Enter your 10-digit mobile number"
              value={formData.mobile} onChange={handleInputChange} required className={inputClass} />
            {errors.mobile && <p className="text-red-500 text-xs">{errors.mobile}</p>}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-teal-700">Email Address</Label>
            <Input id="email" name="email" type="email" placeholder="Enter your email address"
              value={formData.email} onChange={handleInputChange} required className={inputClass} />
            {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-teal-700">Create Password</Label>
            <div className="relative">
              <Input id="password" name="password" type={showPassword ? "text" : "password"}
                placeholder="Create password" value={formData.password} onChange={handleInputChange}
                required className={`${inputClass} pr-12`} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-600 hover:text-teal-700">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-teal-700">Confirm Password</Label>
            <div className="relative">
              <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter password" value={formData.confirmPassword} onChange={handleInputChange}
                required className={`${inputClass} pr-12`} />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-600 hover:text-teal-700">
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword}</p>}
          </div>

          {/* Submit */}
          <Button type="submit" disabled={!isFormValid() || isLoading}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white rounded-lg h-11 mt-2">
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Account...</> : 'Sign Up'}
          </Button>

          <p className="text-center text-sm text-teal-600">
            By signing up, you agree to our{' '}
            <a href="#" className="text-teal-700 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-teal-700 hover:underline">Privacy Policy</a>.
          </p>

          <p className="text-center text-sm text-teal-600">
            Already have an account?{' '}
            <button type="button" onClick={onSwitchToLogin} className="text-teal-700 hover:underline font-medium">
              Login here
            </button>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}