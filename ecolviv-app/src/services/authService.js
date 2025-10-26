// src/services/authService.js

import api from './api';

class AuthService {
  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      const data = response.data; // <-- ДОДАЙ ЦЕ
      
      if (data.success && data.data.token) {
        this.setToken(data.data.token);
        this.setUser(data.data.user);
      }
      
      return data;
    } catch (error) {
      // Якщо є відповідь від сервера - повертаємо її
      if (error.response && error.response.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  async login(email, password) {
    try {
      const response = await api.post('/auth/login', { email, password });
      const data = response.data; // <-- ДОДАЙ ЦЕ
      
      if (data.success && data.data.token) {
        this.setToken(data.data.token);
        this.setUser(data.data.user);
      }
      
      return data;
    } catch (error) {
      // Якщо є відповідь від сервера (401, 400, etc) - повертаємо її
      if (error.response && error.response.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  async getProfile() {
    try {
      const response = await api.get('/auth/profile');
      const data = response.data;
      
      if (data.success && data.data.user) {
        this.setUser(data.data.user);
      }
      
      return data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  async updateProfile(userData) {
    try {
      const response = await api.put('/auth/profile', userData);
      const data = response.data;
      
      if (data.success && data.data.user) {
        this.setUser(data.data.user);
      }
      
      return data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      const response = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  setToken(token) {
    localStorage.setItem('token', token);
  }

  getToken() {
    return localStorage.getItem('token');
  }

  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated() {
    return !!this.getToken();
  }
}

export default new AuthService();