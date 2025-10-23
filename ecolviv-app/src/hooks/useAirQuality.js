// ecolviv-app/src/hooks/useAirQuality.js
import { useState, useEffect } from 'react';
import { airQualityAPI } from '../services/api';
import { mockDistricts } from '../data/districts';

export const useAirQuality = () => {
  const [districts, setDistricts] = useState(mockDistricts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAirQualityData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Отримуємо список районів
      const districtsResponse = await airQualityAPI.getDistricts();
      const districtsData = districtsResponse.data.data;

      // Отримуємо поточні дані про якість повітря
      const airQualityResponse = await airQualityAPI.getCurrentAirQuality();
      const airQualityData = airQualityResponse.data.data;

      // Об'єднуємо дані
      const mergedData = districtsData.map(district => {
        const airData = airQualityData.find(aq => aq.districtId === district.id);
        
        return {
          ...district,
          baseAQI: airData?.aqi || 50,
          pm25: airData?.pm25 || 0,
          pm10: airData?.pm10 || 0,
          no2: airData?.no2 || 0,
          so2: airData?.so2 || 0,
          co: airData?.co || 0,
          o3: airData?.o3 || 0,
          traffic: 75, // Ці дані поки що статичні
          trees: 40,   // Будуть додані пізніше
          timestamp: airData?.timestamp,
          source: airData?.source
        };
      });

      setDistricts(mergedData);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Error fetching air quality data:', err);
      setError('Не вдалося завантажити дані. Використовуються тестові дані.');
      setDistricts(mockDistricts); // Fallback to mock data
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
    districts,
    loading,
    error,
    lastUpdate,
    refreshData: fetchAirQualityData
  };
};