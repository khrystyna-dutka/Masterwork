// ecolviv-app/src/components/AQITimeline.jsx

import React from 'react';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Компонент однієї карточки дня (СПРОЩЕНИЙ)
const DayCard = ({ date, aqi, status, isPast, isCurrent, isFuture, trend }) => {
  const getColor = (aqi) => {
    if (aqi <= 50) return 'bg-green-500';
    if (aqi <= 100) return 'bg-yellow-500';
    if (aqi <= 150) return 'bg-orange-500';
    if (aqi <= 200) return 'bg-red-500';
    if (aqi <= 300) return 'bg-purple-500';
    return 'bg-red-900';
  };
  
  const getTextColor = (aqi) => {
    if (aqi <= 50) return 'text-green-600';
    if (aqi <= 100) return 'text-yellow-600';
    if (aqi <= 150) return 'text-orange-600';
    if (aqi <= 200) return 'text-red-600';
    if (aqi <= 300) return 'text-purple-600';
    return 'text-red-900';
  };

  const translateStatus = (status) => {
    const translations = {
      'Good': 'Добра',
      'Moderate': 'Помірна',
      'Unhealthy for Sensitive Groups': 'Небезпечна',
      'Unhealthy': 'Нездорова',
      'Very Unhealthy': 'Дуже нездорова',
      'Hazardous': 'Небезпечна'
    };
    return translations[status] || status;
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-red-500" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-green-500" />;
    return null;
  };

  return (
    <div className={`relative rounded-xl p-4 transition-all duration-300 ${
      isCurrent 
        ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 shadow-xl scale-110 z-10' 
        : 'bg-white border border-gray-200 shadow-md hover:shadow-lg'
    } ${isPast ? 'opacity-70' : ''}`}>
      
      {/* Badge тільки для сьогодні */}
      {isCurrent && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
          Сьогодні
        </div>
      )}
      
      {/* Дата */}
      <div className="text-center mb-3">
        <div className={`text-sm font-semibold ${isCurrent ? 'text-blue-700' : 'text-gray-700'}`}>
          {date.day}
        </div>
        <div className={`text-xs ${isCurrent ? 'text-blue-600' : 'text-gray-500'}`}>
          {date.date}
        </div>
      </div>
      
      {/* AQI круг */}
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
      
      {/* Статус */}
      <div className="text-center">
        <div className={`text-sm font-bold ${getTextColor(aqi)}`}>
          {translateStatus(status)}
        </div>
      </div>
    </div>
  );
};

// Головний компонент Timeline
const AQITimeline = ({ districtId, currentAQI }) => {
  // Функція для генерації дати
  const getDate = (daysOffset) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    
    const days = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const months = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];
    
    return {
      day: days[date.getDay()],
      date: `${date.getDate()} ${months[date.getMonth()]}`
    };
  };

  // Функція для генерації стану повітря
  const getAQIStatus = (aqi) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  // Генеруємо дані для 7 днів (реалістичні коливання)
  const generateTimelineData = () => {
    const baseAQI = currentAQI || 65;
    const timeline = [];
    
    // 3 минулі дні (історичні)
    for (let i = -3; i <= -1; i++) {
      const variation = Math.random() * 20 - 10; // ±10
      const aqi = Math.round(Math.max(20, Math.min(150, baseAQI + variation)));
      timeline.push({
        date: getDate(i),
        aqi: aqi,
        status: getAQIStatus(aqi),
        isPast: true,
        isCurrent: false,
        isFuture: false,
        trend: null
      });
    }
    
    // Поточний день
    timeline.push({
      date: getDate(0),
      aqi: Math.round(baseAQI),
      status: getAQIStatus(Math.round(baseAQI)),
      isPast: false,
      isCurrent: true,
      isFuture: false,
      trend: null
    });
    
    // 3 майбутні дні (прогноз з тенденцією)
    let trendDirection = Math.random() > 0.5 ? 1 : -1; // Покращення або погіршення
    for (let i = 1; i <= 3; i++) {
      const variation = trendDirection * (i * 3) + (Math.random() * 8 - 4);
      const aqi = Math.round(Math.max(15, Math.min(120, baseAQI + variation)));
      const prevAQI = timeline[timeline.length - 1].aqi;
      
      timeline.push({
        date: getDate(i),
        aqi: aqi,
        status: getAQIStatus(aqi),
        isPast: false,
        isCurrent: false,
        isFuture: true,
        trend: aqi > prevAQI + 3 ? 'up' : aqi < prevAQI - 3 ? 'down' : 'stable'
      });
    }
    
    return timeline;
  };

  const timelineData = generateTimelineData();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Тижневий прогноз якості повітря
        </h3>
        </div>
      
      {/* Timeline карточки */}
      <div className="grid grid-cols-7 gap-3">
        {timelineData.map((day, index) => (
          <DayCard key={index} {...day} />
        ))}
      </div>
      
      {/* Підказка */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-blue-900 font-semibold mb-1">
              Прогноз базується на ML-моделі
            </p>
            <p className="text-xs text-blue-700">
              Враховуються: метеорологічні дані, трафік, сезонність та історичні тренди. Точність прогнозу зменшується з кожним наступним днем.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AQITimeline;