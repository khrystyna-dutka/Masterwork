# ml-service/data/preprocessor.py
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import joblib
import os
from config import Config

class DataPreprocessor:
    """Покращена підготовка даних для ML моделі"""
    
    def __init__(self, district_id):
        self.district_id = district_id
        self.scaler = MinMaxScaler()
        self.scaler_path = os.path.join(
            Config.MODEL_PATH, 
            f'scaler_district_{district_id}.pkl'
        )
    
    def add_time_features(self, df):
        """Розширені часові ознаки"""
        df = df.copy()
        df['measured_at'] = pd.to_datetime(df['measured_at'])
        
        df['hour'] = df['measured_at'].dt.hour
        df['day_of_week'] = df['measured_at'].dt.dayofweek
        df['day_of_month'] = df['measured_at'].dt.day
        df['month'] = df['measured_at'].dt.month
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        df['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
        
        df['is_rush_hour'] = df['hour'].apply(
            lambda x: 1 if (7 <= x <= 9) or (17 <= x <= 19) else 0
        )
        df['is_night'] = df['hour'].apply(lambda x: 1 if (22 <= x or x <= 6) else 0)
        
        df['season'] = df['month'].apply(lambda x: 
            0 if x in [12, 1, 2] else
            1 if x in [3, 4, 5] else
            2 if x in [6, 7, 8] else
            3
        )
        
        return df
    
    def add_lag_features(self, df, lags=[1, 2, 3, 6]):
        """Lag-ознаки (тільки минуле!)"""
        df = df.copy()
        
        for param in Config.TARGET_FEATURES:
            for lag in lags:
                df[f'{param}_lag_{lag}'] = df[param].shift(lag)
        
        return df
    
    def add_rolling_features(self, df, windows=[3, 6, 12]):
        """Rolling statistics (тільки минуле!)"""
        df = df.copy()
        
        for param in Config.TARGET_FEATURES:
            for window in windows:
                df[f'{param}_rolling_mean_{window}'] = df[param].rolling(
                    window=window, center=False, min_periods=1
                ).mean()
                
                df[f'{param}_rolling_std_{window}'] = df[param].rolling(
                    window=window, center=False, min_periods=1
                ).std()
                
                df[f'{param}_rolling_min_{window}'] = df[param].rolling(
                    window=window, center=False, min_periods=1
                ).min()
                
                df[f'{param}_rolling_max_{window}'] = df[param].rolling(
                    window=window, center=False, min_periods=1
                ).max()
        
        return df
    
    def add_diff_features(self, df):
        """Різниці між періодами (тільки минуле!)"""
        df = df.copy()
        
        for param in Config.TARGET_FEATURES:
            df[f'{param}_diff_1'] = df[param].diff(1)
            df[f'{param}_diff_3'] = df[param].diff(3)
            df[f'{param}_pct_change'] = df[param].pct_change()
        
        return df
    
    def add_ewm_features(self, df, spans=[3, 6, 12]):
        """Експоненційно-зважене ковзне середнє"""
        df = df.copy()
        
        for param in Config.TARGET_FEATURES:
            for span in spans:
                df[f'{param}_ewm_{span}'] = df[param].ewm(span=span, adjust=False).mean()
        
        return df
    
    def add_interaction_features(self, df):
        """Взаємодії використовують LAG версії!"""
        df = df.copy()
        
        if 'pm25_lag_1' in df.columns and 'pm10_lag_1' in df.columns:
            df['pm_ratio'] = df['pm25_lag_1'] / (df['pm10_lag_1'] + 0.01)
        
        df['temp_humidity_interaction'] = df['temperature'] * df['humidity']
        
        if 'pm25_lag_1' in df.columns:
            df['wind_pm25_interaction'] = df['wind_speed'] * df['pm25_lag_1']
        
        return df
    
    def prepare_features(self, df):
        """Повна підготовка features (БЕЗ DATA LEAKAGE!)"""
        print(f"📊 Вхідні дані: {df.shape}")
        
        df = self.add_time_features(df)
        df = self.add_lag_features(df)
        df = self.add_rolling_features(df)
        df = self.add_diff_features(df)
        df = self.add_ewm_features(df)
        df = self.add_interaction_features(df)
        
        df = df.ffill()
        df = df.fillna(0)
        
        print(f"✅ Після обробки: {df.shape}")
        
        return df

    def get_feature_columns(self):
        """✅ ВИПРАВЛЕНО: Менше features проти overfitting!"""
        features = []
        
        # Погодні параметри (важливі!)
        features.extend(Config.WEATHER_FEATURES)
        
        # Базові часові
        features.extend([
            'hour_sin', 'hour_cos', 'day_sin', 'day_cos', 
            'month_sin', 'month_cos', 'is_weekend', 
            'is_rush_hour', 'is_night', 'season'
        ])
        
        # ✅ Тільки найважливіші lag features
        for param in Config.TARGET_FEATURES:
            features.append(f'{param}_lag_1')  # Тільки lag_1!
        
        # ✅ Тільки короткі rolling windows
        for param in Config.TARGET_FEATURES:
            features.append(f'{param}_rolling_mean_3')  # Тільки 3-годинні
        
        # ✅ Тільки найважливіші diff features
        for param in Config.TARGET_FEATURES:
            features.append(f'{param}_diff_1')  # Тільки 1-годинна різниця
        
        # ✅ EWM тільки короткі
        for param in Config.TARGET_FEATURES:
            features.append(f'{param}_ewm_3')  # Тільки 3-годинні
        
        # Взаємодії
        features.extend([
            'pm_ratio', 
            'temp_humidity_interaction', 
            'wind_pm25_interaction'
        ])
        
        return features
    
    def fit_scaler(self, df):
        """Навчити scaler"""
        feature_cols = self.get_feature_columns()
        X = df[feature_cols].values
        
        self.scaler.fit(X)
        
        os.makedirs(Config.MODEL_PATH, exist_ok=True)
        joblib.dump(self.scaler, self.scaler_path)
        
        print(f"✅ Scaler збережено: {self.scaler_path}")
    
    def transform(self, df):
        """Нормалізувати дані"""
        feature_cols = self.get_feature_columns()
        X = df[feature_cols].values
        
        if os.path.exists(self.scaler_path):
            self.scaler = joblib.load(self.scaler_path)
        
        X_scaled = self.scaler.transform(X)
        
        return X_scaled, df[Config.TARGET_FEATURES].values
    
    def prepare_training_data(self, df):
        """Підготовка для навчання"""
        df = self.prepare_features(df)
        
        feature_cols = self.get_feature_columns()
        X = df[feature_cols].values
        y = df[Config.TARGET_FEATURES].values
        
        print(f"✅ X shape: {X.shape}, y shape: {y.shape}")
        
        return X, y, df