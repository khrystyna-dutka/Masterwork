// src/services/authService.js

import api from './api';

class AuthService {
  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData, { skipAuth: true });
      
      if (response.success && response.data.token) {
        this.setToken(response.data.token);
        this.setUser(response.data.user);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  async login(email, password) {
    try {
      const response = await api.post('/auth/login', { email, password }, { skipAuth: true });
      
      if (response.success && response.data.token) {
        this.setToken(response.data.token);
        this.setUser(response.data.user);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getProfile() {
    try {
      const response = await api.get('/auth/profile');
      
      if (response.success && response.data.user) {
        this.setUser(response.data.user);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(userData) {
    try {
      const response = await api.put('/auth/profile', userData);
      
      if (response.success && response.data.user) {
        this.setUser(response.data.user);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      return await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
    } catch (error) {
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