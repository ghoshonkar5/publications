
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