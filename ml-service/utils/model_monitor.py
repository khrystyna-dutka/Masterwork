# ml-service/utils/model_monitor.py
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from utils.db_helper import DatabaseHelper
from models.air_quality_model import AirQualityModel
from data.preprocessor import DataPreprocessor
from sklearn.model_selection import train_test_split
import joblib
import os

class ModelMonitor:
    """
    Моніторинг якості моделі та автоматичне перенавчання
    """
    
    def __init__(self):
        self.db = DatabaseHelper()
        # Пороги для перенавчання
        self.RETRAIN_THRESHOLD_MAE = 3.0  # Якщо MAE > 3.0 μg/m³
        self.RETRAIN_THRESHOLD_HOURS = 24  # Перенавчання кожні 24 години
        self.MIN_DATA_FOR_RETRAIN = 50     # Мінімум записів для перенавчання
    
    def check_forecast_accuracy(self, district_id):
        """
        Перевірити точність прогнозів vs реальні дані
        
        Returns:
            dict: {'mae': float, 'should_retrain': bool, 'metrics': dict}
        """
        print(f"\n📊 Перевірка точності прогнозів для району {district_id}...")
        
        try:
            # 1. Отримати прогнози за останні 24 години
            forecasts = self.db.get_forecasts_for_validation(district_id, hours_back=24)
            
            if len(forecasts) == 0:
                print("   ⚠️ Немає прогнозів для перевірки")
                return {'mae': 0, 'should_retrain': False, 'reason': 'no_forecasts'}
            
            # 2. Отримати реальні дані за той же період
            actual = self.db.get_actual_data_for_period(
                district_id,
                forecasts['measured_at'].min(),
                forecasts['measured_at'].max()
            )
            
            if len(actual) == 0:
                print("   ⚠️ Немає реальних даних для порівняння")
                return {'mae': 0, 'should_retrain': False, 'reason': 'no_actual_data'}
            
            # 3. Об'єднати прогнози та реальні дані
            merged = pd.merge(
                forecasts,
                actual,
                on='measured_at',
                suffixes=('_forecast', '_actual')
            )
            
            if len(merged) < 5:
                print("   ⚠️ Недостатньо даних для порівняння")
                return {'mae': 0, 'should_retrain': False, 'reason': 'insufficient_overlap'}
            
            # 4. Розрахувати MAE для кожного параметра
            params = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']
            metrics = {}
            total_mae = 0
            
            for param in params:
                if f'{param}_forecast' in merged.columns and f'{param}_actual' in merged.columns:
                    mae = np.mean(np.abs(
                        merged[f'{param}_actual'] - merged[f'{param}_forecast']
                    ))
                    metrics[param] = {
                        'mae': round(float(mae), 3),
                        'forecast_mean': round(float(merged[f'{param}_forecast'].mean()), 2),
                        'actual_mean': round(float(merged[f'{param}_actual'].mean()), 2)
                    }
                    total_mae += mae
            
            avg_mae = total_mae / len(params)
            
            print(f"   📊 Середня MAE: {avg_mae:.3f}")
            print(f"   📊 Порівняно {len(merged)} точок")
            
            # 5. Визначити чи потрібно перенавчання
            should_retrain = avg_mae > self.RETRAIN_THRESHOLD_MAE
            is_critical = avg_mae > self.CRITICAL_MAE
            
            if is_critical:
                print(f"   🚨 КРИТИЧНА АНОМАЛІЯ! MAE ({avg_mae:.3f}) > {self.CRITICAL_MAE}")
                print(f"   🔴 НЕГАЙНЕ ПЕРЕНАВЧАННЯ!")
            elif should_retrain:
                print(f"   ⚠️ MAE ({avg_mae:.3f}) > порогу ({self.RETRAIN_THRESHOLD_MAE})")
                print(f"   🔄 Рекомендується перенавчання!")
            else:
                print(f"   ✅ Модель працює добре (MAE: {avg_mae:.3f})")
            
            return {
                'mae': round(avg_mae, 3),
                'should_retrain': should_retrain,
                'is_critical': is_critical,
                'metrics': metrics,
                'samples_compared': len(merged),
                'reason': 'critical_anomaly' if is_critical else ('high_error' if should_retrain else 'good_performance')
            }
            
        except Exception as e:
            print(f"   ❌ Помилка перевірки: {e}")
            return {'mae': 0, 'should_retrain': False, 'reason': f'error: {str(e)}'}
    
    def check_last_retrain_time(self, district_id):
        """
        Перевірити коли востаннє була навчена модель
        
        Returns:
            dict: {'hours_since_retrain': int, 'should_retrain': bool}
        """
        model_path = f'trained_models/model_district_{district_id}_xgboost.pkl'
        
        if not os.path.exists(model_path):
            return {'hours_since_retrain': 999, 'should_retrain': True, 'reason': 'no_model'}
        
        # Час останньої модифікації файлу
        last_modified = datetime.fromtimestamp(os.path.getmtime(model_path))
        hours_since = (datetime.now() - last_modified).total_seconds() / 3600
        
        should_retrain = hours_since > self.RETRAIN_THRESHOLD_HOURS
        
        print(f"   🕐 Модель навчена {hours_since:.1f} годин тому")
        
        if should_retrain:
            print(f"   ⚠️ Пройшло > {self.RETRAIN_THRESHOLD_HOURS} годин")
            print(f"   🔄 Рекомендується перенавчання!")
        
        return {
            'hours_since_retrain': round(hours_since, 1),
            'should_retrain': should_retrain,
            'reason': 'time_threshold' if should_retrain else 'recent'
        }
    
    def retrain_model(self, district_id):
        """
        Перенавчити модель для району
        
        Returns:
            dict: результат перенавчання
        """
        print(f"\n🔄 Початок перенавчання моделі для району {district_id}...")
        
        try:
            # 1. Завантажити свіжі дані
            df = self.db.get_training_data(district_id, days=30)
            
            if len(df) < self.MIN_DATA_FOR_RETRAIN:
                return {
                    'success': False,
                    'reason': f'Not enough data: {len(df)} < {self.MIN_DATA_FOR_RETRAIN}'
                }
            
            print(f"   📊 Завантажено {len(df)} записів")
            
            # 2. Підготувати features
            preprocessor = DataPreprocessor(district_id)
            X, y, df_processed = preprocessor.prepare_training_data(df)
            
            if len(X) < 20:
                return {
                    'success': False,
                    'reason': f'Not enough processed data: {len(X)}'
                }
            
            # 3. Розділити на train/val
            X_train, X_val, y_train, y_val = train_test_split(
                X, y, test_size=0.2, random_state=42, shuffle=False
            )
            
            # 4. Навчити модель
            model = AirQualityModel(district_id, model_type='xgboost')
            train_score, val_score = model.train(X_train, y_train, X_val, y_val)
            
            # 5. Оцінити модель
            metrics = model.evaluate(X_val, y_val)
            
            print(f"   ✅ Модель перенавчена!")
            print(f"   📊 Train R²: {train_score:.4f}")
            print(f"   📊 Val R²: {val_score:.4f}")
            
            return {
                'success': True,
                'train_score': round(train_score, 4),
                'val_score': round(val_score, 4),
                'metrics': metrics,
                'training_samples': len(X_train),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"   ❌ Помилка перенавчання: {e}")
            return {
                'success': False,
                'reason': str(e)
            }
    
    def auto_retrain_if_needed(self, district_id):
        """
        Автоматично перенавчити модель якщо потрібно
        
        Returns:
            dict: результат перевірки та перенавчання
        """
        print(f"\n{'='*70}")
        print(f"🤖 AUTO-RETRAIN: Район {district_id}")
        print(f"{'='*70}")
        
        result = {
            'district_id': district_id,
            'timestamp': datetime.now().isoformat(),
            'checks': {},
            'retrained': False
        }
        
        # Перевірка 1: Точність прогнозів
        accuracy_check = self.check_forecast_accuracy(district_id)
        result['checks']['accuracy'] = accuracy_check
        
        # Перевірка 2: Час останнього навчання
        time_check = self.check_last_retrain_time(district_id)
        result['checks']['time'] = time_check
        
        # Рішення про перенавчання
        should_retrain = (
            accuracy_check.get('should_retrain', False) or
            time_check.get('should_retrain', False)
        )
        
        if should_retrain:
            print(f"\n🔄 Запуск перенавчання...")
            retrain_result = self.retrain_model(district_id)
            result['retrain_result'] = retrain_result
            result['retrained'] = retrain_result.get('success', False)
        else:
            print(f"\n✅ Перенавчання не потрібне")
            result['retrained'] = False
        
        print(f"{'='*70}\n")
        
        return result