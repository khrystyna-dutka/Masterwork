// src/components/AirQualityDetails/AirQualityDetails.jsx
import React from 'react';
import './AirQualityDetails.css';

const AirQualityDetails = ({ district }) => {
  const pollutants = [
    {
      name: 'PM2.5',
      value: district.pm25,
      unit: 'μg/m³',
      description: 'Дрібні частинки',
      icon: '🔬',
      thresholds: { good: 12, moderate: 35.4, unhealthy: 55.4 }
    },
    {
      name: 'PM10',
      value: district.pm10,
      unit: 'μg/m³',
      description: 'Великі частинки',
      icon: '💨',
      thresholds: { good: 54, moderate: 154, unhealthy: 254 }
    },
    {
      name: 'NO₂',
      value: district.no2,
      unit: 'μg/m³',
      description: 'Діоксид азоту',
      icon: '🚗',
      thresholds: { good: 40, moderate: 90, unhealthy: 120 }
    },
    {
      name: 'SO₂',
      value: district.so2,
      unit: 'μg/m³',
      description: 'Діоксид сірки',
      icon: '🏭',
      thresholds: { good: 20, moderate: 80, unhealthy: 250 }
    },
    {
      name: 'CO',
      value: district.co,
      unit: 'μg/m³',
      description: 'Чадний газ',
      icon: '⚠️',
      thresholds: { good: 4400, moderate: 9400, unhealthy: 12400 }
    },
    {
      name: 'O₃',
      value: district.o3,
      unit: 'μg/m³',
      description: 'Озон',
      icon: '☀️',
      thresholds: { good: 60, moderate: 100, unhealthy: 140 }
    }
  ];

  const getStatus = (value, thresholds) => {
    if (value <= thresholds.good) {
      return { label: 'Добре', color: '#10b981' };
    } else if (value <= thresholds.moderate) {
      return { label: 'Помірно', color: '#f59e0b' };
    } else if (value <= thresholds.unhealthy) {
      return { label: 'Нездорово', color: '#ef4444' };
    } else {
      return { label: 'Небезпечно', color: '#991b1b' };
    }
  };

  return (
    <div className="air-quality-details">
      <div className="details-header">
        <h3>Детальні показники для району {district.name}</h3>
        {district.timestamp && (
          <p className="update-time">
            Оновлено: {new Date(district.timestamp).toLocaleString('uk-UA')}
          </p>
        )}
        {district.source && (
          <p className="data-source">Джерело: {district.source}</p>
        )}
      </div>

      <div className="pollutants-grid">
        {pollutants.map((pollutant) => {
          const status = getStatus(pollutant.value, pollutant.thresholds);
          const percentage = Math.min(
            (pollutant.value / pollutant.thresholds.unhealthy) * 100,
            100
          );

          return (
            <div key={pollutant.name} className="pollutant-card">
              <div className="pollutant-header">
                <span className="pollutant-icon">{pollutant.icon}</span>
                <div className="pollutant-info">
                  <h4>{pollutant.name}</h4>
                  <p className="pollutant-description">{pollutant.description}</p>
                </div>
              </div>

              <div className="pollutant-value">
                <span className="value">{pollutant.value.toFixed(2)}</span>
                <span className="unit">{pollutant.unit}</span>
              </div>

              <div className="pollutant-bar">
                <div
                  className="pollutant-bar-fill"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: status.color
                  }}
                />
              </div>

              <div className="pollutant-status" style={{ color: status.color }}>
                {status.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="info-section">
        <h4>ℹ️ Інформація про показники</h4>
        <ul>
          <li><strong>PM2.5 і PM10</strong> - тверді частинки в повітрі від транспорту та промисловості</li>
          <li><strong>NO₂</strong> - утворюється при спалюванні палива в автомобілях</li>
          <li><strong>SO₂</strong> - викиди промислових підприємств</li>
          <li><strong>CO</strong> - чадний газ, утворюється при неповному згорянні</li>
          <li><strong>O₃</strong> - приземний озон, утворюється під дією сонця</li>
        </ul>
      </div>
    </div>
  );
};

export default AirQualityDetails;