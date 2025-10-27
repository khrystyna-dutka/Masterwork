# ml-service/data/preprocessor.py
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import joblib
import os
from config import Config

class DataPreprocessor:
    """Клас для підготовки та нормалізації даних"""
    
    def __init__(self, district_id):
        self.district_id = district_id
        self.scaler = MinMaxScaler()
        self.scaler_path = os.path.join(Config.MODEL_PATH, f'scaler_{district_id}.pkl')
        
        # Колонки які використовуємо для прогнозування
        self.feature_columns = [
            'pm25', 'temperature', 'humidity', 
            'pm10', 'no2', 'so2', 'co', 'o3'
        ]
    
    def prepare_data(self, df):
        """
        Підготувати дані для моделі
        
        Args:
            df: DataFrame з сирими даними
        
        Returns:
            DataFrame з підготованими даними
        """
        # Копіюємо щоб не змінювати оригінал
        data = df.copy()
        
        # Конвертувати measured_at в datetime якщо треба
        if 'measured_at' in data.columns:
            data['measured_at'] = pd.to_datetime(data['measured_at'])
            data = data.sort_values('measured_at')
        
        # Заповнити пропущені значення
        for col in self.feature_columns:
            if col in data.columns:
                data[col] = data[col].fillna(data[col].mean())
            else:
                # Якщо колонки немає - додати з нульовими значеннями
                data[col] = 0
        
        # Вибрати тільки потрібні колонки в правильному порядку
        prepared = data[self.feature_columns].copy()
        
        print(f"✅ Дані підготовано: {len(prepared)} записів, {len(self.feature_columns)} ознак")
        return prepared
    
    def normalize_data(self, data, fit=True):
        """
        Нормалізувати дані
        
        Args:
            data: numpy array або DataFrame
            fit: True для тренування scaler, False для використання збереженого
        
        Returns:
            Нормалізовані дані
        """
        if fit:
            # Тренування scaler
            normalized = self.scaler.fit_transform(data)
            # Зберегти scaler
            joblib.dump(self.scaler, self.scaler_path)
            print(f"💾 Scaler збережено: {self.scaler_path}")
        else:
            # Завантажити збережений scaler
            if os.path.exists(self.scaler_path):
                self.scaler = joblib.load(self.scaler_path)
                normalized = self.scaler.transform(data)
            else:
                raise Exception(f"Scaler не знайдено: {self.scaler_path}. Потрібно спочатку натренувати модель.")
        
        return normalized
    
    def inverse_transform(self, data):
        """
        Повернути нормалізовані дані до оригінального масштабу
        
        Args:
            data: Нормалізовані дані
        
        Returns:
            Денормалізовані дані
        """
        if not os.path.exists(self.scaler_path):
            raise Exception(f"Scaler не знайдено: {self.scaler_path}")
        
        self.scaler = joblib.load(self.scaler_path)
        return self.scaler.inverse_transform(data)
    
    def create_sequences(self, data, sequence_length):
        """
        Створити послідовності для LSTM (СТАРИЙ метод - для сумісності)
        
        Args:
            data: Нормалізовані дані
            sequence_length: Довжина послідовності
        
        Returns:
            X: послідовності (samples, sequence_length, features)
            y: цільові значення PM2.5
        """
        X, y = [], []
        
        for i in range(len(data) - sequence_length):
            X.append(data[i:i + sequence_length])
            # PM2.5 на першій позиції
            y.append(data[i + sequence_length, 0])
        
        return np.array(X), np.array(y)
    
    def create_multi_output_sequences(self, data, sequence_length):
        """
        Створити послідовності для multi-output LSTM
        
        Args:
            data: Нормалізовані дані
            sequence_length: Довжина послідовності
        
        Returns:
            X: послідовності (samples, sequence_length, features)
            y_dict: словник з цільовими значеннями для кожного параметру
        """
        X = []
        y_pm25, y_pm10, y_no2, y_so2, y_co, y_o3 = [], [], [], [], [], []
        
        for i in range(len(data) - sequence_length):
            X.append(data[i:i + sequence_length])
            
            # Цільові значення (наступна точка після послідовності)
            next_point = data[i + sequence_length]
            
            # Позиції параметрів згідно self.feature_columns:
            # 0: pm25, 1: temperature, 2: humidity, 
            # 3: pm10, 4: no2, 5: so2, 6: co, 7: o3
            y_pm25.append(next_point[0])
            y_pm10.append(next_point[3])
            y_no2.append(next_point[4])
            y_so2.append(next_point[5])
            y_co.append(next_point[6])
            y_o3.append(next_point[7])
        
        X = np.array(X)
        
        y_dict = {
            'pm25': np.array(y_pm25),
            'pm10': np.array(y_pm10),
            'no2': np.array(y_no2),
            'so2': np.array(y_so2),
            'co': np.array(y_co),
            'o3': np.array(y_o3)
        }
        
        print(f"✅ Створено {len(X)} послідовностей з 6 виходами")
        return X, y_dict
    
    def get_scaler_info(self):
        """Отримати інформацію про scaler"""
        info = {
            'exists': os.path.exists(self.scaler_path),
            'path': self.scaler_path,
            'feature_columns': self.feature_columns
        }
        
        if info['exists']:
            scaler = joblib.load(self.scaler_path)
            info['data_min'] = scaler.data_min_.tolist()
            info['data_max'] = scaler.data_max_.tolist()
        
        return info