// src/pages/ResearchPage.jsx

import React, { useState } from 'react';
import {
  Upload, Settings, PlayCircle, TrendingUp, Database,
  Brain, BarChart, Download, ChevronRight, CheckCircle,
  AlertCircle, Zap, Layers, Activity
} from 'lucide-react';

const ResearchPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [dataset, setDataset] = useState(null);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [modelConfig, setModelConfig] = useState({
    // Розділення даних
    trainSplit: 80,
    testSplit: 20,
    validationSplit: 10,
    
    // Алгоритм
    algorithm: 'xgboost',
    
    // Гіперпараметри
    epochs: 100,
    batchSize: 32,
    learningRate: 0.001,
    
    // Архітектура (для LSTM)
    hiddenLayers: 3,
    neurons: [128, 64, 32],
    dropoutRate: 0.2,
    
    // Фічі
    lagHours: 12,
    rollingWindow: 6
  });
  const [training, setTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(null);
  const [results, setResults] = useState(null);

  // Крок 1: Завантаження датасету
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'text/csv') {
      alert('Будь ласка, завантажте CSV файл');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50 MB
      alert('Файл занадто великий. Максимум 50 MB');
      return;
    }

    setDataset(file);
    
    // Читаємо перші рядки для попереднього перегляду
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').slice(0, 6); // Перші 5 рядків + заголовок
      const headers = lines[0].split(',').map(h => h.trim());
      const preview = lines.slice(1).map(line => 
        line.split(',').map(cell => cell.trim())
      );
      
      setDatasetInfo({
        fileName: file.name,
        fileSize: (file.size / 1024).toFixed(2) + ' KB',
        headers,
        preview,
        rowCount: text.split('\n').length - 1
      });
      
      setCurrentStep(2);
    };
    reader.readAsText(file);
  };

  // Крок 2: Налаштування моделі
  const handleConfigChange = (key, value) => {
    setModelConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleNeuronsChange = (index, value) => {
    const newNeurons = [...modelConfig.neurons];
    newNeurons[index] = parseInt(value);
    setModelConfig(prev => ({ ...prev, neurons: newNeurons }));
  };

  // Крок 3: Запуск тренування
  const handleStartTraining = async () => {
    setTraining(true);
    setCurrentStep(3);
    setTrainingProgress({ epoch: 0, total: modelConfig.epochs, loss: null, valLoss: null });
    
    // TODO: Відправити запит на backend
    console.log('Starting training...', { dataset, modelConfig });
    
    // Тимчасова симуляція
    simulateTraining();
  };

  // Симуляція тренування (замінимо на реальне API)
  const simulateTraining = () => {
    let epoch = 0;
    const interval = setInterval(() => {
      epoch++;
      setTrainingProgress({
        epoch,
        total: modelConfig.epochs,
        loss: 5 - (epoch / modelConfig.epochs) * 3 + Math.random() * 0.5,
        valLoss: 5.5 - (epoch / modelConfig.epochs) * 2.8 + Math.random() * 0.6,
        eta: Math.ceil((modelConfig.epochs - epoch) * 0.5)
      });
      
      if (epoch >= modelConfig.epochs) {
        clearInterval(interval);
        setTraining(false);
        setCurrentStep(4);
        setResults({
          metrics: {
            pm25: { mae: 3.2, rmse: 5.1, r2: 0.87 },
            pm10: { mae: 4.1, rmse: 6.3, r2: 0.84 },
            no2: { mae: 2.8, rmse: 4.2, r2: 0.91 },
            so2: { mae: 2.1, rmse: 3.5, r2: 0.89 },
            co: { mae: 120, rmse: 180, r2: 0.86 },
            o3: { mae: 3.5, rmse: 5.8, r2: 0.83 }
          },
          trainingTime: '5 хв 23 сек',
          finalLoss: 1.85,
          finalValLoss: 2.12
        });
      }
    }, 50); // Швидка симуляція
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Brain className="w-10 h-10 text-indigo-600" />
            Наукові дослідження
          </h1>
          <p className="text-gray-600">
            Тренуйте власні ML моделі на вашому датасеті для прогнозування якості повітря
          </p>
        </div>

        {/* Прогрес-бар кроків */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            {[
              { num: 1, name: 'Датасет', icon: Database },
              { num: 2, name: 'Налаштування', icon: Settings },
              { num: 3, name: 'Тренування', icon: PlayCircle },
              { num: 4, name: 'Результати', icon: BarChart }
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    currentStep > step.num 
                      ? 'bg-green-500 text-white'
                      : currentStep === step.num
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {currentStep > step.num ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <step.icon className="w-6 h-6" />
                    )}
                  </div>
                  <span className={`text-sm font-medium mt-2 ${
                    currentStep >= step.num ? 'text-gray-800' : 'text-gray-400'
                  }`}>
                    {step.name}
                  </span>
                </div>
                {idx < 3 && (
                  <div className={`flex-1 h-1 mx-4 rounded transition-all ${
                    currentStep > step.num ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Крок 1: Завантаження датасету */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Upload className="w-7 h-7 text-indigo-600" />
                Завантажте ваш датасет
              </h2>

              {/* Зона завантаження */}
              <div className="border-2 border-dashed border-indigo-300 rounded-xl p-12 text-center hover:border-indigo-500 transition-all bg-indigo-50/50">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="dataset-upload"
                />
                <label htmlFor="dataset-upload" className="cursor-pointer">
                  <Upload className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-gray-700 mb-2">
                    Перетягніть CSV файл сюди або клікніть
                  </p>
                  <p className="text-sm text-gray-500">
                    Максимальний розмір: 50 MB
                  </p>
                </label>
              </div>

              {/* Інформація про формат */}
              <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  Обов'язкові колонки в датасеті:
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>timestamp</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>pm25</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>pm10</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>no2</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>so2</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>co</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>o3</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>temperature</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>humidity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>pressure</span>
                  </div>
                </div>
                
                <button className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  Завантажити приклад датасету (шаблон)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Крок 2: Налаштування моделі */}
        {currentStep === 2 && datasetInfo && (
          <div className="space-y-6">
            {/* Інформація про датасет */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-green-600" />
                Завантажений датасет
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Файл:</span>
                  <p className="font-semibold">{datasetInfo.fileName}</p>
                </div>
                <div>
                  <span className="text-gray-600">Розмір:</span>
                  <p className="font-semibold">{datasetInfo.fileSize}</p>
                </div>
                <div>
                  <span className="text-gray-600">Рядків:</span>
                  <p className="font-semibold">{datasetInfo.rowCount}</p>
                </div>
              </div>
              
              {/* Попередній перегляд */}
              <div className="mt-4 overflow-x-auto">
                <p className="text-xs text-gray-500 mb-2">Попередній перегляд (перші 5 рядків):</p>
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      {datasetInfo.headers.slice(0, 8).map((header, idx) => (
                        <th key={idx} className="px-3 py-2 text-left font-semibold text-gray-700">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {datasetInfo.preview.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {row.slice(0, 8).map((cell, cellIdx) => (
                          <td key={cellIdx} className="px-3 py-2 text-gray-600">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Налаштування моделі */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Settings className="w-7 h-7 text-indigo-600" />
                Налаштування моделі
              </h2>

              {/* Розділення даних */}
              <div className="mb-8">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-blue-600" />
                  Розділення даних
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Тренувальна вибірка (%)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="90"
                      value={modelConfig.trainSplit}
                      onChange={(e) => handleConfigChange('trainSplit', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Тестова вибірка (%)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="40"
                      value={modelConfig.testSplit}
                      onChange={(e) => handleConfigChange('testSplit', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Валідаційна вибірка (%)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="20"
                      value={modelConfig.validationSplit}
                      onChange={(e) => handleConfigChange('validationSplit', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Алгоритм */}
              <div className="mb-8">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  Алгоритм машинного навчання
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'xgboost', name: 'XGBoost', desc: 'Gradient Boosting (швидкий, точний)' },
                    { id: 'lstm', name: 'LSTM', desc: 'Рекурентна нейромережа (для часових рядів)' },
                    { id: 'random_forest', name: 'Random Forest', desc: 'Ансамбль дерев рішень' }
                  ].map(algo => (
                    <label
                      key={algo.id}
                      className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        modelConfig.algorithm === algo.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="algorithm"
                        value={algo.id}
                        checked={modelConfig.algorithm === algo.id}
                        onChange={(e) => handleConfigChange('algorithm', e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-semibold text-gray-800">{algo.name}</div>
                        <div className="text-xs text-gray-600">{algo.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Гіперпараметри */}
              <div className="mb-8">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  Гіперпараметри
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Кількість епох
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={modelConfig.epochs}
                      onChange={(e) => handleConfigChange('epochs', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch Size
                    </label>
                    <input
                      type="number"
                      min="8"
                      max="256"
                      step="8"
                      value={modelConfig.batchSize}
                      onChange={(e) => handleConfigChange('batchSize', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Learning Rate
                    </label>
                    <input
                      type="number"
                      min="0.0001"
                      max="0.1"
                      step="0.0001"
                      value={modelConfig.learningRate}
                      onChange={(e) => handleConfigChange('learningRate', parseFloat(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Архітектура (тільки для LSTM) */}
              {modelConfig.algorithm === 'lstm' && (
                <div className="mb-8">
                  <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-green-600" />
                    Архітектура нейромережі
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Кількість прихованих шарів
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={modelConfig.hiddenLayers}
                        onChange={(e) => handleConfigChange('hiddenLayers', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dropout Rate (0-0.5)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="0.5"
                        step="0.05"
                        value={modelConfig.dropoutRate}
                        onChange={(e) => handleConfigChange('dropoutRate', parseFloat(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  
                  {/* Нейрони в шарах */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Нейрони в кожному шарі
                    </label>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                      {Array.from({ length: modelConfig.hiddenLayers }).map((_, idx) => (
                        <div key={idx}>
                          <label className="text-xs text-gray-600 mb-1 block">Шар {idx + 1}</label>
                          <input
                            type="number"
                            min="8"
                            max="512"
                            step="8"
                            value={modelConfig.neurons[idx] || 64}
                            onChange={(e) => handleNeuronsChange(idx, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Feature Engineering */}
              <div className="mb-8">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-pink-600" />
                  Feature Engineering
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lag Hours (скільки годин назад)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="48"
                      value={modelConfig.lagHours}
                      onChange={(e) => handleConfigChange('lagHours', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rolling Window (ковзне вікно, годин)
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="24"
                      value={modelConfig.rollingWindow}
                      onChange={(e) => handleConfigChange('rollingWindow', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Кнопки */}
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Назад
                </button>
                <button
                  onClick={handleStartTraining}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-bold"
                >
                  <PlayCircle className="w-5 h-5" />
                  Почати тренування
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Крок 3: Тренування */}
        {currentStep === 3 && training && trainingProgress && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <PlayCircle className="w-7 h-7 text-green-600 animate-pulse" />
              Тренування моделі...
            </h2>

            {/* Прогрес-бар */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Epoch {trainingProgress.epoch} / {trainingProgress.total}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {Math.round((trainingProgress.epoch / trainingProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300"
                  style={{ width: `${(trainingProgress.epoch / trainingProgress.total) * 100}%` }}
                />
              </div>
            </div>

            {/* Метрики */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Training Loss</div>
                <div className="text-2xl font-bold text-blue-600">
                  {trainingProgress.loss?.toFixed(3) || '-'}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Validation Loss</div>
                <div className="text-2xl font-bold text-purple-600">
                  {trainingProgress.valLoss?.toFixed(3) || '-'}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Покращення</div>
                <div className="text-2xl font-bold text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-5 h-5" />
                  {trainingProgress.epoch > 0 ? '↓' : '-'}
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Залишилось</div>
                <div className="text-2xl font-bold text-orange-600">
                  ~{trainingProgress.eta || 0}с
                </div>
              </div>
            </div>

            {/* Анімація */}
            <div className="flex items-center justify-center py-12">
              <div className="relative">
                <Brain className="w-24 h-24 text-indigo-600 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Крок 4: Результати */}
        {currentStep === 4 && results && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <CheckCircle className="w-7 h-7 text-green-600" />
                Модель успішно натренована!
              </h2>

              {/* Загальна інформація */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Час тренування</div>
                  <div className="text-xl font-bold text-green-600">{results.trainingTime}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Final Loss</div>
                  <div className="text-xl font-bold text-blue-600">{results.finalLoss}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Val Loss</div>
                  <div className="text-xl font-bold text-purple-600">{results.finalValLoss}</div>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Алгоритм</div>
                  <div className="text-xl font-bold text-indigo-600">{modelConfig.algorithm.toUpperCase()}</div>
                </div>
              </div>

              {/* Метрики по параметрах */}
              <h3 className="font-bold text-gray-700 mb-4">Метрики точності по параметрах:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {Object.entries(results.metrics).map(([param, metrics]) => (
                  <div key={param} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-bold text-gray-800 mb-3">{param.toUpperCase()}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">MAE:</span>
                        <span className="font-semibold">{metrics.mae}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">RMSE:</span>
                        <span className="font-semibold">{metrics.rmse}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">R² Score:</span>
                        <span className={`font-semibold ${
                          metrics.r2 > 0.9 ? 'text-green-600' : 
                          metrics.r2 > 0.8 ? 'text-blue-600' : 'text-orange-600'
                        }`}>
                          {metrics.r2}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Кнопки експорту */}
              <div className="flex gap-4">
                <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                  <Download className="w-5 h-5" />
                  Завантажити звіт PDF
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                  <Download className="w-5 h-5" />
                  Експорт прогнозів CSV
                </button>
                <button 
                  onClick={() => {
                    setCurrentStep(1);
                    setDataset(null);
                    setDatasetInfo(null);
                    setResults(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  <ChevronRight className="w-5 h-5" />
                  Нове дослідження
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchPage;