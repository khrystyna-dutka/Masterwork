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
        
        # Базові часові ознаки
        df['hour'] = df['measured_at'].dt.hour
        df['day_of_week'] = df['measured_at'].dt.dayofweek
        df['day_of_month'] = df['measured_at'].dt.day
        df['month'] = df['measured_at'].dt.month
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        
        # Циклічні ознаки
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        df['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
        
        # ⬇️ НОВІ: Пора дня
        df['is_rush_hour'] = df['hour'].apply(
            lambda x: 1 if (7 <= x <= 9) or (17 <= x <= 19) else 0
        )
        df['is_night'] = df['hour'].apply(lambda x: 1 if (22 <= x or x <= 6) else 0)
        
        # ⬇️ НОВІ: Пора року
        df['season'] = df['month'].apply(lambda x: 
            0 if x in [12, 1, 2] else  # Зима
            1 if x in [3, 4, 5] else    # Весна
            2 if x in [6, 7, 8] else    # Літо
            3                            # Осінь
        )
        
        return df
    
    def add_lag_features(self, df, lags=[1, 2, 3, 6]):
        """Lag-ознаки"""
        df = df.copy()
        
        for param in Config.TARGET_FEATURES:
            for lag in lags:
                df[f'{param}_lag_{lag}'] = df[param].shift(lag)
        
        return df
    
    def add_rolling_features(self, df, windows=[3, 6, 12]):
        """Rolling statistics"""
        df = df.copy()
        
        for param in Config.TARGET_FEATURES:
            for window in windows:
                # Середнє
                df[f'{param}_rolling_mean_{window}'] = df[param].rolling(window=window).mean()
                # Стандартне відхилення
                df[f'{param}_rolling_std_{window}'] = df[param].rolling(window=window).std()
                # Мінімум та максимум
                df[f'{param}_rolling_min_{window}'] = df[param].rolling(window=window).min()
                df[f'{param}_rolling_max_{window}'] = df[param].rolling(window=window).max()
        
        return df
    
    def add_diff_features(self, df):
        """⬇️ НОВІ: Різниці (зміни) між періодами"""
        df = df.copy()
        
        for param in Config.TARGET_FEATURES:
            # Зміна за останню годину
            df[f'{param}_diff_1'] = df[param].diff(1)
            # Зміна за 3 години
            df[f'{param}_diff_3'] = df[param].diff(3)
            # Відсоткова зміна
            df[f'{param}_pct_change'] = df[param].pct_change()
        
        return df
    
    def add_ewm_features(self, df, spans=[3, 6, 12]):
        """⬇️ НОВІ: Експоненційно-зважене ковзне середнє"""
        df = df.copy()
        
        for param in Config.TARGET_FEATURES:
            for span in spans:
                df[f'{param}_ewm_{span}'] = df[param].ewm(span=span).mean()
        
        return df
    
    def add_interaction_features(self, df):
        """⬇️ НОВІ: Взаємодії між параметрами"""
        df = df.copy()
        
        # PM2.5 та PM10 часто корельовані
        df['pm_ratio'] = df['pm25'] / (df['pm10'] + 0.01)
        
        # Температура та вологість впливають на забруднення
        df['temp_humidity_interaction'] = df['temperature'] * df['humidity']
        
        # Швидкість вітру та забруднення
        df['wind_pm25_interaction'] = df['wind_speed'] * df['pm25']
        
        return df
    
    def prepare_features(self, df):
        """Повна підготовка features"""
        print(f"📊 Вхідні дані: {df.shape}")
        
        # 1. Часові ознаки
        df = self.add_time_features(df)
        
        # 2. Lag features
        df = self.add_lag_features(df)
        
        # 3. Rolling features
        df = self.add_rolling_features(df)
        
        # 4. Різниці
        df = self.add_diff_features(df)
        
        # 5. Експоненційно-зважені
        df = self.add_ewm_features(df)
        
        # 6. Взаємодії
        df = self.add_interaction_features(df)
        
        # 7. Заповнити NaN замість видалення
        df = df.ffill()  # Forward fill
        df = df.bfill()  # Backward fill
        df = df.dropna(how='all')  # Видалити тільки повністю порожні рядки
        
        print(f"✅ Після обробки: {df.shape}")
        
        return df

    def get_feature_columns(self):
        """Список всіх feature колонок"""
        features = []
        
        # Цільові параметри
        features.extend(Config.TARGET_FEATURES)
        
        # Погодні параметри
        features.extend(Config.WEATHER_FEATURES)
        
        # Базові часові
        features.extend([
            'hour_sin', 'hour_cos', 'day_sin', 'day_cos', 
            'month_sin', 'month_cos', 'is_weekend', 
            'is_rush_hour', 'is_night', 'season'
        ])
        
        # Lag features
        for param in Config.TARGET_FEATURES:
            for lag in [1, 2, 3, 6]:
                features.append(f'{param}_lag_{lag}')
        
        # Rolling features
        for param in Config.TARGET_FEATURES:
            for window in [3, 6, 12]:
                features.append(f'{param}_rolling_mean_{window}')
                features.append(f'{param}_rolling_std_{window}')
                features.append(f'{param}_rolling_min_{window}')
                features.append(f'{param}_rolling_max_{window}')
        
        # Diff features
        for param in Config.TARGET_FEATURES:
            features.append(f'{param}_diff_1')
            features.append(f'{param}_diff_3')
            features.append(f'{param}_pct_change')
        
        # EWM features
        for param in Config.TARGET_FEATURES:
            for span in [3, 6, 12]:
                features.append(f'{param}_ewm_{span}')
        
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
        """Повна підготовка для навчання"""
        df = self.prepare_features(df)
        self.fit_scaler(df)
        X, y = self.transform(df)
        
        print(f"✅ X shape: {X.shape}, y shape: {y.shape}")
        
        return X, y, df