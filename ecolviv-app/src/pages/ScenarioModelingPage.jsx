// ecolviv-app/src/pages/ScenarioModelingPage.jsx

import React, { useState, useEffect } from 'react';
import { 
  TreePine, 
  Car, 
  Factory, 
  Users, 
  TrendingDown, 
  TrendingUp,
  Play,
  RotateCcw,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Wind,
  ArrowRight,
  Zap,
  Target
} from 'lucide-react';
import axios from 'axios';

// Кругова діаграма для району (СВІТЛІ КОЛЬОРИ)
const DistrictPieChart = ({ data, size = 150 }) => {
  const { trees, traffic, industry } = data;
  
  const total = trees + traffic + industry;
  const normalized = {
    trees: (trees / total) * 100,
    traffic: (traffic / total) * 100,
    industry: (industry / total) * 100
  };
  
  const radius = size / 2 - 20;
  const circumference = 2 * Math.PI * radius;
  
  const treesLength = (normalized.trees / 100) * circumference;
  const trafficLength = (normalized.traffic / 100) * circumference;
  const industryLength = (normalized.industry / 100) * circumference;
  
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Фон */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="20"
        />
        
        {/* Зелені зони - світло-зелений */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#34d399"
          strokeWidth="20"
          strokeDasharray={`${treesLength} ${circumference}`}
          strokeDashoffset="0"
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        
        {/* Трафік - світло-помаранчевий/коралловий */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#fb923c"
          strokeWidth="20"
          strokeDasharray={`${trafficLength} ${circumference}`}
          strokeDashoffset={-treesLength}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        
        {/* Промзони - світло-сірий */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="20"
          strokeDasharray={`${industryLength} ${circumference}`}
          strokeDashoffset={-(treesLength + trafficLength)}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        
        {/* Внутрішній білий круг */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius - 24}
          fill="white"
        />
      </svg>
      
      {/* Текст по центру */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-gray-800">
          {total.toFixed(0)}
        </div>
        <div className="text-xs text-gray-500 uppercase font-medium">
          Баланс
        </div>
      </div>
    </div>
  );
};

// Прогрес бар (СВІТЛІ КОЛЬОРИ)
const ParameterBar = ({ icon: Icon, label, value, maxValue, color, unit = '%' }) => {
  const percentage = (value / maxValue) * 100;
  
  // Світліші версії кольорів для барів
  const lightColor = color.replace('bg-green-500', 'bg-emerald-400')
                          .replace('bg-orange-500', 'bg-orange-400')
                          .replace('bg-slate-600', 'bg-slate-400')
                          .replace('bg-blue-500', 'bg-sky-400');
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-sm font-bold text-gray-800">
          {value.toFixed(0)}{unit}
        </span>
      </div>
      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${lightColor} transition-all duration-1000 ease-out rounded-full`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
};

// Картка району
const DistrictCard = ({ districtInfo, parameters, title, isPreview = false }) => {
  if (!districtInfo) return null;
  
  const { trees, traffic, industry, residential } = parameters;
  
  return (
    <div className={`relative bg-white rounded-xl shadow-lg p-5 transition-all duration-500 border-2 ${
      isPreview ? 'border-blue-400' : 'border-gray-200'
    }`}>
      
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center justify-center gap-2">
          {isPreview && <Zap className="w-5 h-5 text-blue-500" />}
          {title}
        </h3>
      </div>
      
        <div className="flex justify-center mb-4 py-2">
        <DistrictPieChart 
            data={{ trees, traffic, industry }}
            size={150}
        />
        </div>
      
      <div className="space-y-3">
        <ParameterBar
          icon={TreePine}
          label="Зелені зони"
          value={trees}
          maxValue={100}
          color="bg-green-500"
          unit="%"
        />
        <ParameterBar
          icon={Car}
          label="Трафік"
          value={traffic}
          maxValue={100}
          color="bg-orange-500"
          unit="%"
        />
        <ParameterBar
          icon={Factory}
          label="Промзони"
          value={industry}
          maxValue={50}
          color="bg-slate-600"
          unit=" зон"
        />
        <ParameterBar
          icon={Users}
          label="Населення"
          value={residential}
          maxValue={200}
          color="bg-blue-500"
          unit="k"
        />
      </div>
    </div>
  );
};

// Слайдер з поточними значеннями
const ParameterSlider = ({ icon: Icon, label, value, onChange, min, max, step, unit, color, currentValue }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const isNegative = value < 0;
  const zeroPosition = ((0 - min) / (max - min)) * 100;
  
  // Обчислюємо нове значення
  const newValue = currentValue + value;
  const hasChange = value !== 0;
  
  return (
    <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-gray-800 block">{label}</span>
            <span className="text-xs text-gray-500">
              Зараз: <strong>{currentValue.toFixed(0)}{unit}</strong>
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <span className={`text-2xl font-bold transition-colors ${
              value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {value > 0 ? '+' : ''}{value}
            </span>
            <span className="text-sm text-gray-500">{unit}</span>
          </div>
          {hasChange && (
            <div className="text-xs text-gray-600 mt-1">
              → <strong className="text-blue-600">{newValue.toFixed(0)}{unit}</strong>
            </div>
          )}
        </div>
      </div>
      
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-3 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, 
              #e5e7eb 0%, 
              #e5e7eb ${zeroPosition}%, 
              ${isNegative ? '#ef4444' : '#22c55e'} ${zeroPosition}%, 
              ${isNegative ? '#ef4444' : '#22c55e'} ${percentage}%, 
              #e5e7eb ${percentage}%, 
              #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{min}{unit}</span>
          <span className="font-semibold">0</span>
          <span>{max}{unit}</span>
        </div>
      </div>
      
      {/* Додаткова інфо знизу */}
      {hasChange && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Результат:</span>
            <span className="font-bold text-gray-800">
              {currentValue.toFixed(0)}{unit} 
              <span className={value > 0 ? 'text-green-600' : 'text-red-600'}>
                {' '}{value > 0 ? '+' : ''}{value}{unit}
              </span>
              {' '}= <span className="text-blue-600">{newValue.toFixed(0)}{unit}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// AQI індикатор
const AQIIndicator = ({ aqi, status, change }) => {
  const getColor = (aqi) => {
    if (aqi <= 50) return 'bg-green-500';
    if (aqi <= 100) return 'bg-yellow-500';
    if (aqi <= 150) return 'bg-orange-500';
    if (aqi <= 200) return 'bg-red-500';
    if (aqi <= 300) return 'bg-purple-500';
    return 'bg-red-900';
  };
  
  // Переклад статусів на українську
  const translateStatus = (status) => {
    const translations = {
      'Good': 'Добра',
      'Moderate': 'Помірна',
      'Unhealthy for Sensitive Groups': 'Небезпечна для чутливих груп',
      'Unhealthy': 'Нездорова',
      'Very Unhealthy': 'Дуже нездорова',
      'Hazardous': 'Небезпечна'
    };
    return translations[status] || status;
  };
  
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className={`w-24 h-24 rounded-full ${getColor(aqi)} flex items-center justify-center text-white font-bold text-3xl shadow-xl`}>
          {aqi}
        </div>
        {change !== 0 && change !== undefined && (
          <div className={`absolute -top-2 -right-2 ${change < 0 ? 'bg-green-500' : 'bg-red-500'} rounded-full px-2 py-1 text-white text-xs font-bold flex items-center gap-1 shadow-lg`}>
            {change < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            {Math.abs(change)}
          </div>
        )}
      </div>
      <div>
        <div className="text-xl font-bold text-gray-800">
          {translateStatus(status)}
        </div>
        {change !== 0 && change !== undefined && (
          <div className={`text-sm ${change < 0 ? 'text-green-600' : 'text-red-600'} font-semibold`}>
            {change < 0 ? '↓ Покращення' : '↑ Погіршення'}
          </div>
        )}
      </div>
    </div>
  );
};

// Готові сценарії
const PRESET_SCENARIOS = [
  {
    id: 'green_city',
    name: '🌳 Зелене місто',
    description: 'Озеленення +25%',
    icon: TreePine,
    color: 'from-green-400 to-green-600',
    changes: { trees_change: 25, traffic_change: 0, industry_change: 0, population_change: 0 }
  },
  {
    id: 'pedestrian_zone',
    name: '🚶 Пішохідна зона',
    description: 'Трафік -40%',
    icon: Car,
    color: 'from-blue-400 to-blue-600',
    changes: { trees_change: 0, traffic_change: -40, industry_change: 0, population_change: 0 }
  },
  {
    id: 'eco_transport',
    name: '🚲 Екотранспорт',
    description: 'Зелень +15%, трафік -25%',
    icon: TreePine,
    color: 'from-teal-400 to-teal-600',
    changes: { trees_change: 15, traffic_change: -25, industry_change: 0, population_change: 0 }
  },
  {
    id: 'new_park',
    name: '🏞️ Новий парк',
    description: 'Парк +30%, трафік -15%',
    icon: TreePine,
    color: 'from-emerald-400 to-emerald-600',
    changes: { trees_change: 30, traffic_change: -15, industry_change: 0, population_change: 0 }
  },
  {
    id: 'industrial',
    name: '🏭 Промзона',
    description: '+5 заводів',
    icon: Factory,
    color: 'from-gray-500 to-gray-700',
    changes: { trees_change: 0, traffic_change: 10, industry_change: 5, population_change: 0 },
    negative: true
  },
  {
    id: 'residential',
    name: '🏘️ Новобудови',
    description: '+15k населення',
    icon: Users,
    color: 'from-indigo-400 to-indigo-600',
    changes: { trees_change: -10, traffic_change: 20, industry_change: 0, population_change: 15000 },
    negative: true
  }
];

// Головний компонент
const ScenarioModelingPage = () => {
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [districtInfo, setDistrictInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  
  const [changes, setChanges] = useState({
    trees_change: 0,
    traffic_change: 0,
    industry_change: 0,
    population_change: 0
  });
  
  const [simulationResult, setSimulationResult] = useState(null);
  
  useEffect(() => {
    const loadDistricts = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/air-quality/districts');
        setDistricts(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedDistrict(response.data.data[0].id);
        }
      } catch (error) {
        console.error('Помилка завантаження районів:', error);
      }
    };
    loadDistricts();
  }, []);
  
  useEffect(() => {
    if (!selectedDistrict) return;
    
    const loadDistrictInfo = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`http://localhost:5000/api/scenario-modeling/district/${selectedDistrict}`);
        setDistrictInfo(response.data.data);
      } catch (error) {
        console.error('Помилка завантаження інфо:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadDistrictInfo();
  }, [selectedDistrict]);
  
  const handleSimulate = async () => {
    if (!selectedDistrict || !hasChanges) return;
    
    setSimulating(true);
    try {
      const response = await axios.post('http://localhost:5000/api/scenario-modeling/simulate', {
        district_id: selectedDistrict,
        scenario_name: 'Користувацький сценарій',
        changes
      });
      
      setSimulationResult(response.data);
    } catch (error) {
      console.error('Помилка симуляції:', error);
      alert('Помилка при симуляції сценарію');
    } finally {
      setSimulating(false);
    }
  };
  
  const applyPreset = (preset) => {
    setChanges(preset.changes);
    setSimulationResult(null); // Скидаємо попередні результати
  };
  
  const handleReset = () => {
    setChanges({
      trees_change: 0,
      traffic_change: 0,
      industry_change: 0,
      population_change: 0
    });
    setSimulationResult(null);
  };
  
  if (loading || !districtInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Wind className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-xl text-gray-600 font-semibold">Завантаження даних...</p>
        </div>
      </div>
    );
  }
  
  const currentParams = {
    trees: districtInfo.current_parameters.tree_coverage_percent,
    traffic: districtInfo.current_parameters.traffic_level,
    industry: districtInfo.current_parameters.industrial_zones,
    residential: districtInfo.district.population / 1000
  };
  
  const predictedParams = {
    trees: Math.max(0, Math.min(100, currentParams.trees + changes.trees_change)),
    traffic: Math.max(0, Math.min(100, currentParams.traffic + changes.traffic_change)),
    industry: Math.max(0, currentParams.industry + changes.industry_change),
    residential: Math.max(0, (districtInfo.district.population + changes.population_change) / 1000)
  };
  
  const hasChanges = Object.values(changes).some(v => v !== 0);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl mb-4 shadow-xl">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Сценарне моделювання
          </h1>
          <p className="text-gray-600 text-lg">
            Створіть сценарій змін та оцініть вплив на якість повітря
          </p>
        </div>
        
        {/* Вибір району */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <label className="block text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Крок 1: Оберіть район
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {districts.map(district => (
              <button
                key={district.id}
                onClick={() => {
                  setSelectedDistrict(district.id);
                  handleReset();
                }}
                className={`p-4 rounded-lg border-2 transition-all font-semibold ${
                  selectedDistrict === district.id
                    ? 'border-blue-500 bg-blue-50 shadow-md scale-105'
                    : 'border-gray-200 hover:border-blue-300 bg-white'
                }`}
              >
                {district.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Готові сценарії */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Крок 2: Оберіть готовий сценарій або налаштуйте вручну
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRESET_SCENARIOS.map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`group relative overflow-hidden rounded-xl p-4 transition-all hover:scale-105 border-2 ${
                  preset.negative
                    ? 'border-red-200 hover:border-red-400 bg-red-50'
                    : 'border-green-200 hover:border-green-400 bg-green-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${preset.color} flex-shrink-0`}>
                    <preset.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-800 mb-1">
                      {preset.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {preset.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Слайдери */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Налаштування параметрів
          </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ParameterSlider
                icon={TreePine}
                label="Зелені зони"
                value={changes.trees_change}
                onChange={(v) => setChanges({...changes, trees_change: v})}
                min={-30}
                max={50}
                step={5}
                unit="%"
                color="bg-emerald-500"
                currentValue={currentParams.trees}
            />
            <ParameterSlider
                icon={Car}
                label="Трафік"
                value={changes.traffic_change}
                onChange={(v) => setChanges({...changes, traffic_change: v})}
                min={-50}
                max={50}
                step={5}
                unit="%"
                color="bg-orange-400"
                currentValue={currentParams.traffic}
            />
            <ParameterSlider
                icon={Factory}
                label="Промислові зони"
                value={changes.industry_change}
                onChange={(v) => setChanges({...changes, industry_change: v})}
                min={-10}
                max={10}
                step={1}
                unit=" зон"
                color="bg-slate-500"
                currentValue={currentParams.industry}
            />
            <ParameterSlider
                icon={Users}
                label="Населення"
                value={changes.population_change}
                onChange={(v) => setChanges({...changes, population_change: v})}
                min={-20000}
                max={20000}
                step={1000}
                unit=" осіб"
                color="bg-sky-500"
                currentValue={districtInfo.district.population}
            />
            </div>
                    
          {/* Кнопки */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={handleSimulate}
              disabled={!hasChanges || simulating}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-lg transition-all ${
                !hasChanges || simulating
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-green-500 text-white hover:shadow-xl hover:scale-105'
              }`}
            >
              <Play className="w-5 h-5" />
              {simulating ? 'Розрахунок...' : 'Крок 3: Розрахувати вплив'}
            </button>
            <button
              onClick={handleReset}
              disabled={!hasChanges && !simulationResult}
              className="px-6 py-4 rounded-xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Скинути
            </button>
          </div>
        </div>
        
        {/* РЕЗУЛЬТАТИ (показуємо тільки після симуляції) */}
        {simulationResult && (
          <div className="bg-white rounded-xl shadow-xl p-8 space-y-8">
            
            <h2 className="text-3xl font-bold text-gray-800 text-center mb-8">
              Результати моделювання
            </h2>
            
            {/* Візуалізація змін */}
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
                Порівняння станів району
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                <DistrictCard
                  districtInfo={districtInfo}
                  parameters={currentParams}
                  title="Поточний стан"
                />
                
                <div className="flex justify-center">
                  <ArrowRight className="w-12 h-12 text-blue-500" />
                </div>
                
                <DistrictCard
                  districtInfo={districtInfo}
                  parameters={predictedParams}
                  title="Прогнозований стан"
                  isPreview={true}
                />
              </div>
            </div>
            
            {/* AQI */}
            <div className="border-t pt-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
                Вплив на якість повітря
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <div className="text-center p-6 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-600 mb-4 font-semibold">Поточний AQI</div>
                  <div className="flex justify-center">
                    <AQIIndicator
                      aqi={simulationResult.current_state.air_quality.aqi}
                      status={simulationResult.current_state.air_quality.status}
                      change={0}
                    />
                  </div>
                </div>
                <div className="text-center p-6 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-600 mb-4 font-semibold">Прогнозований AQI</div>
                  <div className="flex justify-center">
                    <AQIIndicator
                      aqi={simulationResult.predicted_state.air_quality.aqi}
                      status={simulationResult.predicted_state.air_quality.status}
                      change={simulationResult.summary.aqi_change}
                    />
                  </div>
                </div>
              </div>
              
              <div className={`mt-6 p-6 rounded-xl border-2 max-w-4xl mx-auto ${
                simulationResult.summary.overall_improvement
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
              }`}>
                <div className="flex items-start gap-4">
                  {simulationResult.summary.overall_improvement ? (
                    <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                  )}
                  <div>
                    <h4 className={`font-bold text-xl mb-2 ${
                      simulationResult.summary.overall_improvement ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {simulationResult.summary.overall_improvement
                        ? '✅ Покращення якості повітря'
                        : '⚠️ Погіршення якості повітря'}
                    </h4>
                    <p className="text-gray-700">
                      Покращено <strong>{simulationResult.summary.improved_pollutants.length} з 6</strong> параметрів. 
                      Безпечних: <strong>{simulationResult.summary.safe_pollutants_count}/6</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Детальний аналіз */}
            <div className="border-t pt-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
                Детальний аналіз параметрів
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(simulationResult.impact_analysis).map(([key, data]) => (
                  <div key={key} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-gray-800 uppercase">{key}</h4>
                        <p className="text-xs text-gray-500">Поріг: {data.threshold} μg/m³</p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                        data.improvement ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {data.improvement ? '↓' : '↑'} {data.change_percent}%
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Зараз:</span>
                        <span className="font-bold">{data.current.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Прогноз:</span>
                        <span className="font-bold">{data.predicted.toFixed(2)}</span>
                      </div>
                      <div className="pt-2 border-t flex items-center gap-2 text-xs">
                        {data.will_be_safe ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-600 font-semibold">Безпечно</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-red-600 font-semibold">Перевищує норму</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        )}
        
      </div>
    </div>
  );
};

export default ScenarioModelingPage;