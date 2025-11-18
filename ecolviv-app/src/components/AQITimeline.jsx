// src/components/AQITimeline.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

// Компонент для одного дня
const DayCard = ({ date, aqi, status, isPast, isCurrent, isFuture, trend }) => {
  const { t } = useTranslation();

  const getColor = (aqi) => {
    if (aqi <= 50) return 'bg-green-500';
    if (aqi <= 100) return 'bg-yellow-500';
    if (aqi <= 150) return 'bg-orange-500';
    if (aqi <= 200) return 'bg-red-500';
    if (aqi <= 300) return 'bg-purple-600';
    return 'bg-red-900';
  };

  const getTextColor = (aqi) => {
    if (aqi <= 50) return 'text-green-700';
    if (aqi <= 100) return 'text-yellow-700';
    if (aqi <= 150) return 'text-orange-700';
    return 'text-red-700';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'Good':
        return t('aqiTimeline.status.good');
      case 'Moderate':
        return t('aqiTimeline.status.moderate');
      case 'Unhealthy for Sensitive Groups':
        return t('aqiTimeline.status.unhealthySensitive');
      case 'Unhealthy':
        return t('aqiTimeline.status.unhealthy');
      case 'Very Unhealthy':
        return t('aqiTimeline.status.veryUnhealthy');
      case 'Hazardous':
        return t('aqiTimeline.status.hazardous');
      default:
        return status;
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-red-600" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-green-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');

    const days = t('date.daysShort', { returnObjects: true });
    const months = t('date.monthsShort', { returnObjects: true });

    return {
      day: days[d.getDay()],
      date: `${d.getDate()} ${months[d.getMonth()]}`
    };
  };

  const formattedDate = formatDate(date);

  return (
    <div
      className={`relative bg-white rounded-xl p-4 shadow-md border-2 transition-all duration-300 
      ${isCurrent ? 'border-blue-500 shadow-lg scale-105' : 'border-gray-200'}
      ${isPast ? 'opacity-70' : ''}`}
    >
      {isCurrent && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
          {t('aqiTimeline.todayBadge')}
        </div>
      )}
      
      <div className="text-center mb-3">
        <div className={`text-sm font-semibold ${isCurrent ? 'text-blue-700' : 'text-gray-700'}`}>
          {formattedDate.day}
        </div>
        <div className={`text-xs ${isCurrent ? 'text-blue-600' : 'text-gray-500'}`}>
          {formattedDate.date}
        </div>
      </div>
      
      <div className="flex justify-center mb-3">
        <div className={`w-20 h-20 rounded-full ${getColor(aqi)} flex flex-col items-center justify-center text-white shadow-lg relative`}>
          <div className="text-2xl font-bold">{aqi}</div>
          {trend && getTrendIcon() && (
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
              {getTrendIcon()}
            </div>
          )}
        </div>
      </div>
      
      <div className="text-center">
        <div className={`text-sm font-bold ${getTextColor(aqi)}`}>
          {getStatusLabel(status)}
        </div>
      </div>
    </div>
  );
};

// Головний компонент Timeline
const AQITimeline = ({ districtId }) => {
  const { t } = useTranslation();

  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getAQIStatus = (aqi) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  useEffect(() => {
    const loadWeeklyForecast = async () => {
      if (!districtId) return;

      setLoading(true);
      setError(null);

      try {
        console.log(`📅 Завантаження тижневого прогнозу для району ${districtId}...`);
        
        const response = await axios.get(`http://localhost:5000/api/forecast/weekly/${districtId}`);
        
        console.log('📦 Отримано відповідь:', response.data);

        if (response.data.success) {
          // Додаємо статус та тренди
          const timeline = response.data.timeline.map((day, index, arr) => {
            let trend = null;
            if (index > 0) {
              const diff = day.aqi - arr[index - 1].aqi;
              trend = diff > 3 ? 'up' : diff < -3 ? 'down' : 'stable';
            }
            
            return {
              ...day,
              status: getAQIStatus(day.aqi),
              trend
            };
          });

          console.log('✅ Timeline сформовано:', timeline);
          setTimelineData(timeline);
        }
      } catch (err) {
        console.error('❌ Помилка завантаження тижневого прогнозу:', err);
        setError(t('aqiTimeline.errorLoad'));
      } finally {
        setLoading(false);
      }
    };

    loadWeeklyForecast();
  }, [districtId, t]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-8 text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (timelineData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-8 text-gray-600">
          {t('aqiTimeline.noData')}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          {t('aqiTimeline.title')}
        </h3>
      </div>
      
      <div className="grid grid-cols-7 gap-3">
        {timelineData.map((day, index) => (
          <DayCard key={index} {...day} />
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-blue-900 font-semibold mb-1">
              {t('aqiTimeline.infoTitle')}
            </p>
            <p className="text-xs text-blue-700">
              {t('aqiTimeline.infoText')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AQITimeline;
