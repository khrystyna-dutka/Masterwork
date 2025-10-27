import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from datetime import datetime, timedelta
import joblib
import os
from config import Config

class DataPreprocessor:
    """Клас для підготовки даних для ML моделі"""
    
    def __init__(self, district_id):
        self.district_id = district_id
        self.scaler = MinMaxScaler()
        self.scaler_path = os.path.join(Config.MODEL_PATH, f'scaler_district_{district_id}.pkl')
    
    def prepare_data(self, df):
        """
        Підготувати дані для тренування/прогнозування
        
        Args:
            df: DataFrame з історичними даними
        
        Returns:
            Очищені та нормалізовані дані
        """
        if df.empty:
            print("⚠️ DataFrame порожній")
            return None
        
        # Копіюємо DataFrame
        data = df.copy()
        
        # Перетворюємо measured_at в datetime
        data['measured_at'] = pd.to_datetime(data['measured_at'])
        
        # Сортуємо по часу
        data = data.sort_values('measured_at')
        
        # Додаємо часові ознаки
        data['hour'] = data['measured_at'].dt.hour
        data['day_of_week'] = data['measured_at'].dt.dayofweek
        data['month'] = data['measured_at'].dt.month
        data['day_of_year'] = data['measured_at'].dt.dayofyear
        
        # Обираємо потрібні колонки
        feature_columns = [
            'pm25', 'pm10', 'no2', 'so2', 'co', 'o3',
            'temperature', 'humidity', 'pressure', 'wind_speed',
            'hour', 'day_of_week', 'month'
        ]
        
        # Фільтруємо тільки наявні колонки
        available_columns = [col for col in feature_columns if col in data.columns]
        data = data[available_columns]
        
        # Заповнюємо пропущені значення
        data = data.ffill().bfill()
        
        # Видаляємо рядки з NaN якщо залишились
        data = data.dropna()
        
        print(f"✅ Підготовлено {len(data)} записів з {len(available_columns)} ознаками")
        
        return data
    
    def normalize_data(self, data, fit=True):
        """
        Нормалізувати дані (0-1)
        
        Args:
            data: DataFrame або array
            fit: Чи треба fit scaler (True для тренування, False для прогнозу)
        
        Returns:
            Нормалізовані дані
        """
        if fit:
            normalized = self.scaler.fit_transform(data)
            # Зберегти scaler
            os.makedirs(Config.MODEL_PATH, exist_ok=True)
            joblib.dump(self.scaler, self.scaler_path)
            print(f"✅ Scaler збережено: {self.scaler_path}")
        else:
            # Завантажити існуючий scaler
            if os.path.exists(self.scaler_path):
                self.scaler = joblib.load(self.scaler_path)
                normalized = self.scaler.transform(data)
            else:
                print("⚠️ Scaler не знайдено, використовую новий")
                normalized = self.scaler.fit_transform(data)
        
        return normalized
    
    def create_sequences(self, data, sequence_length=24):
        """
        Створити послідовності для LSTM
        
        Args:
            data: Нормалізовані дані
            sequence_length: Довжина послідовності (24 години)
        
        Returns:
            X (вхідні послідовності), y (цільові значення)
        """
        X, y = [], []
        
        for i in range(len(data) - sequence_length):
            X.append(data[i:i + sequence_length])
            # Прогнозуємо тільки PM2.5 (перша колонка)
            y.append(data[i + sequence_length, 0])
        
        X = np.array(X)
        y = np.array(y)
        
        print(f"✅ Створено {len(X)} послідовностей")
        print(f"   Shape X: {X.shape}, Shape y: {y.shape}")
        
        return X, y
    
    def inverse_transform_predictions(self, predictions):
        """
        Повернути прогнози до оригінального масштабу
        
        Args:
            predictions: Нормалізовані прогнози
        
        Returns:
            Прогнози в оригінальному масштабі
        """
        # Створюємо dummy array з потрібною кількістю колонок
        n_features = self.scaler.n_features_in_
        dummy = np.zeros((len(predictions), n_features))
        dummy[:, 0] = predictions  # PM2.5 в першій колонці
        
        # Inverse transform
        inversed = self.scaler.inverse_transform(dummy)
        
        return inversed[:, 0]  # Повертаємо тільки PM2.5
    
    def calculate_aqi_from_pm25(self, pm25_value):
        """
        Розрахувати AQI з PM2.5
        
        Args:
            pm25_value: Значення PM2.5
        
        Returns:
            AQI значення та статус
        """
        # Таблиця перетворення PM2.5 в AQI (EPA стандарт)
        breakpoints = [
            (0.0, 12.0, 0, 50),
            (12.1, 35.4, 51, 100),
            (35.5, 55.4, 101, 150),
            (55.5, 150.4, 151, 200),
            (150.5, 250.4, 201, 300),
            (250.5, 500.4, 301, 500)
        ]
        
        for bp_lo, bp_hi, aqi_lo, aqi_hi in breakpoints:
            if bp_lo <= pm25_value <= bp_hi:
                aqi = ((aqi_hi - aqi_lo) / (bp_hi - bp_lo)) * (pm25_value - bp_lo) + aqi_lo
                break
        else:
            aqi = 500  # Максимум
        
        # Визначити статус
        if aqi <= 50:
            status = 'Добра'
        elif aqi <= 100:
            status = 'Помірна'
        elif aqi <= 150:
            status = 'Нездорова для чутливих'
        elif aqi <= 200:
            status = 'Нездорова'
        elif aqi <= 300:
            status = 'Дуже нездорова'
        else:
            status = 'Небезпечна'
        
        return int(aqi), status