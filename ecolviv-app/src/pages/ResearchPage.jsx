// src/pages/ResearchPage.jsx

import React, { useState } from 'react';
import {
  Upload, Settings, PlayCircle, Database,
  Brain, BarChart, Download, ChevronRight, CheckCircle,
  AlertCircle, Zap, Layers, Activity, ChevronLeft
} from 'lucide-react';
import researchService from '../services/researchService';
import { useTranslation } from 'react-i18next';

const ResearchPage = () => {
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = useState(1);
  const [dataset, setDataset] = useState(null);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [modelConfig, setModelConfig] = useState({
    trainSplit: 70,
    testSplit: 30,
    validationSplit: 10,
    algorithm: 'xgboost',
    epochs: 200,
    batchSize: 32,
    learningRate: 0.05,
    hiddenLayers: 3,
    neurons: [128, 64, 32],
    dropoutRate: 0.2,
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
      alert(t('research.errorFileType'));
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert(t('research.errorFileSize'));
      return;
    }

    setDataset(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').slice(0, 6);
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
    if (!dataset) {
      alert(t('research.errorNoDataset'));
      return;
    }

    setTraining(true);
    setCurrentStep(3);
    setTrainingProgress({
      epoch: 0,
      total: modelConfig.epochs,
      loss: null,
      valLoss: null
    });

    try {
      console.log('🚀', t('research.consoleStartTraining'));
      const response = await researchService.trainCustomModel(dataset, modelConfig);
      console.log('✅', t('research.consoleResults'), response);

      if (response.success) {
        setTraining(false);
        setCurrentStep(4);
        setResults(response);
      } else {
        throw new Error(response.error || 'Training error');
      }
    } catch (error) {
      console.error('❌', t('research.consoleError'), error);
      setTraining(false);
      alert(
        `${t('research.errorTrainingAlert')}: ${
          error.response?.data?.error || error.message
        }`
      );
      setCurrentStep(2);
    }
  };

  // Експорт звіту в TXT
  const handleExportReport = () => {
    if (!results) return;

    let report = '='.repeat(70) + '\n';
    report += 'ЗВІТ ПРО ТРЕНУВАННЯ МОДЕЛІ\n';
    report += '='.repeat(70) + '\n\n';

    report += `Час тренування: ${results.trainingTime}\n`;
    report += `Алгоритм: ${modelConfig.algorithm.toUpperCase()}\n`;
    report += `Датасет: ${results.datasetInfo.totalRows} рядків\n`;
    report += `Train/Test: ${results.datasetInfo.trainRows}/${results.datasetInfo.testRows}\n\n`;

    report += 'МЕТРИКИ ПО ПАРАМЕТРАХ:\n';
    report += '-'.repeat(70) + '\n';

    Object.entries(results.metrics).forEach(([param, metrics]) => {
      report += `\n${param.toUpperCase()}:\n`;
      report += `  MAE:  ${metrics.mae}\n`;
      report += `  RMSE: ${metrics.rmse}\n`;
      report += `  R²:   ${metrics.r2}\n`;
    });

    report += '\n' + '='.repeat(70) + '\n';

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research_report_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Експорт метрик в CSV
  const handleExportCSV = () => {
    if (!results) return;

    let csv = 'Parameter,MAE,RMSE,R2\n';

    Object.entries(results.metrics).forEach(([param, metrics]) => {
      csv += `${param},${metrics.mae},${metrics.rmse},${metrics.r2}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Експорт конфігурації в JSON
  const handleExportConfig = () => {
    if (!results) return;

    const configData = {
      modelConfig,
      results: {
        metrics: results.metrics,
        trainingTime: results.trainingTime,
        datasetInfo: results.datasetInfo
      },
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(configData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `config_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Початок заново
  const handleStartOver = () => {
    setCurrentStep(1);
    setDataset(null);
    setDatasetInfo(null);
    setResults(null);
    setTraining(false);
    setTrainingProgress(null);
  };

  // Навігація між кроками
  const canGoToStep = (stepNum) => {
    if (stepNum === 1) return true;
    if (stepNum === 2) return dataset !== null;
    if (stepNum === 3) return false; // Не можна вручну перейти на тренування
    if (stepNum === 4) return results !== null;
    return false;
  };

  const goToStep = (stepNum) => {
    if (training) return; // Не переходимо під час тренування
    if (canGoToStep(stepNum)) {
      setCurrentStep(stepNum);
    }
  };

  // Форматування часу тренування з перекладом
  const formatTrainingTime = (timeStr) => {
    if (!timeStr) return timeStr;
    
    // Парсимо "0 хв 2 сек" або "1 хв 30 сек"
    const match = timeStr.match(/(\d+)\s*хв\s*(\d+)\s*сек/);
    
    if (match) {
      const minutes = match[1];
      const seconds = match[2];
      return `${minutes} ${t('research.timeMinShort')} ${seconds} ${t('research.timeSecShort')}`;
    }
    
    return timeStr;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Brain className="w-10 h-10 text-indigo-600" />
            {t('research.title')}
          </h1>
          <p className="text-gray-600">
            {t('research.subtitle')}
          </p>
        </div>

        {/* Прогрес-бар кроків - КЛІКАБЕЛЬНИЙ */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            {[
              { num: 1, name: t('research.steps.dataset'), icon: Database },
              { num: 2, name: t('research.steps.settings'), icon: Settings },
              { num: 3, name: t('research.steps.training'), icon: PlayCircle },
              { num: 4, name: t('research.steps.results'), icon: BarChart }
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => goToStep(step.num)}
                    disabled={!canGoToStep(step.num) || training}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      currentStep > step.num
                        ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600 hover:scale-110'
                        : currentStep === step.num
                        ? 'bg-indigo-600 text-white cursor-default'
                        : canGoToStep(step.num) && !training
                        ? 'bg-gray-200 text-gray-500 cursor-pointer hover:bg-gray-300 hover:scale-110'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {currentStep > step.num ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <step.icon className="w-6 h-6" />
                    )}
                  </button>
                  <span
                    className={`text-sm font-medium mt-2 ${
                      currentStep >= step.num
                        ? 'text-gray-800'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {idx < 3 && (
                  <div
                    className={`flex-1 h-1 mx-4 rounded transition-all ${
                      currentStep > step.num ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              {t('research.stepsHint')}
            </p>
          </div>
        </div>

        {/* Навігаційна панель */}
        {currentStep > 1 && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex items-center justify-between">
            <button
              onClick={() => {
                if (currentStep === 2) goToStep(1);
                if (currentStep === 3) goToStep(2);
                if (currentStep === 4) goToStep(2);
              }}
              disabled={training}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
              {t('research.btnBack')}
            </button>

            <div className="text-sm font-medium text-gray-600">
              {t('research.stepLabel', { current: currentStep, total: 4 })}
            </div>

            {currentStep === 4 && (
              <button
                onClick={handleStartOver}
                className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition font-medium"
              >
                {t('research.startOver')}
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {currentStep !== 4 && <div className="w-32"></div>}
          </div>
        )}

        {/* Крок 1: Завантаження датасету */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Upload className="w-7 h-7 text-indigo-600" />
                {t('research.uploadTitle')}
              </h2>

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
                    {t('research.uploadDrop')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('research.uploadMaxSize')}
                  </p>
                </label>
              </div>

              <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  {t('research.requiredColumnsTitle')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {[
                    'timestamp',
                    'pm25',
                    'pm10',
                    'no2',
                    'so2',
                    'co',
                    'o3',
                    'temperature',
                    'humidity',
                    'pressure'
                  ].map(col => (
                    <div key={col} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>{col}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800 font-medium">
                    {t('research.requiredColumnsWarningTitle')}{' '}
                    {t('research.requiredColumnsWarningText')}
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    {t('research.requiredColumnsWarningSub')}
                  </p>
                </div>

                <button
                  onClick={() => researchService.downloadTemplate()}
                  className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 hover:underline"
                >
                  <Download className="w-4 h-4" />
                  {t('research.downloadTemplate')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Крок 2: Налаштування моделі */}
        {currentStep === 2 && datasetInfo && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-green-600" />
                {t('research.datasetInfoTitle')}
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">
                    {t('research.datasetInfoFile')}
                  </span>
                  <p className="font-semibold">{datasetInfo.fileName}</p>
                </div>
                <div>
                  <span className="text-gray-600">
                    {t('research.datasetInfoSize')}
                  </span>
                  <p className="font-semibold">{datasetInfo.fileSize}</p>
                </div>
                <div>
                  <span className="text-gray-600">
                    {t('research.datasetInfoRows')}
                  </span>
                  <p className="font-semibold">{datasetInfo.rowCount}</p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <p className="text-xs text-gray-500 mb-2">
                  {t('research.datasetPreviewLabel')}
                </p>
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      {datasetInfo.headers.slice(0, 8).map((header, idx) => (
                        <th
                          key={idx}
                          className="px-3 py-2 text-left font-semibold text-gray-700"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {datasetInfo.preview.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {row.slice(0, 8).map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            className="px-3 py-2 text-gray-600"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Settings className="w-7 h-7 text-indigo-600" />
                {t('research.modelSettingsTitle')}
              </h2>

              {/* Розділення даних */}
              <div className="mb-8">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-blue-600" />
                  {t('research.splitTitle')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('research.splitTrain')}
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="90"
                      value={modelConfig.trainSplit}
                      onChange={(e) =>
                        handleConfigChange(
                          'trainSplit',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('research.splitTest')}
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="40"
                      value={modelConfig.testSplit}
                      onChange={(e) =>
                        handleConfigChange(
                          'testSplit',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('research.splitValidation')}
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="20"
                      value={modelConfig.validationSplit}
                      onChange={(e) =>
                        handleConfigChange(
                          'validationSplit',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Алгоритм */}
              <div className="mb-8">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  {t('research.algorithmTitle')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      id: 'xgboost',
                      name: t('research.algorithmXgboostName'),
                      desc: t('research.algorithmXgboostDesc')
                    },
                    {
                      id: 'lstm',
                      name: t('research.algorithmLstmName'),
                      desc: t('research.algorithmLstmDesc')
                    },
                    {
                      id: 'random_forest',
                      name: t('research.algorithmRFName'),
                      desc: t('research.algorithmRFDesc')
                    }
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
                        onChange={(e) =>
                          handleConfigChange('algorithm', e.target.value)
                        }
                        className="mt-1"
                      />
                      <div>
                        <div className="font-semibold text-gray-800">
                          {algo.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {algo.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Гіперпараметри */}
              <div className="mb-8">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  {t('research.hyperparamsTitle')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('research.hyperparamsEpochs')}
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={modelConfig.epochs}
                      onChange={(e) =>
                        handleConfigChange(
                          'epochs',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('research.hyperparamsBatchSize')}
                    </label>
                    <input
                      type="number"
                      min="8"
                      max="256"
                      step="8"
                      value={modelConfig.batchSize}
                      onChange={(e) =>
                        handleConfigChange(
                          'batchSize',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('research.hyperparamsLR')}
                    </label>
                    <input
                      type="number"
                      min="0.0001"
                      max="0.5"
                      step="0.0001"
                      value={modelConfig.learningRate}
                      onChange={(e) =>
                        handleConfigChange(
                          'learningRate',
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Архітектура LSTM */}
              {modelConfig.algorithm === 'lstm' && (
                <div className="mb-8">
                  <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-green-600" />
                    {t('research.lstmTitle')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('research.lstmHiddenLayers')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={modelConfig.hiddenLayers}
                        onChange={(e) =>
                          handleConfigChange(
                            'hiddenLayers',
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('research.lstmDropout')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="0.5"
                        step="0.05"
                        value={modelConfig.dropoutRate}
                        onChange={(e) =>
                          handleConfigChange(
                            'dropoutRate',
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('research.lstmNeuronsTitle')}
                    </label>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                      {Array.from({ length: modelConfig.hiddenLayers }).map(
                        (_, idx) => (
                          <div key={idx}>
                            <label className="text-xs text-gray-600 mb-1 block">
                              {t('research.lstmLayerLabel', {
                                index: idx + 1
                              })}
                            </label>
                            <input
                              type="number"
                              min="8"
                              max="512"
                              step="8"
                              value={modelConfig.neurons[idx] || 64}
                              onChange={(e) =>
                                handleNeuronsChange(idx, e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Feature Engineering */}
              <div className="mb-8">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-pink-600" />
                  {t('research.feTitle')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('research.feLagHours')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="48"
                      value={modelConfig.lagHours}
                      onChange={(e) =>
                        handleConfigChange(
                          'lagHours',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('research.feRollingWindow')}
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="24"
                      value={modelConfig.rollingWindow}
                      onChange={(e) =>
                        handleConfigChange(
                          'rollingWindow',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  {t('research.btnBack')}
                </button>
                <button
                  onClick={handleStartTraining}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-bold"
                >
                  <PlayCircle className="w-5 h-5" />
                  {t('research.btnStartTraining')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Крок 3: Тренування */}
        {currentStep === 3 && training && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <PlayCircle className="w-7 h-7 text-green-600 animate-pulse" />
              {t('research.trainingTitle')}
            </h2>

            <div className="flex items-center justify-center py-12">
              <div className="relative">
                <Brain className="w-24 h-24 text-indigo-600 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              </div>
            </div>

            <p className="text-center text-gray-600 mt-4">
              {t('research.trainingText', {
                rows: datasetInfo?.rowCount || '...'
              })}
            </p>
            <p className="text-center text-sm text-gray-500 mt-2">
              {t('research.trainingSubtitle', {
                algo: modelConfig.algorithm.toUpperCase(),
                epochs: modelConfig.epochs
              })}
            </p>
          </div>
        )}

        {/* Крок 4: Результати */}
        {currentStep === 4 && results && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <CheckCircle className="w-7 h-7 text-green-600" />
                {t('research.resultsTitle')}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">
                    {t('research.resultsTrainTime')}
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    {formatTrainingTime(results.trainingTime)}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">
                    {t('research.resultsFinalLoss')}
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    {results.finalLoss}
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">
                    {t('research.resultsValLoss')}
                  </div>
                  <div className="text-xl font-bold text-purple-600">
                    {results.finalValLoss}
                  </div>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">
                    {t('research.resultsAlgorithm')}
                  </div>
                  <div className="text-xl font-bold text-indigo-600">
                    {modelConfig.algorithm.toUpperCase()}
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-gray-700 mb-4">
                {t('research.metricsTitle')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {Object.entries(results.metrics).map(([param, metrics]) => (
                  <div
                    key={param}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <h4 className="font-bold text-gray-800 mb-3">
                      {param.toUpperCase()}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {t('research.metricsMae')}
                        </span>
                        <span className="font-semibold">{metrics.mae}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {t('research.metricsRmse')}
                        </span>
                        <span className="font-semibold">{metrics.rmse}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {t('research.metricsR2')}
                        </span>
                        <span
                          className={`font-semibold ${
                            metrics.r2 > 0.9
                              ? 'text-green-600'
                              : metrics.r2 > 0.8
                              ? 'text-blue-600'
                              : 'text-orange-600'
                          }`}
                        >
                          {metrics.r2}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Графіки */}
              {results.plots && (
                <div className="mb-8">
                  <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <BarChart className="w-5 h-5 text-purple-600" />
                    {t('research.plotsTitle')}
                  </h3>

                  {results.plots.actual_vs_predicted && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-700 mb-2">
                        {t('research.plotActualVsPred')}
                      </h4>
                      <img
                        src={`data:image/png;base64,${results.plots.actual_vs_predicted}`}
                        alt="Actual vs Predicted"
                        className="w-full rounded-lg border border-gray-200"
                      />
                    </div>
                  )}

                  {results.plots.scatter_plots && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-700 mb-2">
                        {t('research.plotCorrelation')}
                      </h4>
                      <img
                        src={`data:image/png;base64,${results.plots.scatter_plots}`}
                        alt="Scatter Plots"
                        className="w-full rounded-lg border border-gray-200"
                      />
                    </div>
                  )}

                  {results.plots.residuals && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-700 mb-2">
                        {t('research.plotResiduals')}
                      </h4>
                      <img
                        src={`data:image/png;base64,${results.plots.residuals}`}
                        alt="Residuals"
                        className="w-full rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Кнопки експорту та навігації */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <button
                    onClick={handleExportReport}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    <Download className="w-5 h-5" />
                    {t('research.btnExportTxt')}
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    <Download className="w-5 h-5" />
                    {t('research.btnExportCsv')}
                  </button>
                  <button
                    onClick={handleExportConfig}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    <Download className="w-5 h-5" />
                    {t('research.btnExportJson')}
                  </button>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => goToStep(2)}
                    className="flex items-center gap-2 px-6 py-3 border-2 border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition font-medium"
                  >
                    <Settings className="w-5 h-5" />
                    {t('research.btnChangeSettings')}
                  </button>
                  <button
                    onClick={() => goToStep(1)}
                    className="flex items-center gap-2 px-6 py-3 border-2 border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition font-medium"
                  >
                    <Database className="w-5 h-5" />
                    {t('research.btnUploadAnother')}
                  </button>
                  <button
                    onClick={handleStartOver}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-bold"
                  >
                    <ChevronRight className="w-5 h-5" />
                    {t('research.btnNewResearch')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchPage;
