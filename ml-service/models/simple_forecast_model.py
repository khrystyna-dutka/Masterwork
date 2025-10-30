# ml-service/models/simple_forecast_model.py
import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

class SimpleForecastModel:
    """
    Проста модель прогнозування для стабільних даних
    Використовує комбінацію Persistence + Trend
    """
    
    def __init__(self, district_id):
        self.district_id = district_id
    
    def predict(self, historical_data, hours=24):
        """
        Зробити прогноз на N годин вперед
        
        Args:
            historical_data: DataFrame з колонками pm25, pm10, no2, so2, co, o3
            hours: кількість годин для прогнозу
        
        Returns:
            DataFrame з прогнозами
        """
        forecasts = []
        
        # Параметри для прогнозування
        params = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']
        
        # Останні 24 значення для розрахунку тренду
        recent_data = historical_data.tail(24)
        
        for hour in range(1, hours + 1):
            forecast_row = {}
            
            for param in params:
                # Метод 1: Persistence (останнє значення)
                last_value = historical_data[param].iloc[-1]
                
                # Метод 2: Середнє за останні 24 години
                recent_mean = recent_data[param].mean()
                
                # Метод 3: Тренд (лінійна регресія)
                if len(recent_data) > 5:
                    x = np.arange(len(recent_data))
                    y = recent_data[param].values
                    # Простий лінійний тренд
                    trend = np.polyfit(x, y, 1)[0]
                else:
                    trend = 0
                
                # Комбінований прогноз з вагами
                # 60% останнє значення + 30% середнє + 10% тренд
                forecast_value = (
                    0.6 * last_value + 
                    0.3 * recent_mean + 
                    0.1 * (last_value + trend * hour)
                )
                
                # Додаємо невелику випадкову варіацію (±2%)
                noise = np.random.normal(0, 0.02 * forecast_value)
                forecast_value += noise
                
                # Обмежуємо мінімальними значеннями
                forecast_value = max(0, forecast_value)
                
                forecast_row[param] = forecast_value
            
            forecasts.append(forecast_row)
        
        return pd.DataFrame(forecasts)
    
    def predict_with_confidence(self, historical_data, hours=24):
        """
        Прогноз з довірчими інтервалами
        """
        base_forecast = self.predict(historical_data, hours)
        
        # Розраховуємо стандартне відхилення за останні 24 години
        recent_data = historical_data.tail(24)
        
        forecasts = []
        for idx, row in base_forecast.iterrows():
            forecast_point = dict(row)
            
            # Додаємо довірчі інтервали для кожного параметра
            for param in ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']:
                std = recent_data[param].std()
                forecast_point[f'{param}_lower'] = max(0, row[param] - 1.96 * std)
                forecast_point[f'{param}_upper'] = row[param] + 1.96 * std
            
            forecasts.append(forecast_point)
        
        return pd.DataFrame(forecasts)