// ecolviv-app/src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Додати токен до кожного запиту, якщо він є
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Обробка відповідей
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Air Quality API
export const airQualityAPI = {
  getDistricts: () => api.get('/air-quality/districts'),
  getCurrentAirQuality: () => api.get('/air-quality/current'),
  getDistrictAirQuality: (districtId) => api.get(`/air-quality/district/${districtId}`)
};

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.put('/auth/profile', userData)
};

export default api;