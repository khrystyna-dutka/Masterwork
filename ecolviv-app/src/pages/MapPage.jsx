// src/pages/MapPage.jsx

import React from 'react';
import { Navigation } from 'lucide-react';
import InteractiveMap from '../components/InteractiveMap';
import { getAQIStatus } from '../utils/helpers';

const MapPage = ({ districts, setCurrentPage, setSelectedDistrict }) => {
  const handleDistrictClick = (district) => {
    setSelectedDistrict(district);
    setCurrentPage('monitoring');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <Navigation className="text-blue-600" />
          Інтерактивна карта Львова
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Карта */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6 h-full flex items-center justify-center">
              <InteractiveMap 
                districts={districts}
                onDistrictClick={handleDistrictClick}
              />
            </div>
          </div>

          {/* Список районів */}
          <div className="bg-white rounded-lg shadow-lg p-6 overflow-y-auto" style={{ maxHeight: '1200px' }}>
            <h2 className="text-xl font-bold text-gray-800 mb-4 sticky top-0 bg-white pb-2 z-10">Райони Львова</h2>
            <div className="space-y-3">
              {districts.map(district => {
                const status = getAQIStatus(district.baseAQI);
                return (
                  <div
                    key={district.id}
                    className="p-4 border-2 rounded-lg cursor-pointer hover:shadow-md transition-all"
                    style={{ borderColor: status.color }}
                    onClick={() => handleDistrictClick(district)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-gray-800">{district.name}</div>
                      <div className="text-2xl font-bold" style={{ color: status.color }}>
                        {district.baseAQI}
                      </div>
                    </div>
                    <div className={`text-sm ${status.textColor} font-semibold mb-2`}>
                      {status.text}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>PM2.5: <span className="font-semibold">{district.pm25}</span></div>
                      <div>PM10: <span className="font-semibold">{district.pm10}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Легенда */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Легенда якості повітря</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg border-2 border-green-500">
              <div className="w-full h-4 bg-green-500 rounded mb-2"></div>
              <div className="text-sm font-semibold text-green-700">Добра</div>
              <div className="text-xs text-gray-500">0-50 AQI</div>
            </div>
            <div className="text-center p-3 bg-lime-50 rounded-lg border-2 border-lime-500">
              <div className="w-full h-4 bg-lime-500 rounded mb-2"></div>
              <div className="text-sm font-semibold text-lime-700">Помірна</div>
              <div className="text-xs text-gray-500">51-70 AQI</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg border-2 border-yellow-500">
              <div className="w-full h-4 bg-yellow-500 rounded mb-2"></div>
              <div className="text-sm font-semibold text-yellow-700">Задовільна</div>
              <div className="text-xs text-gray-500">71-90 AQI</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg border-2 border-orange-500">
              <div className="w-full h-4 bg-orange-500 rounded mb-2"></div>
              <div className="text-sm font-semibold text-orange-700">Погана</div>
              <div className="text-xs text-gray-500">91-110 AQI</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg border-2 border-red-500">
              <div className="w-full h-4 bg-red-500 rounded mb-2"></div>
              <div className="text-sm font-semibold text-red-700">Дуже погана</div>
              <div className="text-xs text-gray-500">110+ AQI</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;