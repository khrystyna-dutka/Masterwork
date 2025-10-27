// ecolviv-app/src/hooks/useForecast.js
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useForecast = (districtId, hours = 24) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchForecast = async () => {
    if (!districtId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `http://localhost:5000/api/forecast/district/${districtId}?hours=${hours}`
      );

      if (response.data.success) {
        setForecast(response.data);
      }

      setLoading(false);
    } catch (err) {
      console.error('Помилка завантаження прогнозу:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [districtId, hours]);

  return { forecast, loading, error, refetch: fetchForecast };
};