// src/components/AirQualityChart/AirQualityChart.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { airQualityAPI } from '../../services/api';
import axios from 'axios';
import './AirQualityChart.css';

const AirQualityChart = ({ districtId, districtName }) => {
  const [historyData, setHistoryData] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyPeriod, setHistoryPeriod] = useState('24h');
  const [forecastPeriod, setForecastPeriod] = useState('none'); // ⚡ По замовчуванню вимкнено
  const [selectedMetrics, setSelectedMetrics] = useState(['pm25', 'aqi']);

  const metrics = [
    { key: 'aqi', label: 'AQI', color: '#3b82f6' },
    { key: 'pm25', label: 'PM2.5', color: '#10b981' },
    { key: 'pm10', label: 'PM10', color: '#f97316' },
    { key: 'no2', label: 'NO₂', color: '#ef4444' },
    { key: 'so2', label: 'SO₂', color: '#8b5cf6' },
    { key: 'co', label: 'CO', color: '#6366f1' },
    { key: 'o3', label: 'O₃', color: '#06b6d4' }
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Отримати історичні дані
      const historyResponse = await airQualityAPI.getDistrictHistory(districtId, historyPeriod);
      
      let formattedHistory = historyResponse.data.data.map(item => ({
        time: new Date(item.measured_at).toLocaleString('uk-UA', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        }),
        timestamp: new Date(item.measured_at).getTime(),
        // Історичні дані
        aqi: item.aqi,
        pm25: parseFloat(item.pm25),
        pm10: parseFloat(item.pm10),
        no2: parseFloat(item.no2),
        so2: parseFloat(item.so2),
        co: parseFloat(item.co) / 100,
        o3: parseFloat(item.o3),
        // Прогнозні поля = null для історії
        aqi_forecast: null,
        pm25_forecast: null,
        pm10_forecast: null,
        no2_forecast: null,
        so2_forecast: null,
        co_forecast: null,
        o3_forecast: null,
        isForecast: false
      }));

      // 🎯 ПРОПОРЦІЙНІСТЬ: Обмежити історію до довжини прогнозу
      if (forecastPeriod !== 'none') {
        const forecastHours = forecastPeriod === '12h' ? 12 : forecastPeriod === '24h' ? 24 : 48;
        // Взяти останні N годин історії (де N = довжина прогнозу)
        formattedHistory = formattedHistory.slice(-forecastHours);
      }

      setHistoryData(formattedHistory);
      setStats(historyResponse.data.stats);

      // Отримати прогноз якщо потрібно
      if (forecastPeriod !== 'none') {
        try {
          const hours = forecastPeriod === '12h' ? 12 : forecastPeriod === '24h' ? 24 : 48;
          const forecastResponse = await axios.get(
            `http://localhost:5001/api/forecast/${districtId}?hours=${hours}`
          );

          if (forecastResponse.data.success) {
            const now = new Date();
            
            const formattedForecast = forecastResponse.data.forecasts
              .filter(item => new Date(item.measured_at) > now)
              .map(item => ({
                time: new Date(item.measured_at).toLocaleString('uk-UA', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                timestamp: new Date(item.measured_at).getTime(),
                // Історичні поля = null для прогнозу
                aqi: null,
                pm25: null,
                pm10: null,
                no2: null,
                so2: null,
                co: null,
                o3: null,
                // Прогнозні дані
                aqi_forecast: item.aqi,
                pm25_forecast: parseFloat(item.pm25),
                pm10_forecast: parseFloat(item.pm10),
                no2_forecast: parseFloat(item.no2),
                so2_forecast: parseFloat(item.so2),
                co_forecast: parseFloat(item.co) / 100,
                o3_forecast: parseFloat(item.o3),
                isForecast: true
              }));

            setForecastData(formattedForecast);
          }
        } catch (error) {
          console.error('Помилка завантаження прогнозу:', error);
          setForecastData([]);
        }
      } else {
        setForecastData([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Помилка завантаження даних:', error);
      setLoading(false);
    }
  }, [districtId, historyPeriod, forecastPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleMetric = (metricKey) => {
    setSelectedMetrics(prev => 
      prev.includes(metricKey)
        ? prev.filter(k => k !== metricKey)
        : [...prev, metricKey]
    );
  };

  // 📊 Визначити інтервал для підписів осі X
  const getTickInterval = () => {
    const totalPoints = historyData.length + forecastData.length;
    
    if (historyPeriod === '1h') {
      // Для 1 години - кожні 15 хв (4 точки на годину, показуємо кожну)
      return 0; // 0 = показати всі
    } else if (historyPeriod === '12h') {
      // Для 12 годин - кожна година (12 точок)
      return Math.floor(totalPoints / 12) || 1;
    } else if (historyPeriod === '24h' || historyPeriod === '48h') {
      // Для 24-48 годин - кожні 2-3 години
      return Math.floor(totalPoints / 12) || 1;
    } else {
      // Для 7d, 30d - кожен день
      return Math.floor(totalPoints / 10) || 1;
    }
  };

  if (loading) {
    return (
      <div className="chart-loading">
        <div className="spinner"></div>
        <p>Завантаження даних...</p>
      </div>
    );
  }

  if (historyData.length === 0) {
    return (
      <div className="chart-no-data">
        <p>📊 Недостатньо даних для побудови графіка</p>
        <p className="hint">Дані збираються щогодини. Зачекайте трохи...</p>
      </div>
    );
  }

  // Об'єднати історичні дані та прогноз
  const combinedData = [...historyData, ...forecastData].sort((a, b) => a.timestamp - b.timestamp);

  // Знайти останню точку історії
  const lastHistoryPoint = historyData.length > 0 ? historyData[historyData.length - 1] : null;

  return (
    <div className="air-quality-chart">
      <div className="chart-header">
        <h3>📈 Графік якості повітря - {districtName}</h3>
        
        <div className="chart-controls-grid">
          {/* Селектор історії */}
          <div className="control-group">
            <label className="control-label">📊 Історія (назад від зараз):</label>
            <div className="period-selector">
              {['1h', '12h', '24h', '48h', '7d', '30d'].map(p => (
                <button
                  key={p}
                  className={`period-btn ${historyPeriod === p ? 'active' : ''}`}
                  onClick={() => setHistoryPeriod(p)}
                >
                  {p === '1h' ? '1 год' : p === '12h' ? '12 год' : p === '24h' ? '24 год' : p === '48h' ? '48 год' : p === '7d' ? '7 днів' : '30 днів'}
                </button>
              ))}
            </div>
          </div>

          {/* Селектор прогнозу */}
          <div className="control-group">
            <label className="control-label">🔮 Прогноз (вперед від зараз):</label>
            <div className="period-selector">
              {['none', '12h', '24h', '48h'].map(p => (
                <button
                  key={p}
                  className={`period-btn ${forecastPeriod === p ? 'active' : ''}`}
                  onClick={() => setForecastPeriod(p)}
                >
                  {p === 'none' ? 'Вимкнено' : p === '12h' ? '12 год' : p === '24h' ? '24 год' : '48 год'}
                </button>
              ))}
            </div>
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
            <span className="stat-value">{stats.total_records || 0}</span>
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

      <ResponsiveContainer width="100%" height={450}>
        <LineChart data={combinedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="time" 
            angle={-45}
            textAnchor="end"
            height={100}
            fontSize={11}
            stroke="#6b7280"
            interval={getTickInterval()}
          />
          <YAxis stroke="#6b7280" />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
            labelFormatter={(label) => `Час: ${label}`}
            formatter={(value, name) => {
              if (value === null) return [null, null];
              const metricKey = name.replace('_forecast', '');
              const metric = metrics.find(m => m.key === metricKey);
              return [value.toFixed(2), metric?.label || name];
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            payload={
              selectedMetrics.map(metricKey => {
                const metric = metrics.find(m => m.key === metricKey);
                return {
                  value: metricKey,
                  type: 'line',
                  color: metric.color
                };
              })
            }
            formatter={(value) => {
              const metric = metrics.find(m => m.key === value);
              return metric?.label || value;
            }}
            iconType="line"
          />
          
          {/* Лінія розділення між історією та прогнозом */}
          {forecastPeriod !== 'none' && forecastData.length > 0 && lastHistoryPoint && (
            <ReferenceLine 
              x={lastHistoryPoint.time} 
              stroke="#ef4444" 
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ 
                value: '⏰ Зараз', 
                position: 'top', 
                fill: '#ef4444',
                fontWeight: 'bold',
                fontSize: 14
              }}
            />
          )}
          
          {/* Малюємо лінії для кожної метрики */}
          {selectedMetrics.map(metricKey => {
            const metric = metrics.find(m => m.key === metricKey);
            return (
              <React.Fragment key={metricKey}>
                {/* Історична лінія (суцільна) */}
                <Line
                  type="monotone"
                  dataKey={metricKey}
                  stroke={metric.color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
                
                {/* Прогнозна лінія (пунктирна) */}
                {forecastPeriod !== 'none' && forecastData.length > 0 && (
                  <Line
                    type="monotone"
                    dataKey={`${metricKey}_forecast`}
                    stroke={metric.color}
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                )}
              </React.Fragment>
            );
          })}
        </LineChart>
      </ResponsiveContainer>

      {forecastPeriod !== 'none' && forecastData.length > 0 && (
        <div className="forecast-info">
          <p>
            💡 <strong>Прогноз:</strong> пунктирні лінії праворуч від червоної межі "Зараз". 
            Для пропорційності показано останні {forecastPeriod === '12h' ? '12' : forecastPeriod === '24h' ? '24' : '48'} годин історії.
            Впевненість: 85-70%.
          </p>
        </div>
      )}
    </div>
  );
};

export default AirQualityChart;