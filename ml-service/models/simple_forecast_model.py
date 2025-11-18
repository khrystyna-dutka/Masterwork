# ml-service/models/simple_forecast_model.py
import pandas as pd
import numpy as np

class SimpleForecastModel:
    def __init__(self, district_id):
        self.district_id = district_id
    
    def predict(self, recent_data, hours=24):
        forecasts = []

        if len(recent_data) >= 6:
            trend = recent_data.tail(6).diff().mean()
        else:
            trend = pd.Series(0, index=recent_data.columns)

        last_values = recent_data.iloc[-1]

        for h in range(hours):
            forecast = last_values + trend * (h + 1) * 0.3

            noise = np.random.normal(0, last_values * 0.05)
            forecast = forecast + noise

            forecast = forecast.clip(lower=0)
            
            forecasts.append(forecast)

        forecast_df = pd.DataFrame(forecasts)
        forecast_df.index = range(len(forecast_df))
        
        return forecast_df