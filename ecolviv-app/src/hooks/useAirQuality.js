// ecolviv-app/src/hooks/useAirQuality.js
import { useState, useEffect } from 'react';
import { airQualityAPI } from '../services/api';
import { districts } from '../data/districts';  // <-- ЗМІНЕНО

export const useAirQuality = () => {
  const [districtsState, setDistricts] = useState(districts);  // <-- ЗМІНЕНО назву змінної
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAirQualityData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Початок завантаження даних...');

      // Отримуємо список районів
      const districtsResponse = await airQualityAPI.getDistricts();
      const districtsData = districtsResponse.data.data;
      console.log('📋 Отримані райони з API:', districtsData);

      // Отримуємо поточні дані про якість повітря
      const airQualityResponse = await airQualityAPI.getCurrentAirQuality();
      const airQualityData = airQualityResponse.data.data;
      console.log('🌡️ Отримані дані про якість повітря:', airQualityData);

      // Об'єднуємо дані
      const mergedData = districtsData.map(district => {
        const airData = airQualityData.find(aq => aq.districtId === district.id);
        
        console.log(`📍 Район ${district.name}:`, {
          'ID району': district.id,
          'Дані району з API': district,
          'Дані про повітря': airData,
          'PM2.5': airData?.pm25,
          'PM10': airData?.pm10,
          'AQI': airData?.aqi
        });
        
        const merged = {
          ...district,
          baseAQI: airData?.aqi || 50,
          pm25: airData?.pm25 || 0,
          pm10: airData?.pm10 || 0,
          no2: airData?.no2 || 0,
          so2: airData?.so2 || 0,
          co: airData?.co || 0,
          o3: airData?.o3 || 0,
          traffic: 75,
          trees: 40,
          timestamp: airData?.timestamp,
          source: airData?.source
        };
        
        console.log(`✅ Об'єднані дані для ${district.name}:`, merged);
        
        return merged;
      });

      console.log('🔍 Фінальні об\'єднані дані (всі райони):', mergedData);

      setDistricts(mergedData);
      setLastUpdate(new Date());
      setLoading(false);
      
      console.log('✅ Дані успішно завантажені та встановлені!');
    } catch (err) {
      console.error('❌ Помилка завантаження даних:', err);
      console.error('❌ Деталі помилки:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError('Не вдалося завантажити дані. Використовуються тестові дані.');
      setDistricts(districts);  // <-- ЗМІНЕНО
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAirQualityData();

    // Оновлювати дані кожні 10 хвилин
    const interval = setInterval(fetchAirQualityData, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    districts: districtsState,  // <-- ЗМІНЕНО
    loading,
    error,
    lastUpdate,
    refreshData: fetchAirQualityData
  };
};