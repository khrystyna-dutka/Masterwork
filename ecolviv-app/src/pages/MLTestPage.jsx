// src/pages/MLTestPage.jsx

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Target, Activity, PlayCircle, Info, TrendingUp, CheckCircle,
  AlertCircle, Database, Calendar
} from 'lucide-react';
import mlTestService from '../services/mlTestService';
import { districts } from '../data/districts';
import { getLocalizedDistrictName } from '../utils/districts';
import { useTranslation } from 'react-i18next';

const MLTestPage = () => {
  const { t, i18n } = useTranslation();

  const [selectedDistrict, setSelectedDistrict] = useState(1);
  const [selectedParameter, setSelectedParameter] = useState('aqi');
  const [days, setDays] = useState(30);
  const [testSize, setTestSize] = useState(20);

  const [dataInfo, setDataInfo] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(true);

  const parameters = [
    { key: 'aqi', label: t('mlTest.parameterAQI'), unit: '' },
    { key: 'pm25', label: 'PM2.5', unit: 'μg/m³' },
    { key: 'pm10', label: 'PM10', unit: 'μg/m³' },
    { key: 'no2', label: 'NO₂', unit: 'μg/m³' },
    { key: 'so2', label: 'SO₂', unit: 'μg/m³' },
    { key: 'co', label: 'CO', unit: 'μg/m³' },
    { key: 'o3', label: 'O₃', unit: 'μg/m³' }
  ];

  // Завантажити інформацію про дані при зміні району
  useEffect(() => {
    loadDataInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrict]);

  const loadDataInfo = async () => {
    setLoadingInfo(true);
    try {
      const info = await mlTestService.getDataInfo(selectedDistrict);
      setDataInfo(info);
    } catch (error) {
      console.error(t('mlTest.errorLoadInfo'), error);
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleRunTest = async () => {
    setLoading(true);
    setTestResults(null);

    try {
      console.log('🧪', t('mlTest.consoleStartTest'), { selectedDistrict, days, testSize });
      const results = await mlTestService.runTest(selectedDistrict, days, testSize);
      console.log('✅', t('mlTest.consoleResults'), results);
      setTestResults(results);
    } catch (error) {
      console.error('❌', t('mlTest.errorTestConsole'), error);
      alert(
        `${t('mlTest.errorTestAlert')}: ${error.response?.data?.error || error.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  // Підготовка даних для графіка
  const chartData =
    testResults?.comparison_data?.map(item => ({
      time: new Date(item.timestamp).toLocaleString(
        i18n.language === 'en' ? 'en-GB' : 'uk-UA',
        {
          month: 'short',
          day: 'numeric',
          hour: '2-digit'
        }
      ),
      actual: item.actual[selectedParameter],
      predicted: item.predicted[selectedParameter]
    })) || [];

  const currentMetrics = testResults?.metrics?.[selectedParameter];

  const getMetricColor = (metric, value) => {
    if (metric === 'r2') {
      if (value >= 0.9) return 'text-green-600';
      if (value >= 0.7) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (metric === 'accuracy') {
      if (value >= 80) return 'text-green-600';
      if (value >= 60) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (metric === 'mape') {
      if (value <= 10) return 'text-green-600';
      if (value <= 25) return 'text-yellow-600';
      return 'text-red-600';
    }
    return 'text-gray-700';
  };

  const metricsDisplay = [
    {
      key: 'mae',
      label: 'MAE',
      description: t('mlTest.metricMaeDescription'),
      tooltip: t('mlTest.metricMaeTooltip')
    },
    {
      key: 'rmse',
      label: 'RMSE',
      description: t('mlTest.metricRmseDescription'),
      tooltip: t('mlTest.metricRmseTooltip')
    },
    {
      key: 'mape',
      label: 'MAPE',
      description: t('mlTest.metricMapeDescription'),
      tooltip: t('mlTest.metricMapeTooltip'),
      suffix: '%'
    },
    {
      key: 'r2',
      label: 'R²',
      description: t('mlTest.metricR2Description'),
      tooltip: t('mlTest.metricR2Tooltip')
    },
    {
      key: 'accuracy',
      label: t('mlTest.metricAccuracyLabel'),
      description: t('mlTest.metricAccuracyDescription'),
      tooltip: t('mlTest.metricAccuracyTooltip'),
      suffix: '%'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Target className="w-10 h-10 text-blue-600" />
            {t('mlTest.title')}
          </h1>
          <p className="text-gray-600">
            {t('mlTest.subtitle')}
          </p>
        </div>

        {/* Панель налаштувань */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Вибір району */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Database className="w-4 h-4 inline mr-1" />
                {t('mlTest.fieldDistrict')}
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {districts.map(district => (
                  <option key={district.id} value={district.id}>
                    {getLocalizedDistrictName(district, i18n)}
                  </option>
                ))}
              </select>
            </div>

            {/* Кількість днів */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                {t('mlTest.fieldDays')}
              </label>
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={7}>{t('mlTest.days7')}</option>
                <option value={14}>{t('mlTest.days14')}</option>
                <option value={21}>{t('mlTest.days21')}</option>
                <option value={30}>{t('mlTest.days30')}</option>
                <option value={60}>{t('mlTest.days60')}</option>
              </select>
            </div>

            {/* Test Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TrendingUp className="w-4 h-4 inline mr-1" />
                {t('mlTest.fieldTestSize')}
              </label>
              <select
                value={testSize}
                onChange={(e) => setTestSize(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10% Test / 90% Train</option>
                <option value={20}>20% Test / 80% Train</option>
                <option value={30}>30% Test / 70% Train</option>
              </select>
            </div>

            {/* Кнопка запуску */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('mlTest.fieldAction')}
              </label>
              <button
                onClick={handleRunTest}
                disabled={loading || !dataInfo || dataInfo.total_records < 100}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlayCircle className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? t('mlTest.btnTesting') : t('mlTest.btnRunTest')}
              </button>
            </div>
          </div>

          {/* Інформація про дані */}
          {dataInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    {t('mlTest.dataInfoTitle')}{' '}
                    {getLocalizedDistrictName(districts.find(d => d.id === selectedDistrict), i18n)}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-blue-700">
                    <div>
                      <span className="font-medium">
                        {t('mlTest.dataInfoRecords')}
                      </span>{' '}
                      {dataInfo.total_records}
                    </div>
                    <div>
                      <span className="font-medium">
                        {t('mlTest.dataInfoDays')}
                      </span>{' '}
                      {dataInfo.days_with_data}
                    </div>
                    <div>
                      <span className="font-medium">
                        {t('mlTest.dataInfoFrom')}
                      </span>{' '}
                      {dataInfo.first_date
                        ? new Date(dataInfo.first_date).toLocaleDateString(
                          i18n.language === 'en' ? 'en-GB' : 'uk-UA'
                        )
                        : '-'}
                    </div>
                    <div>
                      <span className="font-medium">
                        {t('mlTest.dataInfoTo')}
                      </span>{' '}
                      {dataInfo.last_date
                        ? new Date(dataInfo.last_date).toLocaleDateString(
                          i18n.language === 'en' ? 'en-GB' : 'uk-UA'
                        )
                        : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Результати тестування */}
        {loading && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 mb-2">
              {t('mlTest.loadingTitle')}
            </p>
            <p className="text-sm text-gray-500">
              {t('mlTest.loadingText')}
            </p>
          </div>
        )}

        {!loading && testResults && (
          <>
            {/* Загальна інформація про тест */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-md p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      {t('mlTest.summaryTotal')}
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {testResults.data_info.total_samples}
                    </p>
                  </div>
                  <Database className="w-8 h-8 text-blue-600 opacity-20" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      {t('mlTest.summaryTrain')}
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {testResults.data_info.train_samples}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600 opacity-20" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      {t('mlTest.summaryTest')}
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {testResults.data_info.test_samples}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-purple-600 opacity-20" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      {t('mlTest.summaryFeatures')}
                    </p>
                    <p className="text-2xl font-bold text-orange-600">
                      {testResults.data_info.features_count}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-orange-600 opacity-20" />
                </div>
              </div>
            </div>

            {/* Вибір параметру для відображення */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('mlTest.parameterSelectLabel')}
              </label>
              <select
                value={selectedParameter}
                onChange={(e) => setSelectedParameter(e.target.value)}
                className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {parameters.map(param => (
                  <option key={param.key} value={param.key}>
                    {param.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Метрики точності */}
            {currentMetrics && (
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6 text-blue-600" />
                  {t('mlTest.metricsTitle')}{' '}
                  {parameters.find(p => p.key === selectedParameter)?.label}
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  {metricsDisplay.map(metric => (
                    <div
                      key={metric.key}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200"
                      title={metric.tooltip}
                    >
                      <p className="text-xs text-gray-600 mb-1">
                        {metric.label}
                      </p>
                      <p
                        className={`text-3xl font-bold ${getMetricColor(
                          metric.key,
                          currentMetrics[metric.key]
                        )}`}
                      >
                        {currentMetrics[metric.key]?.toFixed(
                          metric.key === 'r2' ? 3 : 1
                        )}
                        {metric.suffix || ''}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {metric.description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">
                      {t('mlTest.avgActual')}{' '}
                    </span>
                    <span className="font-semibold text-green-600">
                      {currentMetrics.avgActual}{' '}
                      {parameters.find(p => p.key === selectedParameter)?.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">
                      {t('mlTest.avgPredicted')}{' '}
                    </span>
                    <span className="font-semibold text-blue-600">
                      {currentMetrics.avgPredicted}{' '}
                      {parameters.find(p => p.key === selectedParameter)?.unit}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">
                      {t('mlTest.samplesLabel')}{' '}
                    </span>
                    <span className="font-semibold text-gray-800">
                      {currentMetrics.samples}{' '}
                      {t('mlTest.samplesPoints')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Графік порівняння */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {t('mlTest.chartTitle')}{' '}
                {parameters.find(p => p.key === selectedParameter)?.label}
              </h2>

              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    label={{
                      value:
                        parameters.find(p => p.key === selectedParameter)?.unit ||
                        '',
                      angle: -90,
                      position: 'insideLeft'
                    }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#10b981"
                    strokeWidth={2}
                    name={t('mlTest.lineActual')}
                    dot={{ fill: '#10b981', r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name={t('mlTest.linePredicted')}
                    dot={{ fill: '#3b82f6', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>

              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>{t('mlTest.explanationTitle')}</strong>{' '}
                  {t('mlTest.explanationText')}
                </p>
              </div>
            </div>
          </>
        )}

        {!loading && !testResults && dataInfo && dataInfo.total_records >= 100 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {t('mlTest.readyTitle')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('mlTest.readyText')}
            </p>
          </div>
        )}

        {!loading && !testResults && dataInfo && dataInfo.total_records < 100 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {t('mlTest.notEnoughTitle')}
            </h3>
            <p className="text-gray-600">
              {t('mlTest.notEnoughText')}{' '}
              {dataInfo.total_records}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MLTestPage;
