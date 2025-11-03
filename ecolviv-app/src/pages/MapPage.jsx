// src/pages/MapPage.jsx

import React, { useState } from 'react';
import { Navigation, RefreshCw } from 'lucide-react';
import InteractiveMap from '../components/InteractiveMap';

const MapPage = ({ districts, setCurrentPage, setSelectedDistrict, refreshData }) => {
  const [displayMode, setDisplayMode] = useState('baseAQI');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleDistrictClick = (district) => {
    setSelectedDistrict(district);
    setCurrentPage('monitoring');
  };

  const handleRefresh = async () => {
    if (refreshData) {
      setIsRefreshing(true);
      try {
        await refreshData();
      } catch (error) {
        console.error('Помилка оновлення:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // Параметри для вибору
  const parameters = [
    { key: 'baseAQI', label: 'AQI', unit: '' },
    { key: 'pm25', label: 'PM2.5', unit: 'μg/m³' },
    { key: 'pm10', label: 'PM10', unit: 'μg/m³' },
    { key: 'no2', label: 'NO₂', unit: 'μg/m³' },
    { key: 'so2', label: 'SO₂', unit: 'μg/m³' },
    { key: 'co', label: 'CO', unit: 'μg/m³' },
    { key: 'o3', label: 'O₃', unit: 'μg/m³' }
  ];

  // Легенди для різних параметрів
  const legends = {
    baseAQI: {
      title: 'Легенда якості повітря (AQI):',
      levels: [
        { color: '#10b981', range: '0-50', label: 'Добра' },
        { color: '#f59e0b', range: '51-100', label: 'Помірна' },
        { color: '#f97316', range: '101-150', label: 'Нездорова для чутливих' },
        { color: '#ef4444', range: '151-200', label: 'Нездорова' },
        { color: '#9333ea', range: '201-300', label: 'Дуже нездорова' },
        { color: '#7f1d1d', range: '300+', label: 'Небезпечна' }
      ]
    },
    pm25: {
      title: 'Норми PM2.5 (μg/m³):',
      levels: [
        { color: '#10b981', range: '0-12', label: 'Добра' },
        { color: '#f59e0b', range: '12.1-35.4', label: 'Помірна' },
        { color: '#f97316', range: '35.5-55.4', label: 'Нездорова для чутливих' },
        { color: '#ef4444', range: '55.5-150.4', label: 'Нездорова' },
        { color: '#9333ea', range: '150.5-250.4', label: 'Дуже нездорова' },
        { color: '#7f1d1d', range: '250.5+', label: 'Небезпечна' }
      ]
    },
    pm10: {
      title: 'Норми PM10 (μg/m³):',
      levels: [
        { color: '#10b981', range: '0-54', label: 'Добра' },
        { color: '#f59e0b', range: '55-154', label: 'Помірна' },
        { color: '#f97316', range: '155-254', label: 'Нездорова для чутливих' },
        { color: '#ef4444', range: '255-354', label: 'Нездорова' },
        { color: '#9333ea', range: '355-424', label: 'Дуже нездорова' },
        { color: '#7f1d1d', range: '425+', label: 'Небезпечна' }
      ]
    },
    no2: {
      title: 'Норми NO₂ (μg/m³):',
      levels: [
        { color: '#10b981', range: '0-53', label: 'Добра' },
        { color: '#f59e0b', range: '54-100', label: 'Помірна' },
        { color: '#f97316', range: '101-360', label: 'Нездорова для чутливих' },
        { color: '#ef4444', range: '361-649', label: 'Нездорова' },
        { color: '#9333ea', range: '650-1249', label: 'Дуже нездорова' },
        { color: '#7f1d1d', range: '1250+', label: 'Небезпечна' }
      ]
    },
    so2: {
      title: 'Норми SO₂ (μg/m³):',
      levels: [
        { color: '#10b981', range: '0-35', label: 'Добра' },
        { color: '#f59e0b', range: '36-75', label: 'Помірна' },
        { color: '#f97316', range: '76-185', label: 'Нездорова для чутливих' },
        { color: '#ef4444', range: '186-304', label: 'Нездорова' },
        { color: '#9333ea', range: '305-604', label: 'Дуже нездорова' },
        { color: '#7f1d1d', range: '605+', label: 'Небезпечна' }
      ]
    },
    co: {
      title: 'Норми CO (μg/m³):',
      levels: [
        { color: '#10b981', range: '0-4400', label: 'Добра' },
        { color: '#f59e0b', range: '4401-9400', label: 'Помірна' },
        { color: '#f97316', range: '9401-12400', label: 'Нездорова для чутливих' },
        { color: '#ef4444', range: '12401-15400', label: 'Нездорова' },
        { color: '#9333ea', range: '15401-30400', label: 'Дуже нездорова' },
        { color: '#7f1d1d', range: '30401+', label: 'Небезпечна' }
      ]
    },
    o3: {
      title: 'Норми O₃ (μg/m³):',
      levels: [
        { color: '#10b981', range: '0-54', label: 'Добра' },
        { color: '#f59e0b', range: '55-70', label: 'Помірна' },
        { color: '#f97316', range: '71-85', label: 'Нездорова для чутливих' },
        { color: '#ef4444', range: '86-105', label: 'Нездорова' },
        { color: '#9333ea', range: '106-200', label: 'Дуже нездорова' },
        { color: '#7f1d1d', range: '201+', label: 'Небезпечна' }
      ]
    }
  };

  const currentLegend = legends[displayMode];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <Navigation className="text-blue-600" />
          Інтерактивна карта Львова
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Карта */}
          <div className="lg:col-span-2 h-full">
            <div className="bg-white rounded-lg shadow-lg p-6 h-full flex items-center justify-center">
              <InteractiveMap
                districts={districts}
                onDistrictClick={handleDistrictClick}
                displayMode={displayMode}
              />
            </div>
          </div>

          {/* Панель керування */}
          <div className="space-y-4 flex flex-col">
            {/* Вибір параметра */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="font-bold text-gray-800 mb-3">Шари:</h3>
              <div className="space-y-2">
                {parameters.map(param => (
                  <button
                    key={param.key}
                    onClick={() => setDisplayMode(param.key)}
                    className={`w-full p-3 rounded-lg text-left font-semibold transition ${displayMode === param.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{param.label}</span>
                      {param.unit && <span className="text-sm opacity-75">{param.unit}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Кнопка оновлення */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`w-full p-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${isRefreshing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                }`}
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Оновлення...' : 'Оновити дані'}
            </button>

            {/* Легенда */}
            <div className="bg-white rounded-lg shadow-lg p-4 flex-1 flex flex-col">
              <h3 className="font-bold text-gray-800 mb-3">{currentLegend.title}</h3>
              <div className="space-y-2 text-sm flex-1">
                {currentLegend.levels.map((level, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded flex-shrink-0"
                      style={{ backgroundColor: level.color }}
                    ></div>
                    <span>{level.range}: {level.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;