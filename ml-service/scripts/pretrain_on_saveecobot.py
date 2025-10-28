# ml-service/scripts/pretrain_on_saveecobot.py
"""
Попереднє навчання моделі на даних SaveEcoBot
"""
import pandas as pd
import numpy as np
import sys
import os
from datetime import datetime

# Додати шлях до батьківської директорії
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.lstm_model import LSTMForecastModel
from data.preprocessor import DataPreprocessor
from config import Config
from sklearn.model_selection import train_test_split
import tensorflow as tf

class SaveEcoBotPretrainer:
    """Попереднє навчання на даних SaveEcoBot"""
    
    def __init__(self, csv_path):
        self.csv_path = csv_path
        self.sequence_length = Config.SEQUENCE_LENGTH
    
    def load_and_prepare_data(self, sample_size=None, min_records_per_city=100):
        """
        Завантажити та підготувати дані з CSV
        
        Args:
            sample_size: Кількість міст для вибірки (None = всі)
            min_records_per_city: Мінімальна кількість записів для міста
        """
        print("=" * 70)
        print("📂 ЗАВАНТАЖЕННЯ ДАНИХ SAVEECOBOT")
        print("=" * 70)
        
        # 1. Завантажити CSV
        print(f"\n📥 Читання файлу: {self.csv_path}")
        df = pd.read_csv(self.csv_path)
        
        print(f"✅ Завантажено {len(df):,} записів")
        print(f"📊 Колонки: {', '.join(df.columns)}")
        
        # 2. Конвертувати дату
        df['logged_at'] = pd.to_datetime(df['logged_at'])
        df = df.sort_values(['city_id', 'logged_at'])
        
        # 3. Статистика
        unique_cities = df['city_id'].nunique()
        date_range = f"{df['logged_at'].min()} → {df['logged_at'].max()}"
        
        print(f"\n📊 Статистика:")
        print(f"   🏙️ Унікальних міст: {unique_cities:,}")
        print(f"   📅 Період: {date_range}")
        print(f"   📈 Середньо записів на місто: {len(df) / unique_cities:.0f}")
        
        # 4. Фільтрувати міста з мінімальною кількістю записів
        print(f"\n🔍 Фільтрація міст (мінімум {min_records_per_city} записів)...")
        
        city_counts = df['city_id'].value_counts()
        valid_cities = city_counts[city_counts >= min_records_per_city].index.tolist()
        
        df_filtered = df[df['city_id'].isin(valid_cities)].copy()
        
        print(f"   ✅ Міст після фільтрації: {len(valid_cities):,}")
        print(f"   ✅ Записів після фільтрації: {len(df_filtered):,}")
        
        # 5. Вибірка міст (якщо потрібно)
        if sample_size and sample_size < len(valid_cities):
            print(f"\n🎲 Вибірка {sample_size} випадкових міст...")
            sampled_cities = np.random.choice(valid_cities, size=sample_size, replace=False)
            df_filtered = df_filtered[df_filtered['city_id'].isin(sampled_cities)]
            
            print(f"   ✅ Фінальних міст: {sample_size}")
            print(f"   ✅ Фінальних записів: {len(df_filtered):,}")
        
        # 6. Додати відсутні колонки
        print("\n⚙️ Додавання відсутніх параметрів...")
        
        # PM10 розраховуємо з PM2.5
        df_filtered['pm10'] = df_filtered['pm25'] * 1.8
        
        # Інші параметри - середні значення
        df_filtered['no2'] = 25.0
        df_filtered['so2'] = 10.0
        df_filtered['co'] = 500.0
        df_filtered['o3'] = 40.0
        df_filtered['temperature'] = 15.0
        df_filtered['humidity'] = 70
        
        print("   ✅ Додано: pm10, no2, so2, co, o3, temperature, humidity")
        
        return df_filtered
    
    def create_sequences_from_cities(self, df):
        """
        Створити послідовності для навчання з даних кожного міста
        
        Args:
            df: DataFrame з даними всіх міст
        
        Returns:
            X, y - масиви послідовностей
        """
        print("\n🔄 СТВОРЕННЯ ПОСЛІДОВНОСТЕЙ")
        print("=" * 70)
        
        feature_columns = ['pm25', 'temperature', 'humidity', 'pm10', 'no2', 'so2', 'co', 'o3']
        output_features = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']
        
        all_X = []
        all_y = []
        
        cities = df['city_id'].unique()
        
        print(f"📍 Обробка {len(cities):,} міст...")
        
        for i, city_id in enumerate(cities, 1):
            # Дані для одного міста
            city_data = df[df['city_id'] == city_id].copy()
            city_data = city_data.sort_values('logged_at')
            
            if len(city_data) < self.sequence_length + 1:
                continue
            
            # Вибрати колонки
            city_values = city_data[feature_columns].values
            
            # Нормалізація (для кожного міста окремо)
            from sklearn.preprocessing import MinMaxScaler
            scaler = MinMaxScaler()
            city_normalized = scaler.fit_transform(city_values)
            
            # Створити послідовності
            for j in range(len(city_normalized) - self.sequence_length):
                X_seq = city_normalized[j:j + self.sequence_length]
                y_target = city_normalized[j + self.sequence_length]
                
                # y - тільки прогнозовані параметри (6 штук)
                # Індекси в feature_columns: pm25=0, pm10=3, no2=4, so2=5, co=6, o3=7
                y_values = y_target[[0, 3, 4, 5, 6, 7]]  # pm25, pm10, no2, so2, co, o3
                
                all_X.append(X_seq)
                all_y.append(y_values)
            
            # Прогрес
            if i % 100 == 0:
                print(f"   📊 Оброблено міст: {i}/{len(cities)} ({i/len(cities)*100:.1f}%)")
        
        X = np.array(all_X)
        y = np.array(all_y)
        
        print(f"\n✅ Створено послідовностей: {len(X):,}")
        print(f"   📐 Форма X: {X.shape} (samples, sequence_length, features)")
        print(f"   📐 Форма y: {y.shape} (samples, output_features)")
        
        return X, y
    
    def pretrain_model(self, X_train, y_train, X_val, y_val, epochs=50, batch_size=64):
        """
        Попереднє навчання моделі
        
        Args:
            X_train, y_train: Тренувальні дані
            X_val, y_val: Валідаційні дані
            epochs: Кількість епох
            batch_size: Розмір батча
        """
        print("\n🧠 ПОПЕРЕДНЄ НАВЧАННЯ МОДЕЛІ")
        print("=" * 70)
        
        # Створити базову модель (district_id = 0 для pre-training)
        model = LSTMForecastModel(district_id=0)
        
        # Побудувати архітектуру
        input_shape = (X_train.shape[1], X_train.shape[2])
        model.build_model(input_shape)
        
        print(f"\n📊 Параметри навчання:")
        print(f"   🔢 Епохи: {epochs}")
        print(f"   📦 Batch size: {batch_size}")
        print(f"   📊 Train samples: {len(X_train):,}")
        print(f"   📊 Val samples: {len(X_val):,}")
        
        # Підготувати y для multi-output моделі
        y_train_dict = {
            'pm25': y_train[:, 0],
            'pm10': y_train[:, 1],
            'no2': y_train[:, 2],
            'so2': y_train[:, 3],
            'co': y_train[:, 4],
            'o3': y_train[:, 5]
        }
        
        y_val_dict = {
            'pm25': y_val[:, 0],
            'pm10': y_val[:, 1],
            'no2': y_val[:, 2],
            'so2': y_val[:, 3],
            'co': y_val[:, 4],
            'o3': y_val[:, 5]
        }
        
        # Навчання
        print("\n🚀 Початок навчання...")
        print("   ⏳ Це може зайняти 10-30 хвилин...")
        
        history = model.train(
            X_train, y_train_dict,
            X_val, y_val_dict,
            epochs=epochs,
            batch_size=batch_size
        )
        
        # Зберегти модель як pretrained
        pretrained_path = os.path.join(Config.MODEL_PATH, 'lstm_pretrained_saveecobot.keras')
        model.model.save(pretrained_path)
        
        print(f"\n✅ Pre-trained модель збережено: {pretrained_path}")
        
        return model, history
    
    def run(self, sample_cities=1000, min_records=100, epochs=30):
        """
        Запустити процес попереднього навчання
        
        Args:
            sample_cities: Кількість міст для вибірки (None = всі)
            min_records: Мінімальна кількість записів на місто
            epochs: Кількість епох навчання
        """
        print("\n" + "=" * 70)
        print("🚀 ПОПЕРЕДНЄ НАВЧАННЯ НА ДАНИХ SAVEECOBOT")
        print("=" * 70)
        
        # 1. Завантажити дані
        df = self.load_and_prepare_data(
            sample_size=sample_cities,
            min_records_per_city=min_records
        )
        
        # 2. Створити послідовності
        X, y = self.create_sequences_from_cities(df)
        
        if len(X) == 0:
            print("❌ Не вдалося створити послідовності!")
            return
        
        # 3. Розділити на train/val
        print("\n📊 Розділення на train/val...")
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        print(f"   ✅ Train: {len(X_train):,} послідовностей")
        print(f"   ✅ Val: {len(X_val):,} послідовностей")
        
        # 4. Попереднє навчання
        model, history = self.pretrain_model(
            X_train, y_train,
            X_val, y_val,
            epochs=epochs,
            batch_size=64
        )
        
        print("\n" + "=" * 70)
        print("✅ ПОПЕРЕДНЄ НАВЧАННЯ ЗАВЕРШЕНО!")
        print("=" * 70)
        
        print("\n💡 Наступний крок: Fine-tuning на даних Львова")
        print("   Використай: python scripts/finetune_on_lviv.py")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Попереднє навчання на SaveEcoBot')
    parser.add_argument('--csv', type=str, required=True, help='Шлях до CSV файлу')
    parser.add_argument('--cities', type=int, default=1000, help='Кількість міст (за замовчуванням: 1000)')
    parser.add_argument('--min-records', type=int, default=100, help='Мінімум записів на місто')
    parser.add_argument('--epochs', type=int, default=30, help='Кількість епох')
    
    args = parser.parse_args()
    
    pretrainer = SaveEcoBotPretrainer(args.csv)
    pretrainer.run(
        sample_cities=args.cities,
        min_records=args.min_records,
        epochs=args.epochs
    )