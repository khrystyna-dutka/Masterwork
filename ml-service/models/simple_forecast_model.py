# ml-service/models/simple_forecast_model.py
import pandas as pd
import numpy as np

class SimpleForecastModel:
    """Проста модель прогнозування на основі персистентності + тренду"""
    
    def __init__(self, district_id):
        self.district_id = district_id
    
    def predict(self, recent_data, hours=24):
        """
        Прогноз на основі останніх даних
        
        Args:
            recent_data: DataFrame з колонками ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']
            hours: кількість годин для прогнозу
        
        Returns:
            DataFrame з прогнозами
        """
        forecasts = []
        
        # Розрахувати тренд (середня зміна за останні 6 годин)
        if len(recent_data) >= 6:
            trend = recent_data.tail(6).diff().mean()
        else:
            trend = pd.Series(0, index=recent_data.columns)
        
        # Останнє значення
        last_values = recent_data.iloc[-1]
        
        # Згенерувати прогнози
        for h in range(hours):
            # Персистентність + невеликий тренд + випадковий шум
            forecast = last_values + trend * (h + 1) * 0.3
            
            # Додати невеликий випадковий шум
            noise = np.random.normal(0, last_values * 0.05)
            forecast = forecast + noise
            
            # Обмеження (не може бути негативним)
            forecast = forecast.clip(lower=0)
            
            forecasts.append(forecast)
        
        # Створити DataFrame
        forecast_df = pd.DataFrame(forecasts)
        forecast_df.index = range(len(forecast_df))
        
        return forecast_df