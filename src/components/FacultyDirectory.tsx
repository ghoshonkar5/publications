import { useState } from 'react';
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  BookOpen, 
  Award, 
  Clock,
  Linkedin,
  Globe,
  GraduationCap,
  Briefcase,
  FileText,
  ChevronRight,
  Edit,
  Save,
  X
} from "lucide-react";

interface FacultyMember {
  id: string;
  name: string;
  employeeId: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  officeRoom: string;
  profilePhoto?: string;
  researchArea: string;
  coursesTaught: string[];
  yearsOfExperience: number;
  publicationsCount: number;
  publicationsLink?: string;
  officeHours: string;
  linkedIn?: string;
  website?: string;
  roles: string[];
}

// Initial faculty data
const initialFacultyData: FacultyMember = {
  id: "1",
  name: "Dr. Padmaja Madugula",
  employeeId: "1309",
  designation: "Assistant Professor",
  department: "Computer Science and Engineering",
  email: "pmadugul@gitam.edu",
  phone: "+91-9876543210",
  officeRoom: "CSE-Block, Room 301",
  researchArea: "Software Engineering, AI/ML, Cloud Computing",
  coursesTaught: ["Data Structures", "Machine Learning", "Software Engineering", "Cloud Computing"],
  yearsOfExperience: 8,
  publicationsCount: 24,
  officeHours: "Mon-Fri, 2:00 PM - 4:00 PM",
  linkedIn: "https://linkedin.com/in/padmaja-madugula",
  website: "https://pmadugula.gitam.edu",
  roles: ["Class Coordinator - CSE 3rd Year", "Research Lab Coordinator"]
};

export function FacultyDirectory() {
  const [facultyMembers, setFacultyMembers] = useState<FacultyMember[]>([initialFacultyData]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedDesignation, setSelectedDesignation] = useState('all');
  const [selectedResearchArea, setSelectedResearchArea] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyMember | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedFaculty, setEditedFaculty] = useState<FacultyMember | null>(null);
  const [coursesInput, setCoursesInput] = useState('');
  const [rolesInput, setRolesInput] = useState('');

  // Get unique departments and designations for filters
  const departments = Array.from(new Set(facultyMembers.map(f => f.department)));
  const designations = Array.from(new Set(facultyMembers.map(f => f.designation)));

  // Filter faculty members
  const filteredFaculty = facultyMembers.filter(faculty => {
    const matchesSearch = faculty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faculty.employeeId.includes(searchTerm) ||
                         faculty.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || faculty.department === selectedDepartment;
    const matchesDesignation = selectedDesignation === 'all' || faculty.designation === selectedDesignation;
    const matchesResearchArea = !selectedResearchArea || 
                                faculty.researchArea.toLowerCase().includes(selectedResearchArea.toLowerCase());
    
    return matchesSearch && matchesDepartment && matchesDesignation && matchesResearchArea;
  });

  const openFacultyDetails = (faculty: FacultyMember) => {
    setSelectedFaculty(faculty);
    setEditedFaculty({ ...faculty });
    setCoursesInput(faculty.coursesTaught.join(', '));
    setRolesInput(faculty.roles.join(', '));
    setIsEditMode(false);
    setIsDetailsOpen(true);
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    if (selectedFaculty) {
      setEditedFaculty({ ...selectedFaculty });
      setCoursesInput(selectedFaculty.coursesTaught.join(', '));
      setRolesInput(selectedFaculty.roles.join(', '));
    }
    setIsEditMode(false);
  };

  const handleSaveEdit = () => {
    if (!editedFaculty) return;

    const updatedFaculty = {
      ...editedFaculty,
      coursesTaught: coursesInput.split(',').map(c => c.trim()).filter(c => c),
      roles: rolesInput.split(',').map(r => r.trim()).filter(r => r),
    };

    setFacultyMembers(prev => 
      prev.map(f => f.id === updatedFaculty.id ? updatedFaculty : f)
    );
    setSelectedFaculty(updatedFaculty);
    setEditedFaculty(updatedFaculty);
    setIsEditMode(false);
  };

  const handleFieldChange = (field: keyof FacultyMember, value: any) => {
    if (!editedFaculty) return;
    setEditedFaculty({
      ...editedFaculty,
      [field]: value,
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-gray-800 mb-2">Faculty Directory</h1>
        <p className="text-gray-600">Browse and search faculty members across all departments</p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6 bg-white shadow-sm border-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Bar */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name, employee ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200"
              />
            </div>

            {/* Department Filter */}
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="bg-gray-50 border-gray-200">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Designation Filter */}
            <Select value={selectedDesignation} onValueChange={setSelectedDesignation}>
              <SelectTrigger className="bg-gray-50 border-gray-200">
                <SelectValue placeholder="All Designations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Designations</SelectItem>
                {designations.map(designation => (
                  <SelectItem key={designation} value={designation}>{designation}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Research Area Search */}
          <div className="mt-4">
            <Input
              type="text"
              placeholder="Filter by research area (e.g., AI, Machine Learning, Renewable Energy...)"
              value={selectedResearchArea}
              onChange={(e) => setSelectedResearchArea(e.target.value)}
              className="bg-gray-50 border-gray-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing <span className="font-semibold text-gray-800">{filteredFaculty.length}</span> of{' '}
        <span className="font-semibold text-gray-800">{facultyMembers.length}</span> faculty members
      </div>

      {/* Faculty Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFaculty.map(faculty => (
          <Card 
            key={faculty.id} 
            className="bg-white shadow-sm border-0 hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => openFacultyDetails(faculty)}
          >
            <CardContent className="p-6">
              {/* Profile Header */}
              <div className="flex items-start space-x-4 mb-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={faculty.profilePhoto} />
                  <AvatarFallback className="text-white" style={{ backgroundColor: "#006B64" }}>
                    {faculty.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-gray-800 truncate group-hover:text-teal-700 transition-colors">
                    {faculty.name}
                  </h3>
                  <p className="text-sm text-gray-600">{faculty.designation}</p>
                  <Badge variant="outline" className="mt-1 text-xs" style={{ borderColor: "#006B64", color: "#006B64" }}>
                    ID: {faculty.employeeId}
                  </Badge>
                </div>
              </div>

              {/* Department */}
              <div className="mb-3">
                <div className="flex items-center text-sm text-gray-600">
                  <GraduationCap className="w-4 h-4 mr-2" style={{ color: "#006B64" }} />
                  <span className="truncate">{faculty.department}</span>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2 flex-shrink-0" style={{ color: "#006B64" }} />
                  <span className="truncate">{faculty.email}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2 flex-shrink-0" style={{ color: "#006B64" }} />
                  <span>{faculty.phone}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2 flex-shrink-0" style={{ color: "#006B64" }} />
                  <span className="truncate">{faculty.officeRoom}</span>
                </div>
              </div>

              {/* Research Area */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Research Area</p>
                <p className="text-sm text-gray-700 line-clamp-2">{faculty.researchArea}</p>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-lg text-gray-800">{faculty.publicationsCount}</p>
                  <p className="text-xs text-gray-500">Publications</p>
                </div>
                <div className="text-center">
                  <p className="text-lg text-gray-800">{faculty.yearsOfExperience}</p>
                  <p className="text-xs text-gray-500">Years Exp.</p>
                </div>
                <div className="text-center">
                  <p className="text-lg text-gray-800">{faculty.coursesTaught.length}</p>
                  <p className="text-xs text-gray-500">Courses</p>
                </div>
              </div>

              {/* View Details Button */}
              <Button 
                variant="outline" 
                className="w-full mt-4 group-hover:bg-teal-50 group-hover:border-teal-300 transition-all"
                style={{ borderColor: "#006B64", color: "#006B64" }}
              >
                View Details
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredFaculty.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-gray-800 mb-2">No faculty members found</h3>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Faculty Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={(open) => {
        setIsDetailsOpen(open);
        if (!open) setIsEditMode(false);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl" style={{ color: "#006B64" }}>
                {isEditMode ? 'Edit Faculty Details' : 'Faculty Details'}
              </DialogTitle>
              <div className="flex gap-2">
                {!isEditMode ? (
                  <Button 
                    onClick={handleEdit} 
                    size="sm"
                    style={{ backgroundColor: "#006B64" }}
                    className="text-white"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={handleCancelEdit} 
                      size="sm"
                      variant="outline"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveEdit} 
                      size="sm"
                      style={{ backgroundColor: "#006B64" }}
                      className="text-white"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>
          
          {selectedFaculty && editedFaculty && (
            <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
              <div className="space-y-6">
                {/* Profile Section */}
                <div className="flex items-start space-x-6 pb-6 border-b">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={editedFaculty.profilePhoto} />
                    <AvatarFallback className="text-2xl text-white" style={{ backgroundColor: "#006B64" }}>
                      {editedFaculty.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    {isEditMode ? (
                      <>
                        <div>
                          <Label>Full Name</Label>
                          <Input
                            value={editedFaculty.name}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Designation</Label>
                          <Input
                            value={editedFaculty.designation}
                            onChange={(e) => handleFieldChange('designation', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Employee ID</Label>
                          <Input
                            value={editedFaculty.employeeId}
                            onChange={(e) => handleFieldChange('employeeId', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="text-2xl text-gray-800">{editedFaculty.name}</h2>
                        <p className="text-gray-600">{editedFaculty.designation}</p>
                        <Badge style={{ backgroundColor: "#006B64" }} className="text-white">
                          Employee ID: {editedFaculty.employeeId}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>

                {/* Department & Contact */}
                <div>
                  <h3 className="text-gray-800 mb-3 flex items-center">
                    <Briefcase className="w-5 h-5 mr-2" style={{ color: "#006B64" }} />
                    Department & Contact
                  </h3>
                  {isEditMode ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="flex items-center mb-1">
                          <GraduationCap className="w-4 h-4 mr-2" />
                          Department
                        </Label>
                        <Input
                          value={editedFaculty.department}
                          onChange={(e) => handleFieldChange('department', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="flex items-center mb-1">
                          <Mail className="w-4 h-4 mr-2" />
                          Email
                        </Label>
                        <Input
                          type="email"
                          value={editedFaculty.email}
                          onChange={(e) => handleFieldChange('email', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="flex items-center mb-1">
                          <Phone className="w-4 h-4 mr-2" />
                          Phone
                        </Label>
                        <Input
                          value={editedFaculty.phone}
                          onChange={(e) => handleFieldChange('phone', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="flex items-center mb-1">
                          <MapPin className="w-4 h-4 mr-2" />
                          Office Room
                        </Label>
                        <Input
                          value={editedFaculty.officeRoom}
                          onChange={(e) => handleFieldChange('officeRoom', e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center text-gray-700">
                        <GraduationCap className="w-5 h-5 mr-3 text-gray-500" />
                        <span>{editedFaculty.department}</span>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <Mail className="w-5 h-5 mr-3 text-gray-500" />
                        <a href={`mailto:${editedFaculty.email}`} className="hover:underline" style={{ color: "#006B64" }}>
                          {editedFaculty.email}
                        </a>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <Phone className="w-5 h-5 mr-3 text-gray-500" />
                        <span>{editedFaculty.phone}</span>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <MapPin className="w-5 h-5 mr-3 text-gray-500" />
                        <span>{editedFaculty.officeRoom}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Research Area */}
                <div>
                  <h3 className="text-gray-800 mb-3 flex items-center">
                    <Award className="w-5 h-5 mr-2" style={{ color: "#006B64" }} />
                    Research & Specialization
                  </h3>
                  {isEditMode ? (
                    <Textarea
                      value={editedFaculty.researchArea}
                      onChange={(e) => handleFieldChange('researchArea', e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700">{editedFaculty.researchArea}</p>
                    </div>
                  )}
                </div>

                {/* Courses Taught */}
                <div>
                  <h3 className="text-gray-800 mb-3 flex items-center">
                    <BookOpen className="w-5 h-5 mr-2" style={{ color: "#006B64" }} />
                    Courses Taught
                  </h3>
                  {isEditMode ? (
                    <div>
                      <Label className="text-xs text-gray-600 mb-1">Enter courses separated by commas</Label>
                      <Textarea
                        value={coursesInput}
                        onChange={(e) => setCoursesInput(e.target.value)}
                        rows={2}
                        placeholder="e.g., Data Structures, Machine Learning, Software Engineering"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {editedFaculty.coursesTaught.map((course, index) => (
                        <Badge key={index} variant="secondary" className="bg-teal-50 text-teal-700 border-teal-200">
                          {course}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Academic Stats */}
                <div>
                  <h3 className="text-gray-800 mb-3 flex items-center">
                    <FileText className="w-5 h-5 mr-2" style={{ color: "#006B64" }} />
                    Academic Contributions
                  </h3>
                  {isEditMode ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Publications Count</Label>
                        <Input
                          type="number"
                          value={editedFaculty.publicationsCount}
                          onChange={(e) => handleFieldChange('publicationsCount', parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Years of Experience</Label>
                        <Input
                          type="number"
                          value={editedFaculty.yearsOfExperience}
                          onChange={(e) => handleFieldChange('yearsOfExperience', parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-3xl text-gray-800 mb-1">{editedFaculty.publicationsCount}</p>
                        <p className="text-sm text-gray-600">Publications / Papers</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-3xl text-gray-800 mb-1">{editedFaculty.yearsOfExperience}</p>
                        <p className="text-sm text-gray-600">Years of Experience</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Office Hours */}
                <div>
                  <h3 className="text-gray-800 mb-3 flex items-center">
                    <Clock className="w-5 h-5 mr-2" style={{ color: "#006B64" }} />
                    Office Hours
                  </h3>
                  {isEditMode ? (
                    <Input
                      value={editedFaculty.officeHours}
                      onChange={(e) => handleFieldChange('officeHours', e.target.value)}
                      placeholder="e.g., Mon-Fri, 2:00 PM - 4:00 PM"
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700">{editedFaculty.officeHours}</p>
                    </div>
                  )}
                </div>

                {/* Roles & Responsibilities */}
                <div>
                  <h3 className="text-gray-800 mb-3 flex items-center">
                    <Briefcase className="w-5 h-5 mr-2" style={{ color: "#006B64" }} />
                    Roles & Responsibilities
                  </h3>
                  {isEditMode ? (
                    <div>
                      <Label className="text-xs text-gray-600 mb-1">Enter roles separated by commas</Label>
                      <Textarea
                        value={rolesInput}
                        onChange={(e) => setRolesInput(e.target.value)}
                        rows={3}
                        placeholder="e.g., Class Coordinator, Research Lab Coordinator"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {editedFaculty.roles.map((role, index) => (
                        <div key={index} className="flex items-start bg-gray-50 rounded-lg p-3">
                          <div className="w-2 h-2 rounded-full mt-2 mr-3" style={{ backgroundColor: "#006B64" }} />
                          <span className="text-gray-700">{role}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Professional Links */}
                <div>
                  <h3 className="text-gray-800 mb-3">Professional Links</h3>
                  {isEditMode ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="flex items-center mb-1">
                          <Linkedin className="w-4 h-4 mr-2" />
                          LinkedIn URL
                        </Label>
                        <Input
                          type="url"
                          value={editedFaculty.linkedIn || ''}
                          onChange={(e) => handleFieldChange('linkedIn', e.target.value)}
                          placeholder="https://linkedin.com/in/your-profile"
                        />
                      </div>
                      <div>
                        <Label className="flex items-center mb-1">
                          <Globe className="w-4 h-4 mr-2" />
                          Personal Website URL
                        </Label>
                        <Input
                          type="url"
                          value={editedFaculty.website || ''}
                          onChange={(e) => handleFieldChange('website', e.target.value)}
                          placeholder="https://your-website.com"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      {(editedFaculty.linkedIn || editedFaculty.website) ? (
                        <div className="flex flex-wrap gap-3">
                          {editedFaculty.linkedIn && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={editedFaculty.linkedIn} target="_blank" rel="noopener noreferrer">
                                <Linkedin className="w-4 h-4 mr-2" />
                                LinkedIn
                              </a>
                            </Button>
                          )}
                          {editedFaculty.website && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={editedFaculty.website} target="_blank" rel="noopener noreferrer">
                                <Globe className="w-4 h-4 mr-2" />
                                Website
                              </a>
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No professional links added</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
