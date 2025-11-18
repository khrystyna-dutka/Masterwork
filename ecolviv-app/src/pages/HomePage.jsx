// src/pages/HomePage.jsx

import React from 'react';
import { Wind, MapPin, TrendingUp, AlertCircle, Navigation, BarChart3 } from 'lucide-react';
import { getLocalizedDistrictName } from '../utils/districts';
import { useTranslation } from 'react-i18next';

const HomePage = ({ districts, setCurrentPage, setSelectedDistrict, isLoggedIn }) => {
  const { t, i18n } = useTranslation();

  // Функція для отримання статусу AQI з перекладом
  const getAQIStatusTranslated = (aqi) => {
    if (aqi <= 50)  return { color: '#10b981', text: t('aqi.status.good'),                 textColor: 'text-green-600' };
    if (aqi <= 100) return { color: '#f59e0b', text: t('aqi.status.moderate'),            textColor: 'text-yellow-600' };
    if (aqi <= 150) return { color: '#f97316', text: t('aqi.status.unhealthy_sensitive'), textColor: 'text-orange-600' };
    if (aqi <= 200) return { color: '#ef4444', text: t('aqi.status.unhealthy'),          textColor: 'text-red-600' };
    if (aqi <= 300) return { color: '#9333ea', text: t('aqi.status.very_unhealthy'),     textColor: 'text-purple-600' };
    return { color: '#7f1d1d', text: t('aqi.status.hazardous'),                          textColor: 'text-red-900' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-100 rounded-full mb-6">
            <Wind className="text-blue-600" size={48} />
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-4">EcoLviv</h1>
          <p className="text-xl text-gray-600 mb-8">{t('home.heroSubtitle')}</p>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setCurrentPage('map')}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Navigation size={20} />
              {t('home.viewMap')}
            </button>
            <button
              onClick={() => setCurrentPage('monitoring')}
              className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition flex items-center gap-2"
            >
              <BarChart3 size={20} />
              {t('home.analytics')}
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <MapPin className="text-blue-600" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {t('home.featureRealtimeTitle')}
            </h3>
            <p className="text-gray-600">
              {t('home.featureRealtimeText')}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{t('home.featureForecastTitle')}</h3>
            <p className="text-gray-600">
              {t('home.featureForecastText')}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <AlertCircle className="text-purple-600" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{t('home.featureScenarioTitle')}</h3>
            <p className="text-gray-600">
              {t('home.featureScenarioText')}
            </p>
          </div>
        </div>

        {/* Current Stats */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            {t('home.currentTitle')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {districts.map(district => {
              const status = getAQIStatusTranslated(district.baseAQI);
              return (
                <div
                  key={district.id}
                  className="text-center p-4 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => {
                    setSelectedDistrict(district);
                    setCurrentPage('monitoring');
                  }}
                >
                  <div className="text-3xl font-bold mb-1" style={{ color: status.color }}>
                    {district.baseAQI}
                  </div>
                  <div className="text-sm font-semibold text-gray-700">
                    {getLocalizedDistrictName(district, i18n)}
                  </div>
                  <div className="text-xs text-gray-500">{status.text}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;