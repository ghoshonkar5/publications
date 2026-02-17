import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { X, Plus, Minus, Loader2, CheckCircle, Upload, File, AlertTriangle } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Alert, AlertDescription } from './ui/alert';

interface AddPublicationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (publicationData: any) => Promise<void>;
  initialData?: any; // Optional initial data for editing
}

interface PublicationFormData {
  title: string;
  journal: string;
  quartile: string;
  impactFactor: string;
  citeScore: string;
  authors: string[];
  indexing: string;
  areaOfPaper: string;
  positionOfAuthor: string;
  volume: string;
  issue: string;
  startPage: string;
  lastPage: string;
  monthYear: string;
  academicYear: string;
  doi: string;
  link: string;
  fileData?: string;
  fileName?: string;
  fileType?: string;
}

export function AddPublicationForm({ isOpen, onClose, onSubmit, initialData }: AddPublicationFormProps) {
  const { user } = useAuth();
  const isEditMode = !!initialData;
  
  const getInitialFormData = (): PublicationFormData => {
    if (initialData) {
      return {
        title: initialData.title || '',
        journal: initialData.journal || '',
        quartile: initialData.quartile || '',
        impactFactor: initialData.impactFactor || '',
        citeScore: initialData.citeScore || '',
        authors: initialData.authors || [''],
        indexing: initialData.indexing || '',
        areaOfPaper: initialData.areaOfPaper || '',
        positionOfAuthor: initialData.positionOfAuthor || '',
        volume: initialData.volume || '',
        issue: initialData.issue || '',
        startPage: initialData.startPage || '',
        lastPage: initialData.lastPage || '',
        monthYear: initialData.monthYear || '',
        academicYear: initialData.academicYear || '',
        doi: initialData.doi || '',
        link: initialData.link || '',
        fileData: initialData.fileData,
        fileName: initialData.fileName,
        fileType: initialData.fileType
      };
    }
    return {
      title: '',
      journal: '',
      quartile: '',
      impactFactor: '',
      citeScore: '',
      authors: [''],
      indexing: '',
      areaOfPaper: '',
      positionOfAuthor: '',
      volume: '',
      issue: '',
      startPage: '',
      lastPage: '',
      monthYear: '',
      academicYear: '',
      doi: '',
      link: ''
    };
  };

  const [formData, setFormData] = useState<PublicationFormData>(getInitialFormData());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showVerificationWarning, setShowVerificationWarning] = useState(false);

  const resetForm = () => {
    setFormData({
      title: '',
      journal: '',
      quartile: '',
      impactFactor: '',
      citeScore: '',
      authors: [''],
      indexing: '',
      areaOfPaper: '',
      positionOfAuthor: '',
      volume: '',
      issue: '',
      startPage: '',
      lastPage: '',
      monthYear: '',
      academicYear: '',
      doi: '',
      link: ''
    });
    setErrors({});
    setSuccess(false);
    setSelectedFile(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleInputChange = (field: keyof PublicationFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const addAuthor = () => {
    setFormData(prev => ({
      ...prev,
      authors: [...prev.authors, '']
    }));
  };

  const removeAuthor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      authors: prev.authors.filter((_, i) => i !== index)
    }));
  };

  const updateAuthor = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      authors: prev.authors.map((author, i) => i === index ? value : author)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.journal.trim()) newErrors.journal = 'Journal is required';
    if (!formData.quartile) newErrors.quartile = 'Quartile is required';
    if (!formData.monthYear.trim()) newErrors.monthYear = 'Date is required';
    if (!formData.academicYear.trim()) newErrors.academicYear = 'Academic Year is required';
    if (!formData.doi.trim()) newErrors.doi = 'DOI is required';
    if (!formData.link.trim()) newErrors.link = 'Publication Link is required';
    
    // Check if at least one author is provided
    const validAuthors = formData.authors.filter(author => author.trim() !== '');
    if (validAuthors.length === 0) {
      newErrors.authors = 'At least one author is required';
    }

    // Validate DOI format if provided
    if (formData.doi && !formData.doi.includes('/')) {
      newErrors.doi = 'Please enter a valid DOI (e.g., 10.1234/example)';
    }

    // Validate URL format if provided
    if (formData.link && !formData.link.startsWith('http')) {
      newErrors.link = 'Please enter a valid URL starting with http:// or https://';
    }

    // Check if faculty is in authors list
    if (user?.name) {
      const facultyName = user.name;
      const isAuthor = validAuthors.some(author => 
        author.toLowerCase().includes(facultyName.toLowerCase()) ||
        facultyName.toLowerCase().includes(author.toLowerCase())
      );
      
      if (!isAuthor) {
        setShowVerificationWarning(true);
      } else {
        setShowVerificationWarning(false);
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ ...errors, file: 'File size must be less than 10MB' });
        return;
      }
      setSelectedFile(file);
      setErrors({ ...errors, file: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Clean up authors array
      const cleanedData = {
        ...formData,
        authors: formData.authors.filter(author => author.trim() !== ''),
      };

      // Convert file to base64 if present
      if (selectedFile) {
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onload = () => {
            cleanedData.fileData = reader.result as string;
            cleanedData.fileName = selectedFile.name;
            cleanedData.fileType = selectedFile.type;
            resolve(null);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
      }

      await onSubmit(cleanedData);
      setSuccess(true);
      
      // Close modal after success
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to add publication:', error);
      setErrors({ submit: 'Failed to add publication. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Publication Added Successfully!</h3>
            <p className="text-gray-600">Your publication has been added to your portfolio.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-teal-700">Add New Publication</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Verification Warning */}
          {showVerificationWarning && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Warning:</strong> Your name ({user?.name}) does not appear in the authors list. 
                Please verify that this publication was authored by you. If you are a co-author, 
                ensure your name is included in the authors list.
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Textarea
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter the publication title"
                  className="mt-1"
                  rows={2}
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>

              <div>
                <Label htmlFor="journal">Journal *</Label>
                <Input
                  id="journal"
                  value={formData.journal}
                  onChange={(e) => handleInputChange('journal', e.target.value)}
                  placeholder="Enter journal name"
                  className="mt-1"
                />
                {errors.journal && <p className="text-red-500 text-sm mt-1">{errors.journal}</p>}
              </div>

              <div>
                <Label htmlFor="quartile">Quartile *</Label>
                <Select value={formData.quartile} onValueChange={(value) => handleInputChange('quartile', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select quartile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1</SelectItem>
                    <SelectItem value="Q2">Q2</SelectItem>
                    <SelectItem value="Q3">Q3</SelectItem>
                    <SelectItem value="Q4">Q4</SelectItem>
                  </SelectContent>
                </Select>
                {errors.quartile && <p className="text-red-500 text-sm mt-1">{errors.quartile}</p>}
              </div>

              <div>
                <Label htmlFor="impactFactor">Impact Factor</Label>
                <Input
                  id="impactFactor"
                  value={formData.impactFactor}
                  onChange={(e) => handleInputChange('impactFactor', e.target.value)}
                  placeholder="e.g., 3.45"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="citeScore">CiteScore</Label>
                <Input
                  id="citeScore"
                  value={formData.citeScore}
                  onChange={(e) => handleInputChange('citeScore', e.target.value)}
                  placeholder="e.g., 4.2"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Authors */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Authors</h3>
            {formData.authors.map((author, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1">
                  <Input
                    value={author}
                    onChange={(e) => updateAuthor(index, e.target.value)}
                    placeholder={`Author ${index + 1} name`}
                  />
                </div>
                {formData.authors.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeAuthor(index)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                )}
                {index === formData.authors.length - 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAuthor}
                    className="text-teal-600 border-teal-300 hover:bg-teal-50"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {errors.authors && <p className="text-red-500 text-sm">{errors.authors}</p>}
          </div>

          {/* Publication Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Publication Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="volume">Volume</Label>
                <Input
                  id="volume"
                  value={formData.volume}
                  onChange={(e) => handleInputChange('volume', e.target.value)}
                  placeholder="e.g., 25"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="issue">Issue</Label>
                <Input
                  id="issue"
                  value={formData.issue}
                  onChange={(e) => handleInputChange('issue', e.target.value)}
                  placeholder="e.g., 3"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="positionOfAuthor">Your Position</Label>
                <Select value={formData.positionOfAuthor} onValueChange={(value) => handleInputChange('positionOfAuthor', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select your position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Corresponding Author">Corresponding Author</SelectItem>
                    <SelectItem value="Position 1">Position 1</SelectItem>
                    <SelectItem value="Position 2">Position 2</SelectItem>
                    <SelectItem value="Position 3">Position 3</SelectItem>
                    <SelectItem value="Position 4">Position 4</SelectItem>
                    <SelectItem value="Position 5">Position 5</SelectItem>
                    <SelectItem value="Position 6">Position 6</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startPage">Start Page</Label>
                <Input
                  id="startPage"
                  value={formData.startPage}
                  onChange={(e) => handleInputChange('startPage', e.target.value)}
                  placeholder="e.g., 123"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="lastPage">End Page</Label>
                <Input
                  id="lastPage"
                  value={formData.lastPage}
                  onChange={(e) => handleInputChange('lastPage', e.target.value)}
                  placeholder="e.g., 135"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="monthYear">Date *</Label>
                <Input
                  id="monthYear"
                  value={formData.monthYear}
                  onChange={(e) => handleInputChange('monthYear', e.target.value)}
                  placeholder="e.g., March 2024"
                  className="mt-1"
                />
                {errors.monthYear && <p className="text-red-500 text-sm mt-1">{errors.monthYear}</p>}
              </div>

              <div>
                <Label htmlFor="academicYear">Academic Year *</Label>
                <Input
                  id="academicYear"
                  value={formData.academicYear}
                  onChange={(e) => handleInputChange('academicYear', e.target.value)}
                  placeholder="e.g., 2023-24"
                  className="mt-1"
                />
                {errors.academicYear && <p className="text-red-500 text-sm mt-1">{errors.academicYear}</p>}
              </div>

              <div>
                <Label htmlFor="indexing">Indexing</Label>
                <Select value={formData.indexing} onValueChange={(value) => handleInputChange('indexing', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select indexing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Scopus">Scopus</SelectItem>
                    <SelectItem value="Google Scholar">Google Scholar</SelectItem>
                    <SelectItem value="Web of Science">Web of Science</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="areaOfPaper">Area of Paper</Label>
                <Input
                  id="areaOfPaper"
                  value={formData.areaOfPaper}
                  onChange={(e) => handleInputChange('areaOfPaper', e.target.value)}
                  placeholder="e.g., Machine Learning"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Links & Identifiers</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="doi">DOI *</Label>
                <Input
                  id="doi"
                  value={formData.doi}
                  onChange={(e) => handleInputChange('doi', e.target.value)}
                  placeholder="e.g., 10.1234/example"
                  className="mt-1"
                />
                {errors.doi && <p className="text-red-500 text-sm mt-1">{errors.doi}</p>}
              </div>

              <div>
                <Label htmlFor="link">Publication Link *</Label>
                <Input
                  id="link"
                  value={formData.link}
                  onChange={(e) => handleInputChange('link', e.target.value)}
                  placeholder="https://example.com/paper"
                  className="mt-1"
                />
                {errors.link && <p className="text-red-500 text-sm mt-1">{errors.link}</p>}
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Upload Document (Optional)</h3>
            <div>
              <Label htmlFor="file">Upload Publication Copy</Label>
              <div className="mt-2">
                <label htmlFor="file" className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-teal-500 hover:bg-teal-50/50 transition-colors">
                  <div className="text-center">
                    {selectedFile ? (
                      <div className="flex items-center space-x-2 text-teal-600">
                        <File className="w-6 h-6" />
                        <span className="text-sm">{selectedFile.name}</span>
                        <span className="text-xs text-gray-500">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">Click to upload PDF, DOCX, or image</span>
                        <span className="text-xs text-gray-400 mt-1">Maximum file size: 10MB</span>
                      </div>
                    )}
                  </div>
                  <input
                    id="file"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileChange}
                  />
                </label>
                {selectedFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove File
                  </Button>
                )}
                {errors.file && <p className="text-red-500 text-sm mt-1">{errors.file}</p>}
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                isEditMode ? 'Update Publication' : 'Add Publication'
              )}
            </Button>
          </div>

          {errors.submit && (
            <div className="text-red-500 text-sm text-center mt-2">{errors.submit}</div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}