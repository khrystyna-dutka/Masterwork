// src/pages/HomePage.jsx

import React from 'react';
import { Wind, MapPin, TrendingUp, AlertCircle, Navigation, BarChart3, LogIn, User } from 'lucide-react';
import { getAQIStatus } from '../utils/helpers';

const HomePage = ({ districts, setCurrentPage, setSelectedDistrict, isLoggedIn }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-100 rounded-full mb-6">
            <Wind className="text-blue-600" size={48} />
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-4">EcoLviv</h1>
          <p className="text-xl text-gray-600 mb-8">
            Інтелектуальна система моніторингу та прогнозування якості повітря у Львові
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setCurrentPage('map')}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Navigation size={20} />
              Переглянути карту
            </button>
            <button
              onClick={() => setCurrentPage('monitoring')}
              className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition flex items-center gap-2"
            >
              <BarChart3 size={20} />
              Аналітика
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
              Моніторинг в реальному часі
            </h3>
            <p className="text-gray-600">
              Відстежуйте якість повітря у всіх районах Львова з детальними показниками PM2.5, PM10 та NO₂
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Прогнозування</h3>
            <p className="text-gray-600">
              Отримуйте прогнози якості повітря на наступні 12-72 години для планування активностей
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <AlertCircle className="text-purple-600" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Сценарне моделювання</h3>
            <p className="text-gray-600">
              Досліджуйте вплив трафіку та озеленення на якість повітря у вашому районі
            </p>
          </div>
        </div>

        {/* Current Stats */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Поточна ситуація у Львові
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {districts.map(district => {
              const status = getAQIStatus(district.baseAQI);
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
                  <div className="text-sm font-semibold text-gray-700">{district.name}</div>
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