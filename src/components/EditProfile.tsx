import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";
import { GitamLogo } from "./GitamLogo";
import { User, Phone, MapPin, Clock, BookOpen, Briefcase, Link, Camera, Save, ArrowLeft, CheckCircle, Plus, X } from "lucide-react";
import { useAuth } from "./AuthContext";



// ── Compress and resize image to max 200x200, max ~150KB ─────────
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Image must be under 5MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 200;
        let { width, height } = img;
        if (width > height) {
          if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
        } else {
          if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', 0.75);
        // Rough size check ~150KB limit
        if (base64.length > 200000) {
          const base64smaller = canvas.toDataURL('image/jpeg', 0.5);
          resolve(base64smaller);
        } else {
          resolve(base64);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// ── Initials avatar ──────────────────────────────────────────────
function InitialsAvatar({ name, size = 'lg' }: { name?: string; size?: 'sm' | 'lg' }) {
  const initials = (name || 'FA')
    .split(' ')
    .filter(Boolean)
    .slice(0, 3)
    .map(w => w[0].toUpperCase())
    .join('');
  const dim = size === 'lg' ? 'w-24 h-24 text-2xl' : 'w-10 h-10 text-sm';
  return (
    <div className={`${dim} rounded-full flex items-center justify-center font-semibold text-white`}
      style={{ background: 'linear-gradient(135deg, #006B64 0%, #005A54 100%)' }}>
      {initials}
    </div>
  );
}

// ── Reusable tag input with + / × ────────────────────────────────
function TagInput({ label, items, onChange, placeholder }: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [inputVal, setInputVal] = useState('');

  const add = () => {
    const trimmed = inputVal.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
    }
    setInputVal('');
  };

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {/* Existing tags */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {items.map((item, i) => (
            <span key={i} className="flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-800 text-sm rounded-lg px-3 py-1">
              {item}
              <button type="button" onClick={() => remove(i)}
                className="ml-1 text-teal-400 hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Add new tag */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
        />
        <button type="button" onClick={add} disabled={!inputVal.trim()}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-white transition-colors disabled:opacity-40"
          style={{ backgroundColor: '#006B64' }}>
          <Plus className="w-4 h-4" />Add
        </button>
      </div>
    </div>
  );
}

export function EditProfile() {
  const { user, saveExtendedProfile, updateProfileUrls } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');

  // Tag list states — stored as arrays, joined to string on save
  const parseList = (str?: string | null) => str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
  const [researchList, setResearchList] = useState<string[]>(() => parseList(user?.researchArea));
  const [coursesList, setCoursesList] = useState<string[]>(() => parseList(user?.coursesTaught));
  const [rolesList, setRolesList] = useState<string[]>(() => parseList(user?.roles));

  const [form, setForm] = useState({
    // Personal
    mobile: user?.mobile || '',
    officeRoom: user?.officeRoom || '',
    yearsOfExperience: user?.yearsOfExperience?.toString() || '',
    // Academic (lists handled separately via TagInput)
    officeHours: user?.officeHours || '',
    // Links
    linkedinUrl: user?.linkedinUrl || '',
    websiteUrl: user?.websiteUrl || '',
    googleScholarUrl: user?.googleScholarUrl || '',
   scopusUrl: user?.scopusUrl || '',
    scopusUrl2: (user as any)?.scopusUrl2 || '',
    scopusUrl3: (user as any)?.scopusUrl3 || '',
    wosUrl: user?.wosUrl || '',


    // Photo
    profilePhoto: user?.profilePhoto || '',
  });

  // Keep form in sync if user changes
  useEffect(() => {
    if (user) {
      setForm({
        mobile: user.mobile || '',
        officeRoom: user.officeRoom || '',
        yearsOfExperience: user.yearsOfExperience?.toString() || '',
        officeHours: user.officeHours || '',
        linkedinUrl: user.linkedinUrl || '',
        websiteUrl: user.websiteUrl || '',
        googleScholarUrl: user.googleScholarUrl || '',
        scopusUrl: user.scopusUrl || '',
        scopusUrl2: (user as any).scopusUrl2 || '',
        scopusUrl3: (user as any).scopusUrl3 || '',
        wosUrl: user.wosUrl || '',
        profilePhoto: user.profilePhoto || '',
      });
      setResearchList(parseList(user.researchArea));
      setCoursesList(parseList(user.coursesTaught));
      setRolesList(parseList(user.roles));
    }
  }, [user]);

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    try {
      const compressed = await compressImage(file);
      set('profilePhoto', compressed);
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to process image');
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      // Save extended profile
      const profileResult = await saveExtendedProfile({
        mobile: form.mobile || null,
        officeRoom: form.officeRoom || null,
        yearsOfExperience: form.yearsOfExperience ? parseInt(form.yearsOfExperience) : null,
        researchArea: researchList.join(', ') || null,
        coursesTaught: coursesList.join(', ') || null,
        officeHours: form.officeHours || null,
        roles: rolesList.join(', ') || null,
        linkedinUrl: form.linkedinUrl || null,
        websiteUrl: form.websiteUrl || null,
        profilePhoto: form.profilePhoto || null,
      });

      if (!profileResult.success) {
        setError(profileResult.error || 'Failed to save profile');
        return;
      }

      // Save academic URLs separately
      const urlResult = await updateProfileUrls({
        googleScholarUrl: form.googleScholarUrl,
        scopusUrl: form.scopusUrl,
        scopusUrl2: form.scopusUrl2,
        scopusUrl3: form.scopusUrl3,
        wosUrl: form.wosUrl,
      });

      if (!urlResult.success) {
        setError(urlResult.error || 'Failed to save profile URLs');
        return;
      }

      setShowSuccessModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50">

      {/* ── Profile Saved Success Modal ── */}
      <Dialog open={showSuccessModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Saved Successfully!</h3>
            <p className="text-gray-600 mb-6">Your profile has been updated.</p>
            <Button
              onClick={() => { setShowSuccessModal(false); navigate('/dashboard'); }}
              className="bg-teal-600 hover:bg-teal-700 text-white px-8"
            >
              Go to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <header style={{ backgroundColor: '#006B64', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }} className="shadow-md overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <GitamLogo className="w-8 h-8" />
              <div>
                <h1 className="text-base font-semibold text-white leading-tight">Edit Profile</h1>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>GITAM University Faculty Portal</p>
              </div>
            </div>
            <button onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Profile Photo + Basic Info (read-only) */}
        <Card className="bg-white/95 shadow-lg border-0 rounded-xl">
          <CardHeader className="text-white rounded-t-xl" style={{ background: "linear-gradient(135deg, #006B64 0%, #005A54 100%)" }}>
            <CardTitle className="flex items-center space-x-2 text-white">
              <User className="w-5 h-5" />
              <span>Profile Photo & Identity</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              {/* Photo preview */}
              <div className="relative flex-shrink-0">
                {form.profilePhoto ? (
                  <img src={form.profilePhoto} alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-teal-100" />
                ) : (
                  <InitialsAvatar name={user?.name} size="lg" />
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute w-8 h-8 rounded-full bg-teal-600 hover:bg-teal-700 flex items-center justify-center shadow-md transition-colors"
                  style={{ bottom: '2px', right: '2px' }}
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>

              <div className="flex-1">
                <p className="text-lg font-semibold text-gray-900">{user?.name}</p>
                <p className="text-sm text-gray-500">{user?.designation} · {user?.department}</p>
                <p className="text-sm text-gray-400">Faculty ID: {user?.facultyId}</p>
                <p className="text-xs text-gray-400 mt-1">Click the camera icon to upload a photo (max 5MB)</p>
                {photoError && <p className="text-xs text-red-500 mt-1">{photoError}</p>}
                {form.profilePhoto && (
                  <button onClick={() => set('profilePhoto', '')}
                    className="text-xs text-red-500 hover:text-red-700 mt-1 underline">
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card className="bg-white/95 shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2" style={{ color: "#006B64" }}>
              <Phone className="w-5 h-5" />
              <span>Personal Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Mobile Number</label>
              <input type="tel" className={inputClass} placeholder="+91-9876543210"
                value={form.mobile} onChange={e => set('mobile', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Office Room</label>
              <input type="text" className={inputClass} placeholder="e.g. CSE-Block, Room 301"
                value={form.officeRoom} onChange={e => set('officeRoom', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Years of Experience</label>
              <input type="number" className={inputClass} placeholder="e.g. 8" min="0" max="50"
                value={form.yearsOfExperience} onChange={e => set('yearsOfExperience', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Academic Info */}
        <Card className="bg-white/95 shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2" style={{ color: "#006B64" }}>
              <BookOpen className="w-5 h-5" />
              <span>Academic Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <TagInput
              label="Research Areas"
              items={researchList}
              onChange={setResearchList}
              placeholder="e.g. Software Engineering"
            />
            <TagInput
              label="Courses Taught"
              items={coursesList}
              onChange={setCoursesList}
              placeholder="e.g. Data Structures"
            />
            <div>
              <label className={labelClass}>Office Hours</label>
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={form.officeHours.split(',')[0]?.split(' ')[0] || ''}
                  onChange={e => {
                    const parts = form.officeHours.split(', ');
                    const timePart = parts[1] || '9:00 AM - 5:00 PM';
                    set('officeHours', `${e.target.value}, ${timePart}`);
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 bg-white"
                >
                  <option value="">Select days</option>
                  <option value="Mon-Fri">Mon – Fri</option>
                  <option value="Mon-Sat">Mon – Sat</option>
                  <option value="Mon-Wed">Mon – Wed</option>
                  <option value="Thu-Fri">Thu – Fri</option>
                  <option value="Mon">Monday only</option>
                  <option value="Tue">Tuesday only</option>
                  <option value="Wed">Wednesday only</option>
                  <option value="Thu">Thursday only</option>
                  <option value="Fri">Friday only</option>
                </select>
                <input
                  type="time"
                  value={(() => {
                    const t = form.officeHours.split(', ')[1]?.split(' - ')[0];
                    if (!t) return '';
                    const [time, ampm] = t.split(' ');
                    let [h, m] = time.split(':').map(Number);
                    if (ampm === 'PM' && h !== 12) h += 12;
                    if (ampm === 'AM' && h === 12) h = 0;
                    return `${String(h).padStart(2,'0')}:${String(m||0).padStart(2,'0')}`;
                  })()}
                  onChange={e => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const h12 = h % 12 || 12;
                    const fromStr = `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
                    const dayPart = form.officeHours.split(', ')[0] || 'Mon-Fri';
                    const toPart = form.officeHours.split(' - ')[1] || '5:00 PM';
                    set('officeHours', `${dayPart}, ${fromStr} - ${toPart}`);
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 bg-white"
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="time"
                  value={(() => {
                    const t = form.officeHours.split(' - ')[1];
                    if (!t) return '';
                    const [time, ampm] = t.trim().split(' ');
                    let [h, m] = time.split(':').map(Number);
                    if (ampm === 'PM' && h !== 12) h += 12;
                    if (ampm === 'AM' && h === 12) h = 0;
                    return `${String(h).padStart(2,'0')}:${String(m||0).padStart(2,'0')}`;
                  })()}
                  onChange={e => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const h12 = h % 12 || 12;
                    const toStr = `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
                    const fromPart = form.officeHours.split(' - ')[0] || 'Mon-Fri, 9:00 AM';
                    set('officeHours', `${fromPart} - ${toStr}`);
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 bg-white"
                />
              </div>
              {form.officeHours && (
                <p className="text-xs text-teal-600 mt-1">📅 {form.officeHours}</p>
              )}
            </div>
            <TagInput
              label="Roles & Responsibilities"
              items={rolesList}
              onChange={setRolesList}
              placeholder="e.g. Class Coordinator - CSE 3rd Year"
            />
          </CardContent>
        </Card>

        {/* Professional Links */}
        <Card className="bg-white/95 shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2" style={{ color: "#006B64" }}>
              <Link className="w-5 h-5" />
              <span>Professional Links</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>LinkedIn URL</label>
              <input type="url" className={inputClass} placeholder="https://linkedin.com/in/yourprofile"
                value={form.linkedinUrl} onChange={e => set('linkedinUrl', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Personal Website</label>
              <input type="url" className={inputClass} placeholder="https://yourwebsite.com"
                value={form.websiteUrl} onChange={e => set('websiteUrl', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>
                <span className="inline-block w-3 h-3 rounded-full bg-orange-400 mr-1"></span>
                Google Scholar URL
              </label>
              <input type="url" className={inputClass}
                placeholder="https://scholar.google.com/citations?user=..."
                value={form.googleScholarUrl} onChange={e => set('googleScholarUrl', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>
                <span className="inline-block w-3 h-3 rounded-full bg-blue-400 mr-1"></span>
                Scopus URL(s) <span className="text-gray-400 font-normal text-xs">(add up to 3 if you have multiple IDs)</span>
              </label>
              <div className="flex flex-col gap-2">
                <input type="url" className={inputClass}
                  placeholder="https://www.scopus.com/authid/detail.uri?authorId=..."
                  value={form.scopusUrl} onChange={e => set('scopusUrl', e.target.value)} />
                {(form.scopusUrl || form.scopusUrl2) && (
                  <input type="url" className={inputClass}
                    placeholder="Second Scopus URL (optional)"
                    value={form.scopusUrl2} onChange={e => set('scopusUrl2', e.target.value)} />
                )}
                {form.scopusUrl && form.scopusUrl2 && (
                  <input type="url" className={inputClass}
                    placeholder="Third Scopus URL (optional)"
                    value={form.scopusUrl3} onChange={e => set('scopusUrl3', e.target.value)} />
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>
                <span className="inline-block w-3 h-3 rounded-full bg-green-400 mr-1"></span>
                Web of Science URL
              </label>
              <input type="url" className={inputClass}
                placeholder="https://www.webofscience.com/wos/author/record/..."
                value={form.wosUrl} onChange={e => set('wosUrl', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="border-gray-300 text-gray-600">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}
            className="text-white px-8" style={{ backgroundColor: '#006B64' }}>
            {saving ? (
              <><Save className="w-4 h-4 mr-2 animate-pulse" />Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />Save Profile</>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}