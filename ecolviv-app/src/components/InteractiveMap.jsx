// src/components/InteractiveMap.jsx

import React, { useState } from 'react';
import { getAQIStatus } from '../utils/helpers';
import lvivDistrictsGeoJSON from '../data/lvivDistricts.json';

const InteractiveMap = ({ districts, onDistrictClick }) => {
  const [hoveredId, setHoveredId] = useState(null);

  // Функція для отримання bounds (межі) карти
  const getBounds = () => {
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    lvivDistrictsGeoJSON.features.forEach(feature => {
      const coords = feature.geometry.coordinates[0][0];
      coords.forEach(([lng, lat]) => {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      });
    });

    return { minLat, maxLat, minLng, maxLng };
  };

  const bounds = getBounds();
  
  // Зберігаємо реальні пропорції Львова
  const latRange = bounds.maxLat - bounds.minLat;
  const lngRange = bounds.maxLng - bounds.minLng;
  
  // Використовуємо коефіцієнт для компенсації спотворення Меркатора
  // На широті Львова (~50°) 1° довготи ≈ 0.64 від 1° широти
  const mercatorCorrection = Math.cos(((bounds.minLat + bounds.maxLat) / 2) * Math.PI / 180);
  const correctedLngRange = lngRange * mercatorCorrection;
  
  // Розраховуємо реальне співвідношення сторін
  const aspectRatio = correctedLngRange / latRange;
  
  // Встановлюємо базову ширину і розраховуємо висоту відповідно до реальних пропорцій
  const baseWidth = 1000;
  const width = baseWidth;
  const height = baseWidth / aspectRatio;
  
  const padding = 40;

  // Масштабування координат до SVG
  const scaleCoord = ([lng, lat]) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (width - 2 * padding) + padding;
    const y = height - (((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * (height - 2 * padding) + padding);
    return [x, y];
  };

  // Створення SVG path для полігону
  const createPath = (coordinates) => {
    const scaledCoords = coordinates.map(scaleCoord);
    const pathData = scaledCoords.map((coord, i) => 
      `${i === 0 ? 'M' : 'L'} ${coord[0]},${coord[1]}`
    ).join(' ') + ' Z';
    return pathData;
  };

  // Знаходження центру полігону для тексту
  const getPolygonCenter = (coordinates) => {
    const scaledCoords = coordinates.map(scaleCoord);
    const sumX = scaledCoords.reduce((sum, [x]) => sum + x, 0);
    const sumY = scaledCoords.reduce((sum, [, y]) => sum + y, 0);
    return [sumX / scaledCoords.length, sumY / scaledCoords.length];
  };

  return (
    <div className="relative w-full">
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-auto bg-gradient-to-br from-blue-50 to-green-50 rounded-lg shadow-inner"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Фон карти */}
        <rect width={width} height={height} fill="url(#mapGradient)" />
        
        <defs>
          <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#e0f2fe', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#dcfce7', stopOpacity: 1 }} />
          </linearGradient>
          
          {/* Фільтри для ефектів */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3"/>
          </filter>
        </defs>

        {/* Малюємо кожен район */}
        {lvivDistrictsGeoJSON.features.map((feature) => {
          const districtData = districts.find(d => d.id === feature.properties.id);
          if (!districtData) return null;

          const status = getAQIStatus(districtData.baseAQI);
          const isHovered = hoveredId === feature.properties.id;
          const coords = feature.geometry.coordinates[0][0];
          const center = getPolygonCenter(coords);

          return (
            <g key={feature.properties.id}>
              {/* Тінь району */}
              <path
                d={createPath(coords)}
                fill="black"
                opacity="0.1"
                transform="translate(2, 2)"
              />
              
              {/* Основний полігон району */}
              <path
                d={createPath(coords)}
                fill={status.color}
                fillOpacity={isHovered ? 0.9 : 0.7}
                stroke={isHovered ? '#1e40af' : '#2563eb'}
                strokeWidth={isHovered ? 4 : 2}
                className="transition-all duration-300 cursor-pointer"
                filter={isHovered ? "url(#glow)" : "url(#shadow)"}
                onMouseEnter={() => setHoveredId(feature.properties.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onDistrictClick(districtData)}
              />

              {/* Білий контур для виразності */}
              <path
                d={createPath(coords)}
                fill="none"
                stroke="white"
                strokeWidth={1}
                strokeOpacity={0.5}
                pointerEvents="none"
              />

              {/* Текст з назвою та AQI */}
              <g 
                transform={`translate(${center[0]}, ${center[1]})`}
                className="pointer-events-none"
              >
                {/* Чорна підкладка під текст для кращої читабельності */}
                <rect
                  x="-60"
                  y="-12"
                  width="120"
                  height={isHovered ? "55" : "42"}
                  rx="8"
                  fill="rgba(0, 0, 0, 0.6)"
                  filter="url(#shadow)"
                />
                
                {/* Основний текст назви */}
                <text
                  textAnchor="middle"
                  className="font-semibold"
                  fontSize={isHovered ? "16" : "14"}
                  fill="white"
                  y="5"
                >
                  {districtData.name}
                </text>

                {/* AQI значення */}
                <text
                  textAnchor="middle"
                  y="25"
                  className="font-bold"
                  fontSize={isHovered ? "22" : "18"}
                  fill={status.color}
                >
                  {districtData.baseAQI}
                </text>

                {/* Статус */}
                {isHovered && (
                  <text
                    textAnchor="middle"
                    y="42"
                    fontSize="11"
                    fill="#d1d5db"
                    className="font-medium"
                  >
                    {status.text}
                  </text>
                )}
              </g>

              {/* Точка в центрі */}
              <circle
                cx={center[0]}
                cy={center[1]}
                r={isHovered ? 5 : 0}
                fill="white"
                stroke={status.color}
                strokeWidth="2"
                className="transition-all duration-300 pointer-events-none"
              />
            </g>
          );
        })}

        {/* Підпис карти */}
        <text x={width / 2} y={height - 20} textAnchor="middle" fontSize="14" fill="#64748b" className="font-semibold">
          Карта районів м. Львова
        </text>
      </svg>

      {/* Інформаційна панель при наведенні */}
      {hoveredId && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-2xl p-4 max-w-xs border-2 border-blue-500 animate-fade-in">
          {(() => {
            const district = districts.find(d => d.id === hoveredId);
            const status = getAQIStatus(district.baseAQI);
            return (
              <>
                <h3 className="font-bold text-lg text-gray-800 mb-2">{district.name}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">AQI:</span>
                    <span className="text-2xl font-bold" style={{ color: status.color }}>
                      {district.baseAQI}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Стан:</span>
                    <span className={`font-semibold ${status.textColor}`}>{status.text}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">PM2.5:</span>
                      <span className="font-semibold">{district.pm25} μg/m³</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">PM10:</span>
                      <span className="font-semibold">{district.pm10} μg/m³</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">NO₂:</span>
                      <span className="font-semibold">{district.no2} μg/m³</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500 text-center">
                  Натисніть для детальної інформації
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;