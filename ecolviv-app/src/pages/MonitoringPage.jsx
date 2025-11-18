// src/pages/MonitoringPage.jsx
import React from 'react';
import AirQualityDetails from '../components/AirQualityDetails/AirQualityDetails';
import AirQualityChart from '../components/AirQualityChart/AirQualityChart';
import './MonitoringPage.css';
import AQITimeline from '../components/AQITimeline';
import { Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// 🔧 Додай setCurrentPage в пропси
const MonitoringPage = ({ districts, selectedDistrict, setSelectedDistrict, setCurrentPage }) => {
  const { t } = useTranslation();

  const getAQIColor = (aqi) => {
    if (aqi <= 50) return '#10b981';
    if (aqi <= 100) return '#f59e0b';
    if (aqi <= 150) return '#f97316';
    if (aqi <= 200) return '#ef4444';
    if (aqi <= 300) return '#9333ea';
    return '#7f1d1d';
  };

  const getAQIStatus = (aqi) => {
    if (aqi <= 50) return t('monitoring.aqiGood');
    if (aqi <= 100) return t('monitoring.aqiModerate');
    if (aqi <= 150) return t('monitoring.aqiUnhealthySensitive');
    if (aqi <= 200) return t('monitoring.aqiUnhealthy');
    if (aqi <= 300) return t('monitoring.aqiVeryUnhealthy');
    return t('monitoring.aqiHazardous');
  };

  return (
    <div className="monitoring-page">
      <div className="monitoring-container">
        <header className="monitoring-header">
          <div className="flex items-center justify-between">
            <div>
              <h1>📊 {t('monitoring.title')}</h1>
              <p className="monitoring-subtitle">
                {t('monitoring.subtitle')}
              </p>
            </div>

            {/* 🔧 Кнопка для тестування ML */}
            <button
              onClick={() => setCurrentPage('ml-test')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 hover:text-gray-800 transition-all flex items-center gap-2 border border-gray-300"
              title={t('monitoring.mlTestButtonTitle')}
            >
              <Wrench className="w-4 h-4" />
              <span className="hidden md:inline">{t('monitoring.mlTestButton')}</span>
            </button>
          </div>
        </header>

        {/* Список районів */}
        <div className="districts-list">
          <h2>{t('monitoring.selectDistrictTitle')}</h2>
          <div className="districts-grid">
            {districts.map((district) => {
              const aqi = district.baseAQI || 50;
              const color = getAQIColor(aqi);
              const status = getAQIStatus(aqi);

              return (
                <div
                  key={district.id}
                  className={`district-card ${selectedDistrict?.id === district.id ? 'active' : ''}`}
                  onClick={() => setSelectedDistrict(district)}
                  style={{ borderLeftColor: color }}
                >
                  <div className="district-card-header">
                    <h3>{district.name}</h3>
                    <div
                      className="aqi-badge"
                      style={{ backgroundColor: color }}
                    >
                      {aqi}
                    </div>
                  </div>

                  <div className="district-card-status" style={{ color }}>
                    {status}
                  </div>

                  <div className="district-card-details">
                    <div className="detail-item">
                      <span className="detail-label">{t('monitoring.pm25Label')}</span>
                      <span className="detail-value">
                        {district.pm25?.toFixed(1) || 'N/A'} μg/m³
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">{t('monitoring.pm10Label')}</span>
                      <span className="detail-value">
                        {district.pm10?.toFixed(1) || 'N/A'} μg/m³
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline тижневого прогнозу */}
        {selectedDistrict && (
          <div className="mb-8">
            <AQITimeline
              districtId={selectedDistrict.id}
              currentAQI={selectedDistrict.baseAQI}
            />
          </div>
        )}

        {/* Детальна інформація про вибраний район */}
        {selectedDistrict && (
          <div className="selected-district-details">
            <AirQualityDetails district={selectedDistrict} />
            <AirQualityChart
              districtId={selectedDistrict.id}
              districtName={selectedDistrict.name}
            />
          </div>
        )}

        {!selectedDistrict && (
          <div className="no-selection">
            <p>{t('monitoring.noSelectionText')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringPage;
