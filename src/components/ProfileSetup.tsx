import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { GitamLogo } from "./GitamLogo";
import { Database, Search, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { useAuth } from "./AuthContext";
import { api } from "../utils/api";

interface ScholarIds {
  googleScholarId: string;
  scopusId: string;
  orcidId: string;
  researcherId: string;
}

export function ProfileSetup() {
  const { updateProfile, user } = useAuth();
  const [scholarIds, setScholarIds] = useState<ScholarIds>({
    googleScholarId: '',
    scopusId: '',
    orcidId: '',
    researcherId: ''
  });
  
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResults, setValidationResults] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'validating' | 'fetching'>('input');

  const handleInputChange = (field: keyof ScholarIds, value: string) => {
    setScholarIds(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear validation result when user changes input
    if (validationResults[field] !== undefined) {
      setValidationResults(prev => {
        const newResults = { ...prev };
        delete newResults[field];
        return newResults;
      });
    }
  };

  const validateIds = async () => {
    setIsValidating(true);
    setError(null);
    
    try {
      // Filter out empty IDs
      const filteredIds = Object.fromEntries(
        Object.entries(scholarIds).filter(([_, value]) => value.trim() !== '')
      );
      
      const response = await api.validateScholarIds(filteredIds);
      
      if (response.success && response.data) {
        setValidationResults(response.data);
      } else {
        setError(response.error || 'Failed to validate IDs');
      }
      
    } catch (error) {
      console.error('Validation failed:', error);
      setError('Failed to validate some IDs. Please check and try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const saveProfileAndFetchData = async () => {
    setIsSaving(true);
    setStep('fetching');
    setError(null);
    
    try {
      console.log('Saving profile and initiating data fetch...');
      
      if (!user?.accessToken) {
        throw new Error('No access token available');
      }
      
      // Filter out empty IDs
      const filteredIds = Object.fromEntries(
        Object.entries(scholarIds).filter(([_, value]) => value.trim() !== '')
      );
      
      // Setup profile through API
      const response = await api.setupProfile(filteredIds, user.accessToken);
      
      if (!response.success) {
        throw new Error(response.error || 'Profile setup failed');
      }
      
      // Update local user state
      const profileUpdate = {
        ...filteredIds,
        isFirstTimeLogin: false
      };
      
      const result = await updateProfile(profileUpdate);
      
      if (!result.success) {
        throw new Error(result.error || 'Profile update failed');
      }
      
      // Profile is now complete - App.tsx useEffect will handle navigation
      console.log('✅ Profile setup complete, navigation will be handled by App.tsx');
      
    } catch (error) {
      console.error('Failed to save profile:', error);
      setError('Failed to save profile and fetch data. Please try again.');
      setStep('input');
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = () => {
    const hasValidIds = Object.values(validationResults).some(isValid => isValid);
    const hasAtLeastOneId = Object.values(scholarIds).some(id => id.trim() !== '');
    return hasValidIds && hasAtLeastOneId;
  };

  if (step === 'fetching') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl border-0 rounded-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-teal-600 to-teal-700 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-white animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Setting Up Your Profile</h3>
            <p className="text-gray-600 mb-6">
              We're fetching your academic data from verified sources. This may take a few minutes.
            </p>
            <div className="space-y-3 text-sm text-gray-500">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-teal-600 rounded-full animate-pulse"></div>
                <span>Fetching publications from Scopus</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-teal-600 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <span>Loading Google Scholar data</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-teal-600 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                <span>Processing Web of Science records</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-teal-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16">
            <div className="flex items-center space-x-4">
              <GitamLogo className="w-8 h-8" />
              <div>
                <h1 className="text-lg font-semibold text-teal-800">Academic Profile Setup</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold text-gray-900 mb-4">Welcome to GITAM Research Portal</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            To get started, please provide your academic profile IDs. We'll automatically fetch and sync your publications, 
            conferences, and research data from verified academic databases.
          </p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-teal-700">
              <Database className="w-6 h-6" />
              <span>Academic Profile IDs</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Google Scholar ID */}
              <div className="space-y-2">
                <Label htmlFor="googleScholar" className="text-sm font-medium text-gray-700">
                  Google Scholar ID
                </Label>
                <div className="relative">
                  <Input
                    id="googleScholar"
                    placeholder="e.g., A1B2C3D4E5F"
                    value={scholarIds.googleScholarId}
                    onChange={(e) => handleInputChange('googleScholarId', e.target.value)}
                    className="pr-10"
                  />
                  {validationResults.googleScholarId === true && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
                  )}
                  {validationResults.googleScholarId === false && (
                    <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Find your ID in your Google Scholar profile URL
                </p>
              </div>

              {/* Scopus ID */}
              <div className="space-y-2">
                <Label htmlFor="scopus" className="text-sm font-medium text-gray-700">
                  Scopus Author ID
                </Label>
                <div className="relative">
                  <Input
                    id="scopus"
                    placeholder="e.g., 12345678900"
                    value={scholarIds.scopusId}
                    onChange={(e) => handleInputChange('scopusId', e.target.value)}
                    className="pr-10"
                  />
                  {validationResults.scopusId === true && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
                  )}
                  {validationResults.scopusId === false && (
                    <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Your unique Scopus Author ID (11 digits)
                </p>
              </div>

              {/* ORCID ID */}
              <div className="space-y-2">
                <Label htmlFor="orcid" className="text-sm font-medium text-gray-700">
                  ORCID iD (Optional)
                </Label>
                <div className="relative">
                  <Input
                    id="orcid"
                    placeholder="e.g., 0000-0000-0000-0000"
                    value={scholarIds.orcidId}
                    onChange={(e) => handleInputChange('orcidId', e.target.value)}
                    className="pr-10"
                  />
                  {validationResults.orcidId === true && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
                  )}
                  {validationResults.orcidId === false && (
                    <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Your 16-digit ORCID identifier
                </p>
              </div>

              {/* ResearcherID */}
              <div className="space-y-2">
                <Label htmlFor="researcherId" className="text-sm font-medium text-gray-700">
                  ResearcherID (Optional)
                </Label>
                <div className="relative">
                  <Input
                    id="researcherId"
                    placeholder="e.g., A-1234-2023"
                    value={scholarIds.researcherId}
                    onChange={(e) => handleInputChange('researcherId', e.target.value)}
                    className="pr-10"
                  />
                  {validationResults.researcherId === true && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
                  )}
                  {validationResults.researcherId === false && (
                    <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Your Web of Science ResearcherID
                </p>
              </div>
            </div>

            <div className="flex justify-center space-x-4 pt-6">
              <Button
                onClick={validateIds}
                disabled={isValidating || !Object.values(scholarIds).some(id => id.trim() !== '')}
                variant="outline"
                className="border-teal-300 text-teal-700 hover:bg-teal-50"
              >
                <Search className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
                {isValidating ? 'Validating...' : 'Validate IDs'}
              </Button>
              
              <Button
                onClick={saveProfileAndFetchData}
                disabled={!canProceed() || isSaving}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Database className={`w-4 h-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
                {isSaving ? 'Setting up...' : 'Setup Profile & Fetch Data'}
              </Button>
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• We'll fetch your publications from Scopus, Google Scholar, and Web of Science</li>
                <li>• Your conference presentations and proceedings will be imported</li>
                <li>• Books and book chapters will be collected from publisher databases</li>
                <li>• All data will be automatically updated weekly</li>
                <li>• You can review and edit the imported data anytime</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}