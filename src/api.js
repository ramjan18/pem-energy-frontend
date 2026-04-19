// API Configuration
// Dynamically construct API URL based on current window location
// This allows the app to work both locally and when accessed via network IP
const getAPIBaseURL = () => {
  // If VITE_API_URL is explicitly set in environment, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Otherwise, construct URL dynamically
  // Use the same hostname but with port 5000
  const protocol = window.location.protocol; // http: or https:
  const hostname = window.location.hostname; // localhost, IP address, etc.
  return `${protocol}//${hostname}:5000/api`;
};

const API_BASE_URL = getAPIBaseURL();

// Log the API URL for debugging
console.log('API Base URL:', API_BASE_URL);
console.log('Frontend Location:', window.location.href);

// Retrieve token from localStorage
const getToken = () => localStorage.getItem('authToken');

// API request helper
async function makeRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies and credentials for CORS requests
  };

  // Add authorization token if available
  const token = getToken();
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  // Add body for POST/PUT requests
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // Provide better error messages for network issues
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('Network Error: Unable to reach', API_BASE_URL);
      console.error('Make sure the backend is running at:', API_BASE_URL);
      throw new Error(`Network Error: Cannot reach server at ${API_BASE_URL}. Make sure the backend is running.`);
    }
    console.error('API Error:', error);
    throw error;
  }
}

// Authentication endpoints
export const authAPI = {
  register: (userData) => makeRequest('/auth/register', 'POST', userData),
  
  login: (credentials) => makeRequest('/auth/login', 'POST', credentials),
  
  getProfile: () => makeRequest('/auth/profile', 'GET'),
  
  getAllUsers: (filters) => {
    const params = new URLSearchParams(filters).toString();
    return makeRequest(`/auth/users?${params}`, 'GET');
  },
  
  updateUser: (userId, userData) => makeRequest(`/auth/users/${userId}`, 'PUT', userData),
  
  deleteUser: (userId) => makeRequest(`/auth/users/${userId}`, 'DELETE'),
};

// Meter endpoints
export const meterAPI = {
  createMeter: (meterData) => makeRequest('/meters', 'POST', meterData),
  
  getAllMeters: (filters) => {
    const params = new URLSearchParams(filters).toString();
    return makeRequest(`/meters?${params}`, 'GET');
  },
  
  getMeterById: (meterId) => makeRequest(`/meters/${meterId}`, 'GET'),
  
  updateMeter: (meterId, meterData) => makeRequest(`/meters/${meterId}`, 'PUT', meterData),
  
  deleteMeter: (meterId) => makeRequest(`/meters/${meterId}`, 'DELETE'),
};

// Meter Reading endpoints
export const readingAPI = {
  recordReading: (readingData) => makeRequest('/readings', 'POST', readingData),
  
  getReadings: (filters) => {
    const params = new URLSearchParams(filters).toString();
    return makeRequest(`/readings?${params}`, 'GET');
  },
  
  getReadingById: (readingId) => makeRequest(`/readings/${readingId}`, 'GET'),
  
  getDeletedReadings: (filters) => {
    const params = new URLSearchParams(filters).toString();
    return makeRequest(`/readings/deleted-readings?${params}`, 'GET');
  },
  
  calculateDailyConsumption: (meterId, date) => 
    makeRequest(`/readings/daily-consumption?meterId=${meterId}&date=${date}`, 'GET'),
  
  calculateActualMD: (meterId, startDate, endDate) => {
    const params = new URLSearchParams({ meterId, startDate, endDate });
    return makeRequest(`/readings/actual-md?${params}`, 'GET');
  },
  
  updateReading: (readingId, readingData) => makeRequest(`/readings/${readingId}`, 'PUT', readingData),
  
  deleteReading: (readingId, deletionReason) => makeRequest(`/readings/${readingId}`, 'DELETE', { deletionReason }),
  
  restoreReading: (readingId) => makeRequest(`/readings/${readingId}/restore`, 'POST'),
};

// Token management
export const tokenAPI = {
  setToken: (token) => localStorage.setItem('authToken', token),
  
  getToken: () => localStorage.getItem('authToken'),
  
  removeToken: () => localStorage.removeItem('authToken'),
  
  isTokenValid: () => !!getToken(),
};

export default {
  authAPI,
  meterAPI,
  readingAPI,
  tokenAPI,
};
