// src/pages/MonitoringPage.jsx

import React, { useState } from 'react';
import { BarChart3, Car, Trees } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAQIStatus, calculateScenarioAQI, generateForecast } from '../utils/helpers';

const MonitoringPage = ({ districts, selectedDistrict, setSelectedDistrict }) => {
  const [trafficLevel, setTrafficLevel] = useState(100);
  const [treeLevel, setTreeLevel] = useState(100);
  const [forecastHours, setForecastHours] = useState(24);

  const currentDistrict = selectedDistrict || districts[0];
  const currentAQI = calculateScenarioAQI(currentDistrict, trafficLevel, treeLevel);
  const aqiStatus = getAQIStatus(currentAQI);
  const forecastData = generateForecast(currentDistrict, forecastHours, currentAQI);
  const baselineAQI = currentDistrict.baseAQI;
  const improvement = ((baselineAQI - currentAQI) / baselineAQI * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <BarChart3 className="text-blue-600" />
          Моніторинг та аналітика
        </h1>

        {/* Вибір району */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <label className="text-sm text-gray-600 mb-2 block">Оберіть район:</label>
          <select 
            className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            value={currentDistrict.id}
            onChange={(e) => setSelectedDistrict(districts.find(d => d.id === parseInt(e.target.value)))}
          >
            {districts.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Поточний стан */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Поточний стан: {currentDistrict.name}
          </h2>
          
          <div className="text-center py-6 mb-4 rounded-xl" style={{ backgroundColor: aqiStatus.color + '20' }}>
            <div className="text-5xl font-bold mb-2" style={{ color: aqiStatus.color }}>
              {Math.round(currentAQI)}
            </div>
            <div className={`text-lg font-semibold ${aqiStatus.textColor}`}>
              {aqiStatus.text}
            </div>
            <div className="text-sm text-gray-600 mt-2">Індекс якості повітря (AQI)</div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded text-center">
              <div className="text-sm text-gray-600">PM2.5</div>
              <div className="text-xl font-bold">{currentDistrict.pm25} μg/m³</div>
            </div>
            <div className="bg-gray-50 p-3 rounded text-center">
              <div className="text-sm text-gray-600">PM10</div>
              <div className="text-xl font-bold">{currentDistrict.pm10} μg/m³</div>
            </div>
            <div className="bg-gray-50 p-3 rounded text-center">
              <div className="text-sm text-gray-600">NO₂</div>
              <div className="text-xl font-bold">{currentDistrict.no2} μg/m³</div>
            </div>
          </div>
        </div>

        {/* Сценарне моделювання */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Сценарне моделювання для {currentDistrict.name}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Трафік */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-gray-700 font-semibold">
                  <Car className="text-gray-600" size={20} />
                  Щільність трафіку
                </label>
                <span className="text-2xl font-bold text-blue-600">{trafficLevel}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={trafficLevel}
                onChange={(e) => setTrafficLevel(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Без трафіку</span>
                <span>Норма</span>
                <span>Подвійний трафік</span>
              </div>
            </div>

            {/* Дерева */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-gray-700 font-semibold">
                  <Trees className="text-green-600" size={20} />
                  Зелені насадження
                </label>
                <span className="text-2xl font-bold text-green-600">{treeLevel}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={treeLevel}
                onChange={(e) => setTreeLevel(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Без озеленення</span>
                <span>Норма</span>
                <span>Подвійне озеленення</span>
              </div>
            </div>
          </div>

          {/* Результати сценарію */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Базовий AQI</div>
                <div className="text-3xl font-bold text-gray-700">{Math.round(baselineAQI)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Сценарний AQI</div>
                <div className="text-3xl font-bold" style={{ color: aqiStatus.color }}>
                  {Math.round(currentAQI)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Зміна</div>
                <div className={`text-3xl font-bold ${improvement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {improvement > 0 ? '+' : ''}{improvement}%
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-gray-700">
                {improvement > 10 && <span className="text-green-600 font-semibold">🌟 Відмінне покращення! </span>}
                {improvement > 0 && improvement <= 10 && <span className="text-lime-600 font-semibold">✓ Помірне покращення. </span>}
                {improvement >= -10 && improvement <= 0 && <span className="text-yellow-600 font-semibold">⚠ Незначне погіршення. </span>}
                {improvement < -10 && <span className="text-red-600 font-semibold">⚠ Значне погіршення! </span>}
                {improvement > 0 
                  ? `Якість повітря покращиться на ${Math.abs(improvement)}% при таких параметрах.`
                  : improvement < 0
                  ? `Якість повітря погіршиться на ${Math.abs(improvement)}% при таких параметрах.`
                  : `Якість повітря залишиться на тому ж рівні.`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Прогноз */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Прогноз якості повітря</h2>
            <select 
              className="p-2 border rounded bg-white"
              value={forecastHours}
              onChange={(e) => setForecastHours(parseInt(e.target.value))}
            >
              <option value={12}>12 годин</option>
              <option value={24}>24 години</option>
              <option value={48}>48 годин</option>
              <option value={72}>72 години</option>
            </select>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="aqi" stroke="#3b82f6" strokeWidth={3} name="AQI" />
              <Line type="monotone" dataKey="pm25" stroke="#10b981" strokeWidth={2} name="PM2.5" />
              <Line type="monotone" dataKey="no2" stroke="#f59e0b" strokeWidth={2} name="NO₂" />
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Середній прогнозний AQI</div>
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(forecastData.reduce((sum, d) => sum + d.aqi, 0) / forecastData.length)}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Пік забруднення</div>
              <div className="text-2xl font-bold text-orange-600">
                {Math.max(...forecastData.map(d => d.aqi))}
              </div>
              <div className="text-xs text-gray-500">
                о {forecastData.find(d => d.aqi === Math.max(...forecastData.map(d => d.aqi)))?.hour}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Найкраща якість</div>
              <div className="text-2xl font-bold text-green-600">
                {Math.min(...forecastData.map(d => d.aqi))}
              </div>
              <div className="text-xs text-gray-500">
                о {forecastData.find(d => d.aqi === Math.min(...forecastData.map(d => d.aqi)))?.hour}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringPage;