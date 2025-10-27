from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from utils.db_helper import DatabaseHelper
from data.preprocessor import DataPreprocessor
from models.lstm_model import LSTMForecastModel
import os
import pandas as pd
from datetime import datetime, timedelta
import traceback

app = Flask(__name__)
CORS(app)

# Ініціалізація
os.makedirs(Config.MODEL_PATH, exist_ok=True)
db = DatabaseHelper()

@app.route('/', methods=['GET'])
def index():
    """Головна сторінка API"""
    return jsonify({
        'success': True,
        'message': 'EcoLviv ML Service is running! 🤖',
        'version': '1.0.0',
        'endpoints': {
            'health': '/health',
            'forecast': '/api/forecast/<district_id>',
            'forecast_all': '/api/forecast/all',
            'train': '/api/train/<district_id>',
            'train_all': '/api/train/all',
            'model_info': '/api/model/<district_id>',
            'stats': '/api/stats/<district_id>'
        }
    })

@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    try:
        db_status = db.test_connection()
        return jsonify({
            'status': 'healthy' if db_status else 'unhealthy',
            'service': 'ml-service',
            'database': 'connected' if db_status else 'disconnected',
            'timestamp': datetime.now().isoformat()
        }), 200 if db_status else 503
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503

@app.route('/api/forecast/<int:district_id>', methods=['GET'])
def get_forecast(district_id):
    """
    Отримати прогноз для району
    
    Query params:
        hours (int): Кількість годин для прогнозу (default: 24)
        save (bool): Зберегти прогноз в БД (default: true)
    """
    try:
        hours = request.args.get('hours', Config.FORECAST_HOURS, type=int)
        save_to_db = request.args.get('save', 'true').lower() == 'true'
        
        # Валідація
        if district_id < 1 or district_id > 6:
            return jsonify({
                'success': False,
                'error': 'Invalid district_id. Must be between 1 and 6'
            }), 400
        
        if hours < 1 or hours > 168:
            return jsonify({
                'success': False,
                'error': 'Invalid hours. Must be between 1 and 168'
            }), 400
        
        print(f"\n📍 Запит прогнозу для району {district_id} на {hours} годин")
        
        # 1. Завантажити модель
        model = LSTMForecastModel(district_id)
        if not model.load_model():
            return jsonify({
                'success': False,
                'error': f'Model not found for district {district_id}. Please train the model first.',
                'hint': f'POST /api/train/{district_id}'
            }), 404
        
        # 2. Отримати останні дані
        df = db.get_latest_data(district_id, hours=Config.SEQUENCE_LENGTH)
        
        if len(df) < Config.SEQUENCE_LENGTH:
            return jsonify({
                'success': False,
                'error': f'Not enough data. Need at least {Config.SEQUENCE_LENGTH} records.',
                'available': len(df)
            }), 400
        
        # 3. Підготувати дані
        preprocessor = DataPreprocessor(district_id)
        prepared_data = preprocessor.prepare_data(df)
        
        if prepared_data is None or prepared_data.empty:
            return jsonify({
                'success': False,
                'error': 'Data preparation failed'
            }), 500
        
        # 4. Нормалізувати
        normalized_data = preprocessor.normalize_data(prepared_data.values, fit=False)
        
        # 5. Взяти останню послідовність
        last_sequence = normalized_data[-Config.SEQUENCE_LENGTH:]
        
        # 6. Прогноз
        predictions = model.predict_future(last_sequence, n_hours=hours)
        
        # 7. Повернути до оригінального масштабу
        predicted_pm25 = preprocessor.inverse_transform_predictions(predictions)
        
        # 8. Створити DataFrame з прогнозами
        last_timestamp = df['measured_at'].max()
        forecast_times = [last_timestamp + timedelta(hours=i+1) for i in range(hours)]
        
        forecasts = []
        for i, (time, pm25) in enumerate(zip(forecast_times, predicted_pm25)):
            aqi, aqi_status = preprocessor.calculate_aqi_from_pm25(pm25)
            
            forecasts.append({
                'hour': i + 1,
                'measured_at': time.isoformat(),
                'pm25': round(float(pm25), 2),
                'aqi': int(aqi),
                'aqi_status': aqi_status,
                'confidence_level': 0.85
            })
        
        # 9. Зберегти прогнози в БД
        if save_to_db:
            forecast_df = pd.DataFrame(forecasts)
            forecast_df['measured_at'] = pd.to_datetime(forecast_df['measured_at'])
            
            # Додаємо інші поля для БД
            forecast_df['pm10'] = None
            forecast_df['no2'] = None
            forecast_df['so2'] = None
            forecast_df['co'] = None
            forecast_df['o3'] = None
            forecast_df['temperature'] = None
            forecast_df['humidity'] = None
            forecast_df['pressure'] = None
            forecast_df['wind_speed'] = None
            forecast_df['wind_direction'] = None
            
            db.save_forecast(district_id, forecast_df)
        
        print(f"✅ Прогноз створено успішно")
        
        return jsonify({
            'success': True,
            'district_id': district_id,
            'forecast_hours': hours,
            'forecasts': forecasts,
            'generated_at': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Помилка: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/forecast/all', methods=['GET'])
def get_forecast_all():
    """Отримати прогнози для всіх районів"""
    try:
        hours = request.args.get('hours', Config.FORECAST_HOURS, type=int)
        save_to_db = request.args.get('save', 'true').lower() == 'true'
        
        results = []
        errors = []
        
        for district in Config.DISTRICTS:
            district_id = district['id']
            try:
                # Використовуємо той самий код що й для одного району
                model = LSTMForecastModel(district_id)
                if not model.load_model():
                    errors.append({
                        'district_id': district_id,
                        'district_name': district['name'],
                        'error': 'Model not found'
                    })
                    continue
                
                df = db.get_latest_data(district_id, hours=Config.SEQUENCE_LENGTH)
                
                if len(df) < Config.SEQUENCE_LENGTH:
                    errors.append({
                        'district_id': district_id,
                        'district_name': district['name'],
                        'error': 'Not enough data'
                    })
                    continue
                
                preprocessor = DataPreprocessor(district_id)
                prepared_data = preprocessor.prepare_data(df)
                normalized_data = preprocessor.normalize_data(prepared_data.values, fit=False)
                last_sequence = normalized_data[-Config.SEQUENCE_LENGTH:]
                predictions = model.predict_future(last_sequence, n_hours=hours)
                predicted_pm25 = preprocessor.inverse_transform_predictions(predictions)
                
                last_timestamp = df['measured_at'].max()
                forecast_times = [last_timestamp + timedelta(hours=i+1) for i in range(hours)]
                
                forecasts = []
                for i, (time, pm25) in enumerate(zip(forecast_times, predicted_pm25)):
                    aqi, aqi_status = preprocessor.calculate_aqi_from_pm25(pm25)
                    forecasts.append({
                        'hour': i + 1,
                        'measured_at': time.isoformat(),
                        'pm25': round(float(pm25), 2),
                        'aqi': int(aqi),
                        'aqi_status': aqi_status
                    })
                
                if save_to_db:
                    forecast_df = pd.DataFrame(forecasts)
                    forecast_df['measured_at'] = pd.to_datetime(forecast_df['measured_at'])
                    forecast_df['pm10'] = None
                    forecast_df['no2'] = None
                    forecast_df['so2'] = None
                    forecast_df['co'] = None
                    forecast_df['o3'] = None
                    forecast_df['temperature'] = None
                    forecast_df['humidity'] = None
                    forecast_df['pressure'] = None
                    forecast_df['wind_speed'] = None
                    forecast_df['wind_direction'] = None
                    db.save_forecast(district_id, forecast_df)
                
                results.append({
                    'district_id': district_id,
                    'district_name': district['name'],
                    'forecasts': forecasts
                })
                
            except Exception as e:
                errors.append({
                    'district_id': district_id,
                    'district_name': district['name'],
                    'error': str(e)
                })
        
        return jsonify({
            'success': True,
            'total_districts': len(Config.DISTRICTS),
            'successful': len(results),
            'failed': len(errors),
            'results': results,
            'errors': errors if errors else None,
            'generated_at': datetime.now().isoformat()
        })
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/train/<int:district_id>', methods=['POST'])
def train_model(district_id):
    """Тренувати модель для конкретного району"""
    try:
        # Валідація
        if district_id < 1 or district_id > 6:
            return jsonify({
                'success': False,
                'error': 'Invalid district_id'
            }), 400
        
        # Параметри з request
        days = request.json.get('days', 30) if request.json else 30
        epochs = request.json.get('epochs', 50) if request.json else 50
        
        print(f"\n🎯 Тренування моделі для району {district_id}")
        
        # 1. Отримати дані
        df = db.get_historical_data(district_id, days=days)
        
        if len(df) < Config.SEQUENCE_LENGTH + 10:
            return jsonify({
                'success': False,
                'error': f'Not enough data. Need at least {Config.SEQUENCE_LENGTH + 10} records.',
                'available': len(df)
            }), 400
        
        # 2. Підготувати дані
        preprocessor = DataPreprocessor(district_id)
        prepared_data = preprocessor.prepare_data(df)
        normalized_data = preprocessor.normalize_data(prepared_data.values, fit=True)
        
        # 3. Створити послідовності
        X, y = preprocessor.create_sequences(normalized_data, Config.SEQUENCE_LENGTH)
        
        # 4. Розділити на train/val
        split_idx = int(len(X) * 0.8)
        X_train, X_val = X[:split_idx], X[split_idx:]
        y_train, y_val = y[:split_idx], y[split_idx:]
        
        # 5. Тренувати модель
        model = LSTMForecastModel(district_id)
        model.build_model(input_shape=(X_train.shape[1], X_train.shape[2]))
        
        history = model.train(
            X_train, y_train,
            X_val, y_val,
            epochs=epochs,
            batch_size=16
        )
        
        # 6. Оцінити модель
        metrics = model.evaluate(X_val, y_val)
        
        return jsonify({
            'success': True,
            'district_id': district_id,
            'training_records': len(df),
            'sequences_created': len(X),
            'epochs_trained': len(history.history['loss']),
            'metrics': metrics,
            'model_path': model.model_path,
            'trained_at': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Помилка тренування: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/train/all', methods=['POST'])
def train_all_models():
    """Тренувати моделі для всіх районів"""
    try:
        days = request.json.get('days', 30) if request.json else 30
        epochs = request.json.get('epochs', 50) if request.json else 50
        
        results = []
        errors = []
        
        for district in Config.DISTRICTS:
            district_id = district['id']
            try:
                print(f"\n🎯 Тренування району {district_id}: {district['name']}")
                
                df = db.get_historical_data(district_id, days=days)
                
                if len(df) < Config.SEQUENCE_LENGTH + 10:
                    errors.append({
                        'district_id': district_id,
                        'district_name': district['name'],
                        'error': 'Not enough data'
                    })
                    continue
                
                preprocessor = DataPreprocessor(district_id)
                prepared_data = preprocessor.prepare_data(df)
                normalized_data = preprocessor.normalize_data(prepared_data.values, fit=True)
                X, y = preprocessor.create_sequences(normalized_data, Config.SEQUENCE_LENGTH)
                
                split_idx = int(len(X) * 0.8)
                X_train, X_val = X[:split_idx], X[split_idx:]
                y_train, y_val = y[:split_idx], y[split_idx:]
                
                model = LSTMForecastModel(district_id)
                model.build_model(input_shape=(X_train.shape[1], X_train.shape[2]))
                model.train(X_train, y_train, X_val, y_val, epochs=epochs, batch_size=16)
                
                metrics = model.evaluate(X_val, y_val)
                
                results.append({
                    'district_id': district_id,
                    'district_name': district['name'],
                    'training_records': len(df),
                    'metrics': metrics
                })
                
            except Exception as e:
                errors.append({
                    'district_id': district_id,
                    'district_name': district['name'],
                    'error': str(e)
                })
        
        return jsonify({
            'success': True,
            'total_districts': len(Config.DISTRICTS),
            'successful': len(results),
            'failed': len(errors),
            'results': results,
            'errors': errors if errors else None,
            'trained_at': datetime.now().isoformat()
        })
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/model/<int:district_id>', methods=['GET'])
def get_model_info(district_id):
    """Отримати інформацію про модель"""
    try:
        if district_id < 1 or district_id > 6:
            return jsonify({
                'success': False,
                'error': 'Invalid district_id'
            }), 400
        
        model = LSTMForecastModel(district_id)
        info = model.get_model_info()
        
        # Додати статистику по даних
        stats = db.get_data_stats(district_id)
        info['data_stats'] = stats
        
        return jsonify({
            'success': True,
            'model_info': info
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/stats/<int:district_id>', methods=['GET'])
def get_district_stats(district_id):
    """Отримати статистику по району"""
    try:
        if district_id < 1 or district_id > 6:
            return jsonify({
                'success': False,
                'error': 'Invalid district_id'
            }), 400
        
        stats = db.get_data_stats(district_id)
        
        return jsonify({
            'success': True,
            'district_id': district_id,
            'stats': stats
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 Starting EcoLviv ML Service")
    print("="*60)
    print(f"📍 Port: {Config.FLASK_PORT}")
    print(f"🔧 Debug: {Config.FLASK_DEBUG}")
    print(f"💾 Model path: {Config.MODEL_PATH}")
    print("="*60 + "\n")
    
    app.run(
        host='0.0.0.0',
        port=Config.FLASK_PORT,
        debug=Config.FLASK_DEBUG
    )