// src/components/DistrictCard.jsx

import React from 'react';
import { Car, Trees } from 'lucide-react';
import { getAQIStatus, formatPopulation } from '../utils/helpers';
import { useTranslation } from 'react-i18next';
import { getLocalizedDistrictName } from '../utils/districts';

const DistrictCard = ({ district, onClick, isSelected = false }) => {
  const status = getAQIStatus(district.baseAQI);
  const { i18n } = useTranslation();

  const displayName = getLocalizedDistrictName(district, i18n);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer ${
        isSelected ? 'ring-4 ring-blue-500' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-xl text-gray-800 mb-1">{displayName}</h3>
          <p className="text-sm text-gray-500">
            Населення: {formatPopulation(district.population)}
          </p>
        </div>
        <div className="text-right">
          <div 
            className="text-3xl font-bold mb-1" 
            style={{ color: status.color }}
          >
            {district.baseAQI}
          </div>
          <div className={`text-sm font-semibold ${status.textColor}`}>
            {status.text}
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">PM2.5:</span>
          <span className="font-semibold">{district.pm25} μg/m³</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">PM10:</span>
          <span className="font-semibold">{district.pm10} μg/m³</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">NO₂:</span>
          <span className="font-semibold">{district.no2} μg/m³</span>
        </div>
      </div>

      <div className="flex gap-4 text-sm text-gray-600 pt-3 border-t">
        <div className="flex items-center gap-1">
          <Car size={16} />
          <span>Трафік: {district.traffic}%</span>
        </div>
        <div className="flex items-center gap-1">
          <Trees size={16} />
          <span>Дерева: {district.trees}%</span>
        </div>
      </div>
    </div>
  );
};

export default DistrictCard;
