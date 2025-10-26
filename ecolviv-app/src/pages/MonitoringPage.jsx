// src/pages/MonitoringPage.jsx
import React, { useState } from 'react';
import AirQualityDetails from '../components/AirQualityDetails/AirQualityDetails';
import AirQualityChart from '../components/AirQualityChart/AirQualityChart';
import './MonitoringPage.css';

const MonitoringPage = ({ districts, selectedDistrict, setSelectedDistrict }) => {
  const [timeRange, setTimeRange] = useState('24h');

  const getAQIColor = (aqi) => {
    if (aqi <= 50) return '#10b981';
    if (aqi <= 100) return '#f59e0b';
    if (aqi <= 150) return '#f97316';
    if (aqi <= 200) return '#ef4444';
    if (aqi <= 300) return '#9333ea';
    return '#7f1d1d';
  };

  const getAQIStatus = (aqi) => {
    if (aqi <= 50) return 'Добра';
    if (aqi <= 100) return 'Помірна';
    if (aqi <= 150) return 'Нездорова для чутливих';
    if (aqi <= 200) return 'Нездорова';
    if (aqi <= 300) return 'Дуже нездорова';
    return 'Небезпечна';
  };

  return (
    <div className="monitoring-page">
      <div className="monitoring-container">
        <header className="monitoring-header">
          <h1>📊 Моніторинг якості повітря</h1>
          <p className="monitoring-subtitle">
            Детальна інформація про стан повітря в районах Львова
          </p>
        </header>

        {/* Фільтри */}
        <div className="monitoring-filters">
          <div className="filter-group">
            <label>Часовий діапазон:</label>
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="filter-select"
            >
              <option value="1h">Остання година</option>
              <option value="24h">Останні 24 години</option>
              <option value="7d">Останні 7 днів</option>
              <option value="30d">Останні 30 днів</option>
            </select>
          </div>
        </div>

        {/* Список районів */}
        <div className="districts-list">
          <h2>Оберіть район для перегляду деталей</h2>
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
                      <span className="detail-label">PM2.5:</span>
                      <span className="detail-value">{district.pm25?.toFixed(1) || 'N/A'} μg/m³</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">PM10:</span>
                      <span className="detail-value">{district.pm10?.toFixed(1) || 'N/A'} μg/m³</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Детальна інформація про вибраний район */}
        {selectedDistrict && (
          <div className="selected-district-details">
            <AirQualityDetails district={selectedDistrict} />

            {/* ДОДАЙ ГРАФІК */}
            <AirQualityChart 
              districtId={selectedDistrict.id} 
              districtName={selectedDistrict.name}
            />

          </div>
        )}

        {!selectedDistrict && (
          <div className="no-selection">
            <p>👆 Оберіть район зі списку вище, щоб побачити детальну інформацію</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringPage;