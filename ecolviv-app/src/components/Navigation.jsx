// src/components/Navigation.jsx

import React, { useState } from 'react';
import { Wind, Home, Navigation as NavIcon, BarChart3, User, LogIn, Menu, X, LogOut, Flame, Sparkles, Brain } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const Navigation = ({ currentPage, setCurrentPage }) => {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  const navItems = [
    { id: 'home', label: t('nav.home'), icon: Home },
    { id: 'map', label: t('nav.map'), icon: NavIcon },
    { id: 'monitoring', label: t('nav.monitoring'), icon: BarChart3 },
    { id: 'scenario-test', label: t('nav.scenarios'), icon: Flame },
    { id: 'scenario-modeling', label: t('nav.modeling'), icon: Sparkles },
    { id: 'research', label: t('nav.research'), icon: Brain }
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
          <div className="hidden md:flex items-center gap-4">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm ${
                    currentPage === item.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}

            {/* Риска + Мова + Акаунт */}
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-300">
              {/* Перемикач мови */}
              <LanguageSwitcher />

              {/* Акаунт */}
              {isAuthenticated ? (
                <>
                  <div className="relative group">
                    <button
                      onClick={() => setCurrentPage('profile')}
                      className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                    >
                      <User size={20} />
                    </button>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {user?.full_name || t('nav.profile')}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-800"></div>
                    </div>
                  </div>
                  <div className="relative group">
                    <button
                      onClick={handleLogout}
                      className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                    >
                      <LogOut size={20} />
                    </button>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {t('nav.logout')}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-800"></div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative group">
                    <button
                      onClick={() => setCurrentPage('login')}
                      className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <LogIn size={20} />
                    </button>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {t('nav.login')}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-800"></div>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentPage('register')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                  >
                    {t('nav.register')}
                  </button>
                </>
              )}
            </div>
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    currentPage === item.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}

            {/* Перемикач мови в мобільному */}
            <div className="px-4 py-2">
              <LanguageSwitcher />
            </div>

            {isAuthenticated ? (
              <>
                <button
                  onClick={() => {
                    setCurrentPage('profile');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-blue-100 text-blue-600 rounded-lg font-medium"
                >
                  <User size={20} />
                  {user?.full_name || t('nav.profile')}
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  <LogOut size={20} />
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setCurrentPage('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-blue-600 hover:bg-blue-50 rounded-lg font-medium"
                >
                  <LogIn size={20} />
                  {t('nav.login')}
                </button>
                <button
                  onClick={() => {
                    setCurrentPage('register');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium"
                >
                  {t('nav.register')}
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