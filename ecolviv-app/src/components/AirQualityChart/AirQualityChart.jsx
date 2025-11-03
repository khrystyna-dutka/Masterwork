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
import { airQualityAPI, forecastAPI } from '../../services/api';
import './AirQualityChart.css';

const AirQualityChart = ({ districtId, districtName }) => {
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyPeriod, setHistoryPeriod] = useState('24h');
    const [forecastPeriod, setForecastPeriod] = useState('none');
    const [selectedMetrics, setSelectedMetrics] = useState(['pm25', 'aqi']);
    const [currentTime, setCurrentTime] = useState(null);

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

            console.log('🔄 Завантаження даних...');
            console.log('  Район:', districtId);
            console.log('  Період історії:', historyPeriod);
            console.log('  Період прогнозу:', forecastPeriod);
            console.log('  URL:', `/air-quality/district/${districtId}/history?period=${historyPeriod}`);


            // 1. Завантажити історичні дані
            const historyResponse = await airQualityAPI.getDistrictHistory(districtId, historyPeriod);

            console.log('📦 Отримана відповідь:', historyResponse.data);
            console.log('📊 Кількість записів:', historyResponse.data.data?.length);

            const historyData = historyResponse.data.data || [];

            // 2. Завантажити прогнози (якщо увімкнено)
            let forecastData = [];
            if (forecastPeriod !== 'none') {
                try {
                    const hours = forecastPeriod === '12h' ? 12 : forecastPeriod === '24h' ? 24 : 48;
                    const forecastResponse = await forecastAPI.getDistrictForecast(districtId, hours);

                    if (forecastResponse.data.success) {
                        forecastData = forecastResponse.data.data.forecasts || [];
                    }
                } catch (err) {
                    console.warn('Прогнози недоступні:', err);
                }
            }

            // 3. Форматувати історичні дані
            const formattedHistory = historyData.map(item => ({
                timestamp: new Date(item.measured_at).getTime(),
                time: new Date(item.measured_at).toLocaleString('uk-UA', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                aqi: item.aqi,
                pm25: parseFloat(item.pm25),
                pm10: parseFloat(item.pm10),
                no2: parseFloat(item.no2),
                so2: parseFloat(item.so2),
                co: parseFloat(item.co) / 100,
                o3: parseFloat(item.o3),
                isForecast: false
            }));

            // 4. Форматувати прогнози
            const formattedForecast = forecastData.map(item => ({
                timestamp: new Date(item.measured_at).getTime(),
                time: new Date(item.measured_at).toLocaleString('uk-UA', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                aqi: item.aqi,
                pm25: parseFloat(item.pm25),
                pm10: parseFloat(item.pm10),
                no2: parseFloat(item.no2),
                so2: parseFloat(item.so2),
                co: parseFloat(item.co) / 100,
                o3: parseFloat(item.o3),
                isForecast: true
            }));

            // 5. Об'єднати та відсортувати
            const combined = [...formattedHistory, ...formattedForecast]
                .sort((a, b) => a.timestamp - b.timestamp);

            // 6. Визначити поточний час (останній запис історії)
            const currentTimestamp = formattedHistory.length > 0
                ? formattedHistory[formattedHistory.length - 1].timestamp
                : Date.now();

            setChartData(combined);
            setCurrentTime(currentTimestamp);
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

    if (loading) {
        return (
            <div className="air-quality-chart">
                <div className="chart-loading">
                    <div className="spinner"></div>
                    <p>Завантаження даних...</p>
                </div>
            </div>
        );
    }

    if (chartData.length === 0) {
        return (
            <div className="air-quality-chart">
                <div className="chart-no-data">
                    <p>📊 Недостатньо даних для побудови графіка</p>
                </div>
            </div>
        );
    }

    return (
        <div className="air-quality-chart">
            {/* Header */}
            <div className="chart-header">
                <h3>📈 Графік якості повітря - {districtName}</h3>
            </div>

            {/* Контроли */}
            <div className="chart-controls-grid">
                {/* Історія */}
                <div className="control-group">
                    <label className="control-label">📊 Історія (назад від зараз):</label>
                    <div className="period-selector">
                        {['1h', '12h', '24h', '48h'].map(p => (
                            <button
                                key={p}
                                className={`period-btn ${historyPeriod === p ? 'active' : ''}`}
                                onClick={() => setHistoryPeriod(p)}
                            >
                                {p === '1h' ? '1 год' : p === '12h' ? '12 год' : p === '24h' ? '24 год' : '48 год'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Прогноз */}
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

            {/* Вибір метрик */}
            <div className="metric-selector">
                <label>📊 Показати на графіку:</label>
                <div className="metric-buttons">
                    {metrics.map(metric => (
                        <button
                            key={metric.key}
                            className={`metric-btn ${selectedMetrics.includes(metric.key) ? 'active' : ''}`}
                            style={{
                                borderColor: selectedMetrics.includes(metric.key) ? metric.color : '#e5e7eb',
                                backgroundColor: selectedMetrics.includes(metric.key) ? metric.color + '20' : 'white'
                            }}
                            onClick={() => toggleMetric(metric.key)}
                        >
                            <span style={{ color: metric.color }}>●</span> {metric.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Графік */}
            <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

                    <XAxis
                        dataKey="time"
                        stroke="#6b7280"
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                    />

                    <YAxis stroke="#6b7280" />

                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '12px'
                        }}
                    />

                    <Legend />

                    {/* Вертикальна лінія "Зараз" */}
                    {currentTime && (
                        <ReferenceLine
                            x={chartData.find(d => d.timestamp === currentTime)?.time}
                            stroke="#ef4444"
                            strokeWidth={2}
                            label={({ viewBox }) => {
                                const { x, y } = viewBox;
                                return (
                                    <g>
                                        {/* Білий фон */}
                                        <rect
                                            x={x - 30}
                                            y={y + 10}
                                            width={60}
                                            height={20}
                                            fill="white"
                                            stroke="#ef4444"
                                            strokeWidth={1}
                                            rx={4}
                                        />
                                        {/* Текст */}
                                        <text
                                            x={x}
                                            y={y + 24}
                                            fill="#ef4444"
                                            fontSize={12}
                                            fontWeight="bold"
                                            textAnchor="middle"
                                        >
                                            ▶ ЗАРАЗ
                                        </text>
                                    </g>
                                );
                            }}
                        />
                    )}

                    {/* Лінії метрик */}
                    {selectedMetrics.map(metricKey => {
                        const metric = metrics.find(m => m.key === metricKey);
                        return (
                            <Line
                                key={metricKey}
                                type="monotone"
                                dataKey={metricKey}
                                stroke={metric.color}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 6 }}
                                connectNulls={true}
                                strokeDasharray={(d) => {
                                    return d?.isForecast ? "5 5" : "0";
                                }}
                            />
                        );
                    })}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default AirQualityChart;