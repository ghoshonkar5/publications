// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  
  return data;
};

// Authentication API
export const authAPI = {
  login: async (facultyId: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ facultyId, password }),
    });
    
    const data = await handleResponse(response);
    
    // Store token
    if (data.success && data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  },

  register: async (userData: {
    email: string;
    password: string;
    facultyId: string;
    name: string;
    department?: string;
    designation?: string;
    mobile?: string;
    researchArea?: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    const data = await handleResponse(response);
    
    // Store token
    if (data.success && data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getMe: async () => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  },

  // ✅ NEW: Update academic profile URLs
  updateProfileUrls: async (urls: {
    googleScholarUrl?: string;
    scopusUrl?: string;
    wosUrl?: string;
  }) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/auth/profile-urls`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(urls),
    });
    
    return handleResponse(response);
  },
};

// Publications API
export const publicationsAPI = {
  getAll: async (filters?: { academicYear?: string; quartile?: string }) => {
    const token = getAuthToken();
    const params = new URLSearchParams(filters as any);
    
    const response = await fetch(`${API_BASE_URL}/publications?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  },

  getByFaculty: async (facultyId: string) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/publications/faculty/${facultyId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  },

  getById: async (id: string) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/publications/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  },

  create: async (publicationData: any) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/publications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(publicationData),
    });
    
    return handleResponse(response);
  },

  update: async (id: string, publicationData: any) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/publications/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(publicationData),
    });
    
    return handleResponse(response);
  },

  delete: async (id: string) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/publications/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  },

  getStats: async (facultyId: string) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/publications/stats/${facultyId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  },
};

// Conferences API
export const conferencesAPI = {
  getAll: async (filters?: { academicYear?: string; type?: string }) => {
    const token = getAuthToken();
    const params = new URLSearchParams(filters as any);
    
    const response = await fetch(`${API_BASE_URL}/conferences?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  },

  getByFaculty: async (facultyId: string) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/conferences/faculty/${facultyId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  },

  create: async (conferenceData: any) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/conferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(conferenceData),
    });
    
    return handleResponse(response);
  },

  update: async (id: string, conferenceData: any) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/conferences/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(conferenceData),
    });
    
    return handleResponse(response);
  },

  delete: async (id: string) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/conferences/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  },
};

// Books API
export const booksAPI = {
  getAll: async (filters?: { academicYear?: string; type?: string }) => {
    const token = getAuthToken();
    const params = new URLSearchParams(filters as any);
    
    const response = await fetch(`${API_BASE_URL}/books?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  },

  getByFaculty: async (facultyId: string) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/books/faculty/${facultyId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  },

  create: async (bookData: any) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/books`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(bookData),
    });
    
    return handleResponse(response);
  },

  update: async (id: string, bookData: any) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/books/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(bookData),
    });
    
    return handleResponse(response);
  },

  delete: async (id: string) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/books/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  },
};

// Legacy API methods for compatibility with existing components
const getFacultyData = async (userId: string, token: string) => {
  try {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const facultyId = user?.facultyId;

    if (!facultyId) {
      throw new Error('Faculty ID not found');
    }

    const [pubs, confs, books] = await Promise.all([
      publicationsAPI.getByFaculty(facultyId),
      conferencesAPI.getByFaculty(facultyId),
      booksAPI.getByFaculty(facultyId),
    ]);

    const publications = pubs.data || [];
    const conferences = confs.data || [];
    const booksData = books.data || [];

    const totalCitations = publications.reduce((sum: number, pub: any) => {
      return sum + (pub.wosCitations || 0) + (pub.scopusCitations || 0) + (pub.googleCitations || 0);
    }, 0);

    const currentYear = new Date().getFullYear();
    const thisYearPubs = publications.filter((p: any) => {
      const year = p.monthYear ? parseInt(p.monthYear.split('-')[1] || p.monthYear.split('/')[1]) : 0;
      return year === currentYear;
    });

    return {
      success: true,
      data: {
        academicStats: {
          publications: {
            total: publications.length,
            thisYear: thisYearPubs.length,
            journals: publications.length,
          },
          conferences: {
            total: conferences.length,
            international: conferences.filter((c: any) => c.type === 'International').length,
            national: conferences.filter((c: any) => c.type === 'National').length,
          },
          books: {
            total: booksData.length,
            books: booksData.filter((b: any) => b.type === 'Book').length,
            chapters: booksData.filter((b: any) => b.type === 'Book Chapter').length,
          },
          citations: {
            total: totalCitations,
            hIndex: 0,
            i10Index: 0,
          },
        },
      },
    };
  } catch (error) {
    console.error('getFacultyData error:', error);
    return { success: false, error: String(error) };
  }
};

const syncData = async (userId: string, token: string) => {
  return { success: true, message: 'Sync completed successfully' };
};

// Default export for convenience
export const api = {
  auth: authAPI,
  publications: publicationsAPI,
  conferences: conferencesAPI,
  books: booksAPI,
  getFacultyData,
  syncData,
};

export default api;