// src/components/AirQualityChart/AirQualityChart.jsx
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { airQualityAPI } from '../../services/api';
import './AirQualityChart.css';

const AirQualityChart = ({ districtId, districtName }) => {
  const [historyData, setHistoryData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('24h');
  const [selectedMetrics, setSelectedMetrics] = useState(['pm25', 'pm10', 'aqi']);

  const metrics = [
    { key: 'aqi', label: 'AQI', color: '#8884d8' },
    { key: 'pm25', label: 'PM2.5', color: '#82ca9d' },
    { key: 'pm10', label: 'PM10', color: '#ffc658' },
    { key: 'no2', label: 'NO₂', color: '#ff7c7c' },
    { key: 'so2', label: 'SO₂', color: '#a4de6c' },
    { key: 'co', label: 'CO', color: '#d0ed57' },
    { key: 'o3', label: 'O₃', color: '#83a6ed' }
  ];

  useEffect(() => {
    fetchHistory();
  }, [districtId, period]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await airQualityAPI.getDistrictHistory(districtId, period);
      
      // Форматуємо дані для графіка
      const formattedData = response.data.data.map(item => ({
        time: new Date(item.measured_at).toLocaleString('uk-UA', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        aqi: item.aqi,
        pm25: parseFloat(item.pm25),
        pm10: parseFloat(item.pm10),
        no2: parseFloat(item.no2),
        so2: parseFloat(item.so2),
        co: parseFloat(item.co) / 100, // Зменшуємо CO для кращого відображення
        o3: parseFloat(item.o3)
      }));

      setHistoryData(formattedData);
      setStats(response.data.stats);
      setLoading(false);
    } catch (error) {
      console.error('Помилка завантаження історії:', error);
      setLoading(false);
    }
  };

  const toggleMetric = (metricKey) => {
    setSelectedMetrics(prev => 
      prev.includes(metricKey)
        ? prev.filter(k => k !== metricKey)
        : [...prev, metricKey]
    );
  };

  if (loading) {
    return (
      <div className="chart-loading">
        <div className="spinner"></div>
        <p>Завантаження історії даних...</p>
      </div>
    );
  }

  if (historyData.length === 0) {
    return (
      <div className="chart-no-data">
        <p>📊 Недостатньо історичних даних для побудови графіка</p>
        <p className="hint">Дані збираються щогодини. Зачекайте трохи...</p>
      </div>
    );
  }

  return (
    <div className="air-quality-chart">
      <div className="chart-header">
        <h3>📈 Історія змін якості повітря - {districtName}</h3>
        
        <div className="chart-controls">
          <div className="period-selector">
            <label>Період:</label>
            {['1h', '24h', '7d', '30d'].map(p => (
              <button
                key={p}
                className={`period-btn ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p === '1h' ? '1 год' : p === '24h' ? '24 год' : p === '7d' ? '7 днів' : '30 днів'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {stats && (
        <div className="chart-stats">
          <div className="stat-card">
            <span className="stat-label">Середній AQI:</span>
            <span className="stat-value">{parseFloat(stats.avg_aqi).toFixed(1)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Макс AQI:</span>
            <span className="stat-value">{stats.max_aqi}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Мін AQI:</span>
            <span className="stat-value">{stats.min_aqi}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Вимірювань:</span>
            <span className="stat-value">{stats.measurements_count}</span>
          </div>
        </div>
      )}

      <div className="metric-selector">
        <label>Показники:</label>
        {metrics.map(metric => (
          <button
            key={metric.key}
            className={`metric-btn ${selectedMetrics.includes(metric.key) ? 'active' : ''}`}
            style={{ 
              borderColor: selectedMetrics.includes(metric.key) ? metric.color : '#ddd',
              backgroundColor: selectedMetrics.includes(metric.key) ? `${metric.color}20` : 'white'
            }}
            onClick={() => toggleMetric(metric.key)}
          >
            {metric.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={historyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={12}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          
          {selectedMetrics.map(metricKey => {
            const metric = metrics.find(m => m.key === metricKey);
            return (
              <Line
                key={metricKey}
                type="monotone"
                dataKey={metricKey}
                stroke={metric.color}
                strokeWidth={2}
                name={metric.label}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AirQualityChart;