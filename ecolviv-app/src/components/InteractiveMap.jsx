// src/components/InteractiveMap.jsx

import React, { useState } from 'react';
import { getAQIStatus } from '../utils/helpers';
import lvivDistrictsGeoJSON from '../data/lvivDistricts.json';
import { useTranslation } from 'react-i18next';

const InteractiveMap = ({ districts, onDistrictClick, displayMode = 'baseAQI' }) => {
  const [hoveredId, setHoveredId] = useState(null);
  const { t } = useTranslation();

  // Аналіз районів для виявлення аномалій
  const analyzeDistricts = (districts) => {
    const avgAQI = districts.reduce((sum, d) => sum + d.baseAQI, 0) / districts.length;
    const stdDev = Math.sqrt(
      districts.reduce((sum, d) => sum + Math.pow(d.baseAQI - avgAQI, 2), 0) / districts.length
    );
    
    return {
      average: avgAQI,
      significantly_better: districts.filter(d => d.baseAQI < avgAQI - stdDev),
      significantly_worse: districts.filter(d => d.baseAQI > avgAQI + stdDev),
      problematic: districts.filter(d => d.traffic > 90 && d.trees < 30)
    };
  };

  const analysis = analyzeDistricts(districts);

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
  
  const latRange = bounds.maxLat - bounds.minLat;
  const lngRange = bounds.maxLng - bounds.minLng;
  const mercatorCorrection = Math.cos(((bounds.minLat + bounds.maxLat) / 2) * Math.PI / 180);
  const correctedLngRange = lngRange * mercatorCorrection;
  const aspectRatio = correctedLngRange / latRange;
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

  // Отримати значення вибраного параметра
  const getDisplayValue = (district) => {
    return district[displayMode] || 0;
  };

  // Функція для форматування значення
  const formatValue = (value, mode) => {
    if (mode === 'baseAQI') {
      return Math.round(value);
    }
    return Number(value).toFixed(2);
  };

  // Отримати статус на основі вибраного параметра (з перекладом)
  const getParameterStatus = (value) => {
    // Для AQI використовуємо стандартну функцію
    if (displayMode === 'baseAQI') {
      return getAQIStatus(value);
    }
    
    // Для PM2.5
    if (displayMode === 'pm25') {
      if (value <= 12)  return { color: '#10b981', text: t('aqi.status.good'),                 textColor: 'text-green-600' };
      if (value <= 35.4) return { color: '#f59e0b', text: t('aqi.status.moderate'),           textColor: 'text-yellow-600' };
      if (value <= 55.4) return { color: '#f97316', text: t('aqi.status.unhealthy_sensitive'), textColor: 'text-orange-600' };
      if (value <= 150.4) return { color: '#ef4444', text: t('aqi.status.unhealthy'),         textColor: 'text-red-600' };
      if (value <= 250.4) return { color: '#9333ea', text: t('aqi.status.very_unhealthy'),    textColor: 'text-purple-600' };
      return { color: '#7f1d1d', text: t('aqi.status.hazardous'),                             textColor: 'text-red-900' };
    }
    
    // Для PM10
    if (displayMode === 'pm10') {
      if (value <= 54)  return { color: '#10b981', text: t('aqi.status.good'),                 textColor: 'text-green-600' };
      if (value <= 154) return { color: '#f59e0b', text: t('aqi.status.moderate'),            textColor: 'text-yellow-600' };
      if (value <= 254) return { color: '#f97316', text: t('aqi.status.unhealthy_sensitive'),  textColor: 'text-orange-600' };
      if (value <= 354) return { color: '#ef4444', text: t('aqi.status.unhealthy'),           textColor: 'text-red-600' };
      if (value <= 424) return { color: '#9333ea', text: t('aqi.status.very_unhealthy'),      textColor: 'text-purple-600' };
      return { color: '#7f1d1d', text: t('aqi.status.hazardous'),                             textColor: 'text-red-900' };
    }
    
    // Для NO2
    if (displayMode === 'no2') {
      if (value <= 53)   return { color: '#10b981', text: t('aqi.status.good'),                textColor: 'text-green-600' };
      if (value <= 100)  return { color: '#f59e0b', text: t('aqi.status.moderate'),           textColor: 'text-yellow-600' };
      if (value <= 360)  return { color: '#f97316', text: t('aqi.status.unhealthy_sensitive'), textColor: 'text-orange-600' };
      if (value <= 649)  return { color: '#ef4444', text: t('aqi.status.unhealthy'),          textColor: 'text-red-600' };
      if (value <= 1249) return { color: '#9333ea', text: t('aqi.status.very_unhealthy'),     textColor: 'text-purple-600' };
      return { color: '#7f1d1d', text: t('aqi.status.hazardous'),                             textColor: 'text-red-900' };
    }
    
    // Для SO2
    if (displayMode === 'so2') {
      if (value <= 35)  return { color: '#10b981', text: t('aqi.status.good'),                 textColor: 'text-green-600' };
      if (value <= 75)  return { color: '#f59e0b', text: t('aqi.status.moderate'),            textColor: 'text-yellow-600' };
      if (value <= 185) return { color: '#f97316', text: t('aqi.status.unhealthy_sensitive'),  textColor: 'text-orange-600' };
      if (value <= 304) return { color: '#ef4444', text: t('aqi.status.unhealthy'),           textColor: 'text-red-600' };
      if (value <= 604) return { color: '#9333ea', text: t('aqi.status.very_unhealthy'),      textColor: 'text-purple-600' };
      return { color: '#7f1d1d', text: t('aqi.status.hazardous'),                             textColor: 'text-red-900' };
    }
    
    // Для CO
    if (displayMode === 'co') {
      if (value <= 4400)  return { color: '#10b981', text: t('aqi.status.good'),                 textColor: 'text-green-600' };
      if (value <= 9400)  return { color: '#f59e0b', text: t('aqi.status.moderate'),            textColor: 'text-yellow-600' };
      if (value <= 12400) return { color: '#f97316', text: t('aqi.status.unhealthy_sensitive'), textColor: 'text-orange-600' };
      if (value <= 15400) return { color: '#ef4444', text: t('aqi.status.unhealthy'),          textColor: 'text-red-600' };
      if (value <= 30400) return { color: '#9333ea', text: t('aqi.status.very_unhealthy'),     textColor: 'text-purple-600' };
      return { color: '#7f1d1d', text: t('aqi.status.hazardous'),                              textColor: 'text-red-900' };
    }
    
    // Для O3
    if (displayMode === 'o3') {
      if (value <= 54)  return { color: '#10b981', text: t('aqi.status.good'),                 textColor: 'text-green-600' };
      if (value <= 70)  return { color: '#f59e0b', text: t('aqi.status.moderate'),            textColor: 'text-yellow-600' };
      if (value <= 85)  return { color: '#f97316', text: t('aqi.status.unhealthy_sensitive'),  textColor: 'text-orange-600' };
      if (value <= 105) return { color: '#ef4444', text: t('aqi.status.unhealthy'),           textColor: 'text-red-600' };
      if (value <= 200) return { color: '#9333ea', text: t('aqi.status.very_unhealthy'),      textColor: 'text-purple-600' };
      return { color: '#7f1d1d', text: t('aqi.status.hazardous'),                             textColor: 'text-red-900' };
    }
    
    // Fallback
    return { color: '#6b7280', text: t('aqi.status.unknown'), textColor: 'text-gray-600' };
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

          const displayValue = getDisplayValue(districtData);
          const status = getParameterStatus(displayValue);
          const isHovered = hoveredId === feature.properties.id;
          const coords = feature.geometry.coordinates[0][0];
          const center = getPolygonCenter(coords);

          // Визначаємо чи район має відхилення (тільки для AQI)
          const isBetter = displayMode === 'baseAQI' && analysis.significantly_better.some(d => d.id === districtData.id);
          const isWorse = displayMode === 'baseAQI' && analysis.significantly_worse.some(d => d.id === districtData.id);
          const isProblematic = displayMode === 'baseAQI' && analysis.problematic.some(d => d.id === districtData.id);

          // Визначаємо стиль обводки для аномалій
          const hasAnomaly = isBetter || isWorse || isProblematic;
          const strokeColor = isHovered ? '#1e40af' : (
            isProblematic ? '#f97316' : 
            isWorse ? '#dc2626' : 
            isBetter ? '#059669' : 
            '#2563eb'
          );
          const strokeDasharray = hasAnomaly ? "10,5" : "none";
          const strokeWidth = hasAnomaly ? (isHovered ? 5 : 3) : (isHovered ? 4 : 2);

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
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
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

              {/* Текст з назвою та значенням */}
              <g 
                transform={`translate(${center[0]}, ${center[1]})`}
                className="pointer-events-none"
              >
                {/* Чорна підкладка під текст */}
                <rect
                  x="-60"
                  y="-12"
                  width="120"
                  height={isHovered ? "55" : "42"}
                  rx="8"
                  fill="rgba(0, 0, 0, 0.6)"
                  filter="url(#shadow)"
                />
                
                {/* Назва */}
                <text
                  textAnchor="middle"
                  className="font-semibold"
                  fontSize={isHovered ? "16" : "14"}
                  fill="white"
                  y="5"
                >
                  {districtData.name}
                </text>

                {/* Значення параметра */}
                <text
                  textAnchor="middle"
                  y="25"
                  className="font-bold"
                  fontSize={isHovered ? "22" : "18"}
                  fill={status.color}
                >
                  {formatValue(displayValue, displayMode)}
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
        <text
          x={width / 2}
          y={height - 20}
          textAnchor="middle"
          fontSize="14"
          fill="#64748b"
          className="font-semibold"
        >
          {t('interactiveMap.mapTitle')}
        </text>
      </svg>

      {/* Інформаційна панель при наведенні */}
      {hoveredId && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-2xl p-4 max-w-xs border-2 border-blue-500 animate-fade-in">
          {(() => {
            const district = districts.find(d => d.id === hoveredId);
            const displayValue = getDisplayValue(district);
            const status = getParameterStatus(displayValue);
            
            // Статус аномалії
            const isBetter = displayMode === 'baseAQI' && analysis.significantly_better.some(d => d.id === district.id);
            const isWorse = displayMode === 'baseAQI' && analysis.significantly_worse.some(d => d.id === district.id);
            const isProblematic = displayMode === 'baseAQI' && analysis.problematic.some(d => d.id === district.id);
            
            let anomalyKey = null;
            if (isBetter) anomalyKey = 'interactiveMap.anomaly.better';
            else if (isWorse) anomalyKey = 'interactiveMap.anomaly.worse';
            else if (isProblematic) anomalyKey = 'interactiveMap.anomaly.problem';

            const paramKey = displayMode === 'baseAQI' ? 'aqi' : displayMode;

            return (
              <>
                <h3 className="font-bold text-lg text-gray-800 mb-2">{district.name}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">
                      {t(`interactiveMap.parameter.${paramKey}`)}:
                    </span>
                    <span className="text-2xl font-bold" style={{ color: status.color }}>
                      {formatValue(displayValue, displayMode)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">
                      {t('interactiveMap.state')}:
                    </span>
                    <span className={`font-semibold ${status.textColor}`}>{status.text}</span>
                  </div>
                  
                  {/* Аномалія */}
                  {anomalyKey && (
                    <div className="pt-2 pb-2 border-t border-b text-sm font-semibold text-center">
                      {t(anomalyKey)}
                    </div>
                  )}
                  
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{t('interactiveMap.parameter.pm25')}:</span>
                      <span className="font-semibold">
                        {district.pm25.toFixed(2)} {t('interactiveMap.unit')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{t('interactiveMap.parameter.pm10')}:</span>
                      <span className="font-semibold">
                        {district.pm10.toFixed(2)} {t('interactiveMap.unit')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('interactiveMap.parameter.no2')}:</span>
                      <span className="font-semibold">
                        {district.no2.toFixed(2)} {t('interactiveMap.unit')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500 text-center">
                  {t('interactiveMap.detailsHint')}
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
