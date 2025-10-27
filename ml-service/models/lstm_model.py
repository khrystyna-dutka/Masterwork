import numpy as np
import tensorflow as tf
from tensorflow import keras
from keras import layers
from keras.callbacks import EarlyStopping, ModelCheckpoint
import os
from config import Config
import joblib
from datetime import datetime

class LSTMForecastModel:
    """LSTM модель для прогнозування PM2.5"""
    
    def __init__(self, district_id):
        self.district_id = district_id
        self.model = None
        self.model_path = os.path.join(Config.MODEL_PATH, f'lstm_model_district_{district_id}.keras')
        self.history_path = os.path.join(Config.MODEL_PATH, f'training_history_{district_id}.pkl')
        self.sequence_length = Config.SEQUENCE_LENGTH
        
        # Створити папку для моделей
        os.makedirs(Config.MODEL_PATH, exist_ok=True)
    
    def build_model(self, input_shape):
        """
        Побудувати архітектуру LSTM моделі
        
        Args:
            input_shape: (sequence_length, n_features)
        """
        model = keras.Sequential([
            # Перший LSTM шар
            layers.LSTM(
                units=64,
                return_sequences=True,
                input_shape=input_shape,
                name='lstm_1'
            ),
            layers.Dropout(0.2, name='dropout_1'),
            
            # Другий LSTM шар
            layers.LSTM(
                units=32,
                return_sequences=False,
                name='lstm_2'
            ),
            layers.Dropout(0.2, name='dropout_2'),
            
            # Dense шари
            layers.Dense(16, activation='relu', name='dense_1'),
            layers.Dropout(0.1, name='dropout_3'),
            
            # Вихідний шар (прогноз PM2.5)
            layers.Dense(1, activation='linear', name='output')
        ])
        
        # Компіляція моделі
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='mean_squared_error',
            metrics=['mae', 'mse']
        )
        
        self.model = model
        
        print("✅ LSTM модель створено")
        print(f"   Параметрів: {model.count_params():,}")
        
        return model
    
    def train(self, X_train, y_train, X_val=None, y_val=None, epochs=50, batch_size=32):
        """
        Тренувати модель
        
        Args:
            X_train: Тренувальні дані (sequences)
            y_train: Цільові значення
            X_val: Валідаційні дані (опціонально)
            y_val: Валідаційні цільові значення
            epochs: Кількість епох
            batch_size: Розмір батча
        
        Returns:
            History об'єкт
        """
        if self.model is None:
            self.build_model(input_shape=(X_train.shape[1], X_train.shape[2]))
        
        # Callbacks
        callbacks = [
            EarlyStopping(
                monitor='val_loss' if X_val is not None else 'loss',
                patience=10,
                restore_best_weights=True,
                verbose=1
            ),
            ModelCheckpoint(
                self.model_path,
                monitor='val_loss' if X_val is not None else 'loss',
                save_best_only=True,
                verbose=0
            )
        ]
        
        # Валідаційні дані
        validation_data = (X_val, y_val) if X_val is not None and y_val is not None else None
        
        print(f"\n🎯 Початок тренування моделі для району {self.district_id}")
        print(f"   Тренувальних зразків: {len(X_train)}")
        if validation_data:
            print(f"   Валідаційних зразків: {len(X_val)}")
        print(f"   Epochs: {epochs}, Batch size: {batch_size}")
        
        # Тренування
        history = self.model.fit(
            X_train, y_train,
            validation_data=validation_data,
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        # Зберегти історію тренування
        history_dict = {
            'loss': history.history['loss'],
            'mae': history.history['mae'],
            'mse': history.history['mse'],
            'trained_at': datetime.now().isoformat(),
            'epochs': len(history.history['loss']),
            'district_id': self.district_id
        }
        
        if validation_data:
            history_dict['val_loss'] = history.history['val_loss']
            history_dict['val_mae'] = history.history['val_mae']
            history_dict['val_mse'] = history.history['val_mse']
        
        joblib.dump(history_dict, self.history_path)
        
        print(f"\n✅ Тренування завершено!")
        print(f"   Фінальний loss: {history.history['loss'][-1]:.4f}")
        print(f"   Фінальний MAE: {history.history['mae'][-1]:.4f}")
        print(f"   Модель збережено: {self.model_path}")
        
        return history
    
    def load_model(self):
        """Завантажити збережену модель"""
        if os.path.exists(self.model_path):
            self.model = keras.models.load_model(self.model_path)
            print(f"✅ Модель завантажено: {self.model_path}")
            return True
        else:
            print(f"⚠️ Модель не знайдено: {self.model_path}")
            return False
    
    def predict(self, X):
        """
        Зробити прогноз
        
        Args:
            X: Вхідні дані (sequences)
        
        Returns:
            Прогнози
        """
        if self.model is None:
            if not self.load_model():
                raise Exception("Модель не знайдено. Спочатку потрібно натренувати модель.")
        
        predictions = self.model.predict(X, verbose=0)
        return predictions.flatten()
    
    def predict_future(self, last_sequence, n_hours=24):
        """
        Прогнозування на N годин вперед
        
        Args:
            last_sequence: Остання послідовність (sequence_length, n_features)
            n_hours: Кількість годин для прогнозу
        
        Returns:
            Масив прогнозів
        """
        if self.model is None:
            if not self.load_model():
                raise Exception("Модель не знайдено")
        
        predictions = []
        current_sequence = last_sequence.copy()
        
        for _ in range(n_hours):
            # Прогноз наступної години
            next_pred = self.model.predict(current_sequence.reshape(1, *current_sequence.shape), verbose=0)[0, 0]
            predictions.append(next_pred)
            
            # Оновити послідовність (rolling window)
            # Зсуваємо на 1 позицію і додаємо новий прогноз
            current_sequence = np.roll(current_sequence, -1, axis=0)
            current_sequence[-1, 0] = next_pred  # PM2.5 в першій колонці
            
            # Інші ознаки (температура, вологість і т.д.) беремо з останнього значення
            # В реальності тут можна використати прогноз погоди
        
        return np.array(predictions)
    
    def evaluate(self, X_test, y_test):
        """
        Оцінити модель на тестових даних
        
        Args:
            X_test: Тестові дані
            y_test: Тестові цільові значення
        
        Returns:
            Dict з метриками
        """
        if self.model is None:
            if not self.load_model():
                raise Exception("Модель не знайдено")
        
        results = self.model.evaluate(X_test, y_test, verbose=0)
        
        metrics = {
            'loss': results[0],
            'mae': results[1],
            'mse': results[2],
            'rmse': np.sqrt(results[2])
        }
        
        print(f"\n📊 Оцінка моделі:")
        print(f"   Loss: {metrics['loss']:.4f}")
        print(f"   MAE: {metrics['mae']:.4f}")
        print(f"   RMSE: {metrics['rmse']:.4f}")
        
        return metrics
    
    def get_model_info(self):
        """Отримати інформацію про модель"""
        info = {
            'district_id': self.district_id,
            'model_exists': os.path.exists(self.model_path),
            'model_path': self.model_path,
            'sequence_length': self.sequence_length
        }
        
        if os.path.exists(self.history_path):
            history = joblib.load(self.history_path)
            info['last_trained'] = history.get('trained_at')
            info['epochs_trained'] = history.get('epochs')
            info['final_loss'] = history['loss'][-1] if history.get('loss') else None
        
        return info