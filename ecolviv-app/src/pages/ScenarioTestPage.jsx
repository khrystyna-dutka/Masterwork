// src/pages/ScenarioTestPage.jsx

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, AreaChart, ReferenceLine
} from 'recharts';
import {
  Flame, Factory, Cloud, Wind, CheckCircle, Play, AlertTriangle,
  TrendingUp, TrendingDown, Clock, Target, ArrowDown, ArrowUp
} from 'lucide-react';
import scenarioTestService from '../services/scenarioTestService';
import { districts } from '../data/districts';

const ScenarioTestPage = () => {
  const [selectedDistrict, setSelectedDistrict] = useState(1);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingScenarios, setLoadingScenarios] = useState(true);
  const [selectedParameter, setSelectedParameter] = useState('pm25');

  const scenarioIcons = {
    fire: Flame,
    industrial_accident: Factory,
    heavy_fog: Cloud,
    strong_wind: Wind,
    normal: CheckCircle
  };

  const parameterInfo = {
    pm25: { label: 'PM2.5', unit: 'μg/m³', color: '#ef4444', safe: 12, moderate: 35, critical: 150 },
    pm10: { label: 'PM10', unit: 'μg/m³', color: '#f97316', safe: 50, moderate: 154, critical: 254 },
    no2: { label: 'NO₂', unit: 'μg/m³', color: '#3b82f6', safe: 40, moderate: 100, critical: 200 },
    so2: { label: 'SO₂', unit: 'μg/m³', color: '#8b5cf6', safe: 20, moderate: 75, critical: 185 },
    co: { label: 'CO', unit: 'μg/m³', color: '#06b6d4', safe: 4000, moderate: 9400, critical: 15400 },
    o3: { label: 'O₃', unit: 'μg/m³', color: '#10b981', safe: 100, moderate: 140, critical: 200 }
  };

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    setLoadingScenarios(true);
    try {
      const result = await scenarioTestService.getScenarios();
      if (result.success) {
        setScenarios(result.scenarios);
        if (result.scenarios.length > 0) {
          setSelectedScenario(result.scenarios[0]);
        }
      }
    } catch (error) {
      console.error('Error loading scenarios:', error);
      alert('Помилка завантаження сценаріїв');
    } finally {
      setLoadingScenarios(false);
    }
  };

  const handleRunTest = async () => {
    if (!selectedScenario) return;

    setLoading(true);
    setTestResults(null);

    try {
      const result = await scenarioTestService.runTest(
        selectedDistrict,
        selectedScenario.id
      );
      setTestResults(result);
    } catch (error) {
      console.error('❌ Помилка:', error);
      alert('Помилка тестування: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Підготовка даних для графіка вибраного параметра
  const chartData = testResults?.forecasts?.map(item => ({
    hour: `+${item.hour}г`,
    value: item[selectedParameter],
    hourNum: item.hour
  })) || [];

  const currentParam = parameterInfo[selectedParameter];

  const getStatusColor = (status) => {
    if (status === 'safe') return 'text-green-600 bg-green-100';
    if (status === 'moderate') return 'text-yellow-600 bg-yellow-100';
    if (status === 'high') return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusLabel = (status) => {
    if (status === 'safe') return 'Безпечно';
    if (status === 'moderate') return 'Помірно';
    if (status === 'high') return 'Підвищено';
    return 'Критично';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Flame className="w-10 h-10 text-orange-600" />
            Сценарне тестування
          </h1>
          <p className="text-gray-600">
            Перевірка реакції ML моделі на екстремальні умови та час відновлення
          </p>
        </div>

        {/* Панель налаштувань */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Район для тестування
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                {districts.map(district => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дія
              </label>
              <button
                onClick={handleRunTest}
                disabled={loading || !selectedScenario}
                className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Тестування...' : 'Запустити тест'}
              </button>
            </div>
          </div>
        </div>

        {/* Вибір сценарію */}
        {!loadingScenarios && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {scenarios.map((scenario) => {
              const IconComponent = scenarioIcons[scenario.id] || AlertTriangle;
              const isSelected = selectedScenario?.id === scenario.id;

              return (
                <div
                  key={scenario.id}
                  onClick={() => setSelectedScenario(scenario)}
                  className={`bg-white rounded-xl shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${isSelected ? 'ring-2 ring-orange-500 shadow-orange-200' : ''
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${isSelected ? 'bg-orange-100' : 'bg-gray-100'
                      }`}>
                      <IconComponent className={`w-8 h-8 ${isSelected ? 'text-orange-600' : 'text-gray-600'
                        }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800 mb-1">
                        {scenario.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {scenario.description}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">PM2.5:</span>
                          <span className="ml-1 font-semibold">
                            {scenario.values.pm25} μg/m³
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">PM10:</span>
                          <span className="ml-1 font-semibold">
                            {scenario.values.pm10} μg/m³
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Індикатор завантаження */}
        {loading && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center mb-6">
            <Flame className="w-16 h-16 text-orange-600 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600 mb-2">Симуляція екстремального сценарію...</p>
            <p className="text-sm text-gray-500">
              Модель аналізує ситуацію та прогнозує наступні 12 годин
            </p>
          </div>
        )}

        {/* Результати */}
        {!loading && testResults && (
          <>
            {/* Початкові умови */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
                Початкові умови: {selectedScenario?.name}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(testResults.initial_values).slice(0, 8).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 uppercase">{key}</p>
                    <p className="text-lg font-bold text-gray-800">
                      {typeof value === 'number' ? value.toFixed(1) : value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Аналіз по параметрах */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-600" />
                Аналіз відновлення по параметрах
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {testResults.analysis.parameter_details &&
                  Object.entries(testResults.analysis.parameter_details).map(([param, details]) => (
                    <div key={param} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-gray-800">{parameterInfo[param].label}</h3>
                          <p className="text-xs text-gray-500">{parameterInfo[param].unit}</p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(details.final_status)
                          }`}>
                          {getStatusLabel(details.final_status)}
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Початок:</span>
                          <span className="font-bold text-gray-800">{details.initial_value}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Через 12 год:</span>
                          <span className="font-bold text-gray-800">{details.final_value}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Зміна:</span>
                          <span className={`font-bold flex items-center gap-1 ${details.percent_change < 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {details.percent_change < 0 ? (
                              <ArrowDown className="w-4 h-4" />
                            ) : (
                              <ArrowUp className="w-4 h-4" />
                            )}
                            {Math.abs(details.percent_change)}%
                          </span>
                        </div>
                      </div>

                      {details.will_be_safe && (
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <div className="flex items-center gap-2 text-sm text-green-800">
                            <Clock className="w-4 h-4" />
                            <span>Безпечно через {details.time_to_safe} год</span>
                          </div>
                        </div>
                      )}

                      {!details.will_be_safe && details.will_be_moderate && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                          <div className="flex items-center gap-2 text-sm text-yellow-800">
                            <Clock className="w-4 h-4" />
                            <span>Помірно через {details.time_to_moderate} год</span>
                          </div>
                        </div>
                      )}

                      {!details.will_be_safe && !details.will_be_moderate && (
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <p className="text-xs text-red-800">
                            Не досягне безпечного рівня
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {/* Загальний висновок */}
              <div className={`mt-6 p-4 rounded-lg border-2 ${testResults.analysis.all_parameters_safe
                  ? 'bg-green-50 border-green-300'
                  : 'bg-orange-50 border-orange-300'
                }`}>
                {testResults.analysis.all_parameters_safe ? (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-bold text-green-900 mb-1">
                        ✅ Повне відновлення за {testResults.analysis.slowest_recovery_time} годин
                      </p>
                      <p className="text-sm text-green-800">
                        Всі параметри досягнуть безпечного рівня.
                        Найповільніше відновлюється: {parameterInfo[testResults.analysis.slowest_recovery]?.label}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-bold text-orange-900 mb-1">
                        ⚠️ Часткове відновлення
                      </p>
                      <p className="text-sm text-orange-800">
                        Не всі параметри досягнуть безпечного рівня за 12 годин.
                        Рекомендується залишатися в приміщенні та використовувати захист.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Вибір параметра для графіка */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Параметр для детального перегляду
              </label>
              <select
                value={selectedParameter}
                onChange={(e) => setSelectedParameter(e.target.value)}
                className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                {Object.entries(parameterInfo).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label} ({info.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* Графік вибраного параметра з зонами */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Динаміка: {currentParam.label} з зонами безпеки
              </h2>

              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={currentParam.color} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={currentParam.color} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis label={{ value: currentParam.unit, angle: -90, position: 'insideLeft' }} />
                  <Tooltip />

                  {/* Зони безпеки */}
                  <ReferenceLine
                    y={currentParam.safe}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    label={{ value: 'Безпечно', position: 'right', fill: '#10b981', fontSize: 12 }}
                  />
                  <ReferenceLine
                    y={currentParam.moderate}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    label={{ value: 'Помірно', position: 'right', fill: '#f59e0b', fontSize: 12 }}
                  />
                  <ReferenceLine
                    y={currentParam.critical}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{ value: 'Критично', position: 'right', fill: '#ef4444', fontSize: 12 }}
                  />

                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={currentParam.color}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>

              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Безпечно: &lt; {currentParam.safe}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Помірно: {currentParam.safe}-{currentParam.moderate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Критично: &gt; {currentParam.critical}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Початковий стан */}
        {!loading && !testResults && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Flame className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Оберіть сценарій і запустіть тест
            </h3>
            <p className="text-gray-600">
              Модель спрогнозує як зміниться якість повітря в екстремальних умовах
              та коли кожен параметр досягне безпечного рівня
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioTestPage;
