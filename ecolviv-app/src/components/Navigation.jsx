// src/components/Navigation.jsx

import React, { useState } from 'react';
import { Wind, Home, Navigation as NavIcon, BarChart3, User, LogIn, Menu, X, LogOut, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navigation = ({ currentPage, setCurrentPage }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  const navItems = [
    { id: 'home', label: 'Головна', icon: Home },
    { id: 'map', label: 'Карта', icon: NavIcon },
    { id: 'monitoring', label: 'Моніторинг', icon: BarChart3 },
    { id: 'ml-test', label: 'Тест ML', icon: Target }
  ];

  const handleLogout = () => {
    logout();
    setCurrentPage('home');
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Логотип */}
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => setCurrentPage('home')}
          >
            <Wind className="text-blue-600" size={32} />
            <span className="text-xl font-bold text-gray-800">EcoLviv</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                    currentPage === item.id 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </button>
              );
            })}
            
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage('profile')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    currentPage === 'profile' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  }`}
                >
                  <User size={20} />
                  {user?.full_name || 'Профіль'}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <LogOut size={20} />
                  Вийти
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage('login')}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <LogIn size={20} />
                  Увійти
                </button>
                <button
                  onClick={() => setCurrentPage('register')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Реєстрація
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  <Icon size={20} />
                  {item.label}
                </button>
              );
            })}
            
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => {
                    setCurrentPage('profile');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-600 rounded-lg"
                >
                  <User size={20} />
                  {user?.full_name || 'Профіль'}
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <LogOut size={20} />
                  Вийти
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setCurrentPage('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <LogIn size={20} />
                  Увійти
                </button>
                <button
                  onClick={() => {
                    setCurrentPage('register');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Реєстрація
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;