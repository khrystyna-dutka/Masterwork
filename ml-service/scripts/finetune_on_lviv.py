# ml-service/scripts/finetune_on_lviv.py
"""
Fine-tuning моделі на даних Львова
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db_helper import DatabaseHelper
from data.preprocessor import DataPreprocessor
from models.lstm_model import LSTMForecastModel
from config import Config
from sklearn.model_selection import train_test_split
import tensorflow as tf
from keras.models import load_model

class LvivFineTuner:
    """Fine-tuning на даних Львова"""
    
    def __init__(self, district_id, pretrained_model_path):
        self.district_id = district_id
        self.pretrained_model_path = pretrained_model_path
        self.db = DatabaseHelper()
    
    def load_pretrained_model(self):
        """Завантажити pre-trained модель"""
        print(f"\n📥 Завантаження pre-trained моделі: {self.pretrained_model_path}")
        
        if not os.path.exists(self.pretrained_model_path):
            print(f"❌ Модель не знайдено! Спочатку запусти pre-training.")
            return None
        
        model = load_model(self.pretrained_model_path)
        print("✅ Pre-trained модель завантажено")
        
        return model
    
    def prepare_lviv_data(self, days=30):
        """Підготувати дані Львова"""
        print(f"\n📊 Підготовка даних Львова (район {self.district_id})...")
        
        # Отримати дані з БД
        df = self.db.get_historical_data(self.district_id, days=days)
        
        if len(df) < Config.SEQUENCE_LENGTH + 1:
            print(f"❌ Недостатньо даних! Потрібно мінімум {Config.SEQUENCE_LENGTH + 1} записів")
            return None, None
        
        print(f"✅ Отримано {len(df)} записів")
        
        # Препроцесинг
        preprocessor = DataPreprocessor(self.district_id)
        prepared_data = preprocessor.prepare_data(df)
        normalized_data = preprocessor.normalize_data(prepared_data.values, fit=True)
        
        # Створити послідовності
        X, y = preprocessor.create_sequences(normalized_data, Config.SEQUENCE_LENGTH)
        
        print(f"✅ Створено {len(X)} послідовностей")
        
        return X, y
    
    def finetune(self, pretrained_model, X_train, y_train, X_val, y_val, epochs=10):
        """Fine-tuning моделі"""
        print("\n🔧 FINE-TUNING НА ДАНИХ ЛЬВОВА")
        print("=" * 70)
        
        # Створити обгортку для моделі
        model_wrapper = LSTMForecastModel(self.district_id)
        model_wrapper.model = pretrained_model
        
        # Заморозити частину шарів (опціонально)
        # for layer in model_wrapper.model.layers[:-4]:  # Заморозити всі крім останніх 4
        #     layer.trainable = False
        
        # Перекомпілювати з меншим learning rate
        model_wrapper.model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.0001),  # Менший LR
            loss={
                'pm25': 'mse',
                'pm10': 'mse',
                'no2': 'mse',
                'so2': 'mse',
                'co': 'mse',
                'o3': 'mse'
            }
        )
        
        print(f"\n📊 Параметри fine-tuning:")
        print(f"   🔢 Епохи: {epochs}")
        print(f"   📊 Train: {len(X_train)} послідовностей")
        print(f"   📊 Val: {len(X_val)} послідовностей")
        
        # Навчання
        history = model_wrapper.train(
            X_train, y_train,
            X_val, y_val,
            epochs=epochs,
            batch_size=16
        )
        
        print(f"\n✅ Fine-tuning завершено!")
        print(f"   💾 Модель збережено: {model_wrapper.model_path}")
        
        return model_wrapper
    
    def run(self, days=30, epochs=10):
        """Запустити fine-tuning"""
        print("\n" + "=" * 70)
        print(f"🎯 FINE-TUNING ДЛЯ РАЙОНУ {self.district_id}")
        print("=" * 70)
        
        # 1. Завантажити pre-trained модель
        pretrained_model = self.load_pretrained_model()
        if pretrained_model is None:
            return
        
        # 2. Підготувати дані Львова
        X, y = self.prepare_lviv_data(days=days)
        if X is None:
            return
        
        # 3. Розділити на train/val
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, shuffle=False
        )
        
        # 4. Fine-tuning
        model = self.finetune(
            pretrained_model,
            X_train, y_train,
            X_val, y_val,
            epochs=epochs
        )
        
        print("\n" + "=" * 70)
        print("✅ FINE-TUNING ЗАВЕРШЕНО!")
        print("=" * 70)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Fine-tuning на даних Львова')
    parser.add_argument('--district', type=int, required=True, help='ID району (1-6)')
    parser.add_argument('--pretrained', type=str, 
                       default='models/lstm_pretrained_saveecobot.keras',
                       help='Шлях до pre-trained моделі')
    parser.add_argument('--days', type=int, default=30, help='Кількість днів даних')
    parser.add_argument('--epochs', type=int, default=10, help='Кількість епох')
    
    args = parser.parse_args()
    
    finetuner = LvivFineTuner(args.district, args.pretrained)
    finetuner.run(days=args.days, epochs=args.epochs)