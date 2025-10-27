import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow import keras
from keras import layers
from keras.callbacks import EarlyStopping, ModelCheckpoint
import os
from config import Config
import joblib
from datetime import datetime, timedelta
from utils.aqi_calculator import AQICalculator

class LSTMForecastModel:
    """Multi-output LSTM модель для прогнозування ВСІХ параметрів"""
    
    def __init__(self, district_id):
        self.district_id = district_id
        self.model = None
        self.model_path = os.path.join(Config.MODEL_PATH, f'lstm_model_district_{district_id}.keras')
        self.history_path = os.path.join(Config.MODEL_PATH, f'training_history_{district_id}.pkl')
        self.sequence_length = Config.SEQUENCE_LENGTH
        
        # Параметри які прогнозуємо
        self.output_features = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']
        
        os.makedirs(Config.MODEL_PATH, exist_ok=True)
    
    def build_model(self, input_shape):
        """
        Побудувати Multi-Output LSTM модель
        
        Args:
            input_shape: (sequence_length, n_features)
        """
        # Input
        inputs = layers.Input(shape=input_shape, name='input')
        
        # Перший LSTM шар
        x = layers.LSTM(128, return_sequences=True, name='lstm_1')(inputs)
        x = layers.Dropout(0.2, name='dropout_1')(x)
        
        # Другий LSTM шар
        x = layers.LSTM(64, return_sequences=False, name='lstm_2')(x)
        x = layers.Dropout(0.2, name='dropout_2')(x)
        
        # Спільний Dense шар
        x = layers.Dense(32, activation='relu', name='dense_shared')(x)
        x = layers.Dropout(0.1, name='dropout_3')(x)
        
        # 6 окремих виходів для кожного параметру
        output_pm25 = layers.Dense(1, activation='linear', name='pm25')(x)
        output_pm10 = layers.Dense(1, activation='linear', name='pm10')(x)
        output_no2 = layers.Dense(1, activation='linear', name='no2')(x)
        output_so2 = layers.Dense(1, activation='linear', name='so2')(x)
        output_co = layers.Dense(1, activation='linear', name='co')(x)
        output_o3 = layers.Dense(1, activation='linear', name='o3')(x)
        
        # Створити модель
        self.model = keras.Model(
            inputs=inputs,
            outputs=[output_pm25, output_pm10, output_no2, output_so2, output_co, output_o3],
            name='multi_output_lstm'
        )
        
        # Компіляція (БЕЗ МЕТРИК - простіше!)
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='mean_squared_error'
        )
        
        print("✅ Multi-Output LSTM модель створено")
        print(f"   Параметрів: {self.model.count_params():,}")
        print(f"   Виходи: {', '.join(self.output_features)}")
        
        return self.model
    
    def train(self, X_train, y_train_dict, X_val=None, y_val_dict=None, epochs=50, batch_size=32):
        """
        Тренувати модель
        
        Args:
            X_train: Тренувальні дані (sequences)
            y_train_dict: Dict з цільовими значеннями для кожного параметру
            X_val: Валідаційні дані
            y_val_dict: Dict з валідаційними цільовими значеннями
        """
        if self.model is None:
            self.build_model(input_shape=(X_train.shape[1], X_train.shape[2]))
        
        # Перетворити dict в список для Keras
        y_train = [y_train_dict[feat] for feat in self.output_features]
        y_val = [y_val_dict[feat] for feat in self.output_features] if y_val_dict else None
        
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
        
        validation_data = (X_val, y_val) if X_val is not None and y_val is not None else None
        
        print(f"\n🎯 Початок тренування Multi-Output моделі для району {self.district_id}")
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
        
        # Зберегти історію
        history_dict = {
            'loss': history.history['loss'],
            'trained_at': datetime.now().isoformat(),
            'epochs': len(history.history['loss']),
            'district_id': self.district_id
        }
        
        if validation_data:
            history_dict['val_loss'] = history.history['val_loss']
        
        joblib.dump(history_dict, self.history_path)
        
        print(f"\n✅ Тренування завершено!")
        print(f"   Фінальний loss: {history.history['loss'][-1]:.4f}")
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
    
    def predict_future(self, last_sequence, n_hours=24):
        """
        Прогнозування на N годин вперед для ВСІХ параметрів з ДЕНОРМАЛІЗАЦІЄЮ
        
        Args:
            last_sequence: Остання послідовність (sequence_length, n_features) - НОРМАЛІЗОВАНА
            n_hours: Кількість годин для прогнозу
        
        Returns:
            DataFrame з прогнозами всіх параметрів (ДЕНОРМАЛІЗОВАНІ)
        """
        if self.model is None:
            if not self.load_model():
                raise Exception("Модель не знайдено")
        
        # Завантажити scaler для денормалізації
        import joblib
        scaler_path = os.path.join(Config.MODEL_PATH, f'scaler_{self.district_id}.pkl')
        if not os.path.exists(scaler_path):
            raise Exception(f"Scaler не знайдено: {scaler_path}")
        
        scaler = joblib.load(scaler_path)
        
        print(f"\n🔮 Прогнозування всіх параметрів на {n_hours} годин для району {self.district_id}")
        
        predictions = []
        current_sequence = last_sequence.copy()
        
        # Температура, вологість з останньої послідовності (нормалізовані)
        temperature_norm = current_sequence[-1, 1] if current_sequence.shape[1] > 1 else 0.5
        humidity_norm = current_sequence[-1, 2] if current_sequence.shape[1] > 2 else 0.5
        
        start_time = datetime.now()
        
        for i in range(n_hours):
            # Прогноз ВСІХ параметрів одночасно (нормалізовані)
            preds = self.model.predict(
                current_sequence.reshape(1, *current_sequence.shape), 
                verbose=0
            )
            
            # Розпакувати прогнози (6 виходів - всі нормалізовані від 0 до 1)
            pm25_norm = max(0.0, min(1.0, float(preds[0][0, 0])))
            pm10_norm = max(0.0, min(1.0, float(preds[1][0, 0])))
            no2_norm = max(0.0, min(1.0, float(preds[2][0, 0])))
            so2_norm = max(0.0, min(1.0, float(preds[3][0, 0])))
            co_norm = max(0.0, min(1.0, float(preds[4][0, 0])))
            o3_norm = max(0.0, min(1.0, float(preds[5][0, 0])))
            
            # Створити вектор для денормалізації (всі 8 ознак)
            # Порядок: pm25, temperature, humidity, pm10, no2, so2, co, o3
            normalized_vector = np.array([[
                pm25_norm, temperature_norm, humidity_norm,
                pm10_norm, no2_norm, so2_norm, co_norm, o3_norm
            ]])
            
            # ДЕНОРМАЛІЗУВАТИ назад до реальних значень
            denormalized = scaler.inverse_transform(normalized_vector)[0]
            
            pm25_pred = max(0.0, float(denormalized[0]))
            temperature = float(denormalized[1])
            humidity = int(max(0, min(100, denormalized[2])))
            pm10_pred = max(0.0, float(denormalized[3]))
            no2_pred = max(0.0, float(denormalized[4]))
            so2_pred = max(0.0, float(denormalized[5]))
            co_pred = max(0.0, float(denormalized[6]))
            o3_pred = max(0.0, float(denormalized[7]))
            
            # Розрахувати AQI з реальних значень
            aqi_result = AQICalculator.calculate_full_aqi(
                pm25=pm25_pred,
                pm10=pm10_pred,
                no2=no2_pred,
                so2=so2_pred,
                co=co_pred,
                o3=o3_pred
            )
            
            aqi = aqi_result['aqi']
            aqi_status = AQICalculator.get_aqi_status(aqi)
            
            # Час прогнозу
            forecast_time = start_time + timedelta(hours=i+1)
            
            # Зберегти прогноз
            predictions.append({
                'measured_at': forecast_time,
                'pm25': round(pm25_pred, 2),
                'pm10': round(pm10_pred, 2),
                'no2': round(no2_pred, 2),
                'so2': round(so2_pred, 2),
                'co': round(co_pred, 2),
                'o3': round(o3_pred, 2),
                'aqi': aqi,
                'aqi_status': aqi_status,
                'dominant_pollutant': aqi_result['dominant'],
                'temperature': round(temperature, 1),
                'humidity': humidity,
                'confidence_level': 0.90 - (i * 0.01)
            })
            
            # Оновити послідовність (rolling window) з нормалізованими прогнозами
            current_sequence = np.roll(current_sequence, -1, axis=0)
            current_sequence[-1, 0] = pm25_norm  # PM2.5
            current_sequence[-1, 1] = temperature_norm  # Temperature
            current_sequence[-1, 2] = humidity_norm  # Humidity
            if current_sequence.shape[1] >= 8:
                current_sequence[-1, 3] = pm10_norm
                current_sequence[-1, 4] = no2_norm
                current_sequence[-1, 5] = so2_norm
                current_sequence[-1, 6] = co_norm
                current_sequence[-1, 7] = o3_norm
        
        forecast_df = pd.DataFrame(predictions)
        
        print(f"✅ Повний прогноз створено (ДЕНОРМАЛІЗОВАНО):")
        print(f"   PM2.5: {forecast_df['pm25'].min():.2f} - {forecast_df['pm25'].max():.2f}")
        print(f"   PM10: {forecast_df['pm10'].min():.2f} - {forecast_df['pm10'].max():.2f}")
        print(f"   NO2: {forecast_df['no2'].min():.2f} - {forecast_df['no2'].max():.2f}")
        print(f"   AQI: {forecast_df['aqi'].min()} - {forecast_df['aqi'].max()}")
        
        return forecast_df

    def evaluate(self, X_test, y_test_dict):
        """Оцінити модель"""
        if self.model is None:
            if not self.load_model():
                raise Exception("Модель не знайдено")
        
        y_test = [y_test_dict[feat] for feat in self.output_features]
        
        # Отримати прогнози
        predictions = self.model.predict(X_test, verbose=0)
        
        # Розрахувати MAE вручну для кожного виходу
        from sklearn.metrics import mean_absolute_error
        
        metrics = {
            'pm25_mae': mean_absolute_error(y_test[0], predictions[0]),
            'pm10_mae': mean_absolute_error(y_test[1], predictions[1]),
            'no2_mae': mean_absolute_error(y_test[2], predictions[2]),
            'so2_mae': mean_absolute_error(y_test[3], predictions[3]),
            'co_mae': mean_absolute_error(y_test[4], predictions[4]),
            'o3_mae': mean_absolute_error(y_test[5], predictions[5])
        }
        
        # Середній MAE
        avg_mae = sum(metrics.values()) / len(metrics)
        metrics['avg_mae'] = avg_mae
        
        print(f"\n📊 Оцінка Multi-Output моделі:")
        print(f"   Середній MAE: {avg_mae:.4f}")
        print(f"   PM2.5 MAE: {metrics['pm25_mae']:.4f}")
        print(f"   PM10 MAE: {metrics['pm10_mae']:.4f}")
        print(f"   NO2 MAE: {metrics['no2_mae']:.4f}")
        
        return metrics
    
    def get_model_info(self):
        """Отримати інформацію про модель"""
        info = {
            'district_id': self.district_id,
            'model_exists': os.path.exists(self.model_path),
            'model_path': self.model_path,
            'sequence_length': self.sequence_length,
            'model_type': 'Multi-Output LSTM',
            'output_features': self.output_features
        }
        
        if os.path.exists(self.history_path):
            history = joblib.load(self.history_path)
            info['last_trained'] = history.get('trained_at')
            info['epochs_trained'] = history.get('epochs')
            info['final_loss'] = history['loss'][-1] if history.get('loss') else None
        
        return info