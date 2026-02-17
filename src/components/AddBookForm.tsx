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

interface AddBookFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bookData: any) => Promise<void>;
}

interface BookFormData {
  title: string;
  type: string;
  authors: string[];
  editors: string[];
  publisher: string;
  isbn: string;
  doi: string;
  publicationDate: string;
  academicYear: string;
  pages: string;
  chapterTitle: string;
  chapterPages: string;
  edition: string;
  volume: string;
  series: string;
  language: string;
  country: string;
  indexing: string;
  subject: string;
  positionOfAuthor: string;
  abstract: string;
  keywords: string;
  link: string;
  fileData?: string;
  fileName?: string;
  fileType?: string;
}

export function AddBookForm({ isOpen, onClose, onSubmit }: AddBookFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<BookFormData>({
    title: '',
    type: '',
    authors: [''],
    editors: [],
    publisher: '',
    isbn: '',
    doi: '',
    publicationDate: '',
    academicYear: '',
    pages: '',
    chapterTitle: '',
    chapterPages: '',
    edition: '',
    volume: '',
    series: '',
    language: 'English',
    country: '',
    indexing: '',
    subject: '',
    positionOfAuthor: '',
    abstract: '',
    keywords: '',
    link: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showVerificationWarning, setShowVerificationWarning] = useState(false);

  const resetForm = () => {
    setFormData({
      title: '',
      type: '',
      authors: [''],
      editors: [],
      publisher: '',
      isbn: '',
      doi: '',
      publicationDate: '',
      academicYear: '',
      pages: '',
      chapterTitle: '',
      chapterPages: '',
      edition: '',
      volume: '',
      series: '',
      language: 'English',
      country: '',
      indexing: '',
      subject: '',
      positionOfAuthor: '',
      abstract: '',
      keywords: '',
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

  const handleInputChange = (field: keyof BookFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

  const addEditor = () => {
    setFormData(prev => ({
      ...prev,
      editors: [...prev.editors, '']
    }));
  };

  const removeEditor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      editors: prev.editors.filter((_, i) => i !== index)
    }));
  };

  const updateEditor = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      editors: prev.editors.map((editor, i) => i === index ? value : editor)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.type) newErrors.type = 'Type is required';
    if (!formData.publisher.trim()) newErrors.publisher = 'Publisher is required';
    if (!formData.publicationDate.trim()) newErrors.publicationDate = 'Publication date is required';
    if (!formData.academicYear.trim()) newErrors.academicYear = 'Academic year is required';
    
    const validAuthors = formData.authors.filter(author => author.trim() !== '');
    if (validAuthors.length === 0) {
      newErrors.authors = 'At least one author is required';
    }

    if (formData.isbn && !/^[\d-xX]+$/.test(formData.isbn.replace(/[-\s]/g, ''))) {
      newErrors.isbn = 'Please enter a valid ISBN';
    }

    if (formData.doi && !formData.doi.includes('/')) {
      newErrors.doi = 'Please enter a valid DOI';
    }

    if (formData.link && !formData.link.startsWith('http')) {
      newErrors.link = 'Please enter a valid URL';
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
      const cleanedData = {
        ...formData,
        authors: formData.authors.filter(author => author.trim() !== ''),
        editors: formData.editors.filter(editor => editor.trim() !== ''),
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
      
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to add book:', error);
      setErrors({ submit: 'Failed to add book. Please try again.' });
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Book Added Successfully!</h3>
            <p className="text-gray-600">Your book/chapter has been added to your portfolio.</p>
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
            <span className="text-teal-700">Add New Book / Book Chapter</span>
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
                Please verify that this book/chapter was authored by you. If you are a co-author, 
                ensure your name is included in the authors list.
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Book">Book</SelectItem>
                    <SelectItem value="Book Chapter">Book Chapter</SelectItem>
                    <SelectItem value="Edited Book">Edited Book</SelectItem>
                    <SelectItem value="Conference Proceedings">Conference Proceedings</SelectItem>
                    <SelectItem value="Monograph">Monograph</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
              </div>

              <div>
                <Label htmlFor="language">Language</Label>
                <Select value={formData.language} onValueChange={(value) => handleInputChange('language', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Hindi">Hindi</SelectItem>
                    <SelectItem value="Telugu">Telugu</SelectItem>
                    <SelectItem value="Tamil">Tamil</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Textarea
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter the book/chapter title"
                className="mt-1"
                rows={2}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            {formData.type === 'Book Chapter' && (
              <div>
                <Label htmlFor="chapterTitle">Chapter Title</Label>
                <Input
                  id="chapterTitle"
                  value={formData.chapterTitle}
                  onChange={(e) => handleInputChange('chapterTitle', e.target.value)}
                  placeholder="Enter chapter title"
                  className="mt-1"
                />
              </div>
            )}
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

          {/* Editors (Optional) */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Editors (Optional)</h3>
            {formData.editors.map((editor, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1">
                  <Input
                    value={editor}
                    onChange={(e) => updateEditor(index, e.target.value)}
                    placeholder={`Editor ${index + 1} name`}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeEditor(index)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                {index === formData.editors.length - 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEditor}
                    className="text-teal-600 border-teal-300 hover:bg-teal-50"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {formData.editors.length === 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEditor}
                className="text-teal-600 border-teal-300 hover:bg-teal-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Editor
              </Button>
            )}
          </div>

          {/* Publication Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Publication Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="publisher">Publisher *</Label>
                <Input
                  id="publisher"
                  value={formData.publisher}
                  onChange={(e) => handleInputChange('publisher', e.target.value)}
                  placeholder="Enter publisher name"
                  className="mt-1"
                />
                {errors.publisher && <p className="text-red-500 text-sm mt-1">{errors.publisher}</p>}
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder="Publication country"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="isbn">ISBN</Label>
                <Input
                  id="isbn"
                  value={formData.isbn}
                  onChange={(e) => handleInputChange('isbn', e.target.value)}
                  placeholder="e.g., 978-0-123456-78-9"
                  className="mt-1"
                />
                {errors.isbn && <p className="text-red-500 text-sm mt-1">{errors.isbn}</p>}
              </div>

              <div>
                <Label htmlFor="doi">DOI</Label>
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
                <Label htmlFor="publicationDate">Publication Date *</Label>
                <Input
                  id="publicationDate"
                  type="date"
                  value={formData.publicationDate}
                  onChange={(e) => handleInputChange('publicationDate', e.target.value)}
                  className="mt-1"
                />
                {errors.publicationDate && <p className="text-red-500 text-sm mt-1">{errors.publicationDate}</p>}
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
                <Label htmlFor="pages">Total Pages</Label>
                <Input
                  id="pages"
                  value={formData.pages}
                  onChange={(e) => handleInputChange('pages', e.target.value)}
                  placeholder="e.g., 350"
                  className="mt-1"
                />
              </div>

              {formData.type === 'Book Chapter' && (
                <div>
                  <Label htmlFor="chapterPages">Chapter Pages</Label>
                  <Input
                    id="chapterPages"
                    value={formData.chapterPages}
                    onChange={(e) => handleInputChange('chapterPages', e.target.value)}
                    placeholder="e.g., 45-67"
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="edition">Edition</Label>
                <Input
                  id="edition"
                  value={formData.edition}
                  onChange={(e) => handleInputChange('edition', e.target.value)}
                  placeholder="e.g., 2nd Edition"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="volume">Volume</Label>
                <Input
                  id="volume"
                  value={formData.volume}
                  onChange={(e) => handleInputChange('volume', e.target.value)}
                  placeholder="e.g., Volume 1"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="series">Series</Label>
                <Input
                  id="series"
                  value={formData.series}
                  onChange={(e) => handleInputChange('series', e.target.value)}
                  placeholder="Book series name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="positionOfAuthor">Your Position</Label>
                <Input
                  id="positionOfAuthor"
                  value={formData.positionOfAuthor}
                  onChange={(e) => handleInputChange('positionOfAuthor', e.target.value)}
                  placeholder="e.g., First Author, Editor"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Additional Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subject">Subject Area</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="e.g., Computer Science"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="indexing">Indexing</Label>
                <Input
                  id="indexing"
                  value={formData.indexing}
                  onChange={(e) => handleInputChange('indexing', e.target.value)}
                  placeholder="e.g., Scopus, Google Books"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="keywords">Keywords</Label>
              <Input
                id="keywords"
                value={formData.keywords}
                onChange={(e) => handleInputChange('keywords', e.target.value)}
                placeholder="Enter keywords separated by commas"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="abstract">Abstract/Summary</Label>
              <Textarea
                id="abstract"
                value={formData.abstract}
                onChange={(e) => handleInputChange('abstract', e.target.value)}
                placeholder="Enter book/chapter abstract or summary (optional)"
                className="mt-1"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="link">Book/Publisher Link</Label>
              <Input
                id="link"
                value={formData.link}
                onChange={(e) => handleInputChange('link', e.target.value)}
                placeholder="https://example.com/book"
                className="mt-1"
              />
              {errors.link && <p className="text-red-500 text-sm mt-1">{errors.link}</p>}
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Upload Document (Optional)</h3>
            <div>
              <Label htmlFor="file">Upload Book/Chapter Copy</Label>
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
                  Adding...
                </>
              ) : (
                'Add Book/Chapter'
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