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
        'version': '2.0.0 - Multi-Output',
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
    """Отримати прогноз для району (ВСІ параметри)"""
    try:
        hours = request.args.get('hours', Config.FORECAST_HOURS, type=int)
        save_to_db = request.args.get('save', 'true').lower() == 'true'
        
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
        
        print(f"\n📍 Запит MULTI-OUTPUT прогнозу для району {district_id} на {hours} годин")
        
        # 1. Завантажити модель
        model = LSTMForecastModel(district_id)
        if not model.load_model():
            return jsonify({
                'success': False,
                'error': f'Model not found for district {district_id}. Please train the model first.',
                'hint': f'POST /api/train/{district_id}'
            }), 404
        
        # 2. Отримати останні дані
        latest_data = db.get_latest_data(district_id, hours=Config.SEQUENCE_LENGTH)
        
        if len(latest_data) < Config.SEQUENCE_LENGTH:
            return jsonify({
                'success': False,
                'error': f'Not enough recent data. Need {Config.SEQUENCE_LENGTH} hours, have {len(latest_data)}',
                'required': Config.SEQUENCE_LENGTH,
                'available': len(latest_data)
            }), 400
        
        # 3. Підготувати дані
        preprocessor = DataPreprocessor(district_id)
        prepared_data = preprocessor.prepare_data(latest_data)
        
        try:
            normalized_data = preprocessor.normalize_data(prepared_data.values, fit=False)
        except Exception as e:
            print(f"⚠️ Помилка нормалізації: {e}")
            return jsonify({
                'success': False,
                'error': 'Scaler not found. Please train the model first.'
            }), 404
        
        # Остання послідовність
        last_sequence = normalized_data[-Config.SEQUENCE_LENGTH:]
        
        # 4. Зробити MULTI-OUTPUT прогноз (всі параметри одночасно!)
        forecast_df = model.predict_future(
            last_sequence=last_sequence,
            n_hours=hours
        )
        
        # 5. Перетворити в JSON
        forecasts = forecast_df.to_dict('records')
        
        for f in forecasts:
            if isinstance(f['measured_at'], pd.Timestamp):
                f['measured_at'] = f['measured_at'].isoformat()
        
        # 6. Зберегти
        if save_to_db:
            db.save_forecast(district_id, forecast_df)
        
        print(f"✅ Multi-output прогноз створено!")
        
        return jsonify({
            'success': True,
            'district_id': district_id,
            'forecast_hours': hours,
            'model_type': 'Multi-Output LSTM',
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
                model = LSTMForecastModel(district_id)
                if not model.load_model():
                    errors.append({
                        'district_id': district_id,
                        'district_name': district['name'],
                        'error': 'Model not found'
                    })
                    continue
                
                latest_data = db.get_latest_data(district_id, hours=Config.SEQUENCE_LENGTH)
                
                if len(latest_data) < Config.SEQUENCE_LENGTH:
                    errors.append({
                        'district_id': district_id,
                        'district_name': district['name'],
                        'error': f'Not enough data: {len(latest_data)}/{Config.SEQUENCE_LENGTH}'
                    })
                    continue
                
                preprocessor = DataPreprocessor(district_id)
                prepared_data = preprocessor.prepare_data(latest_data)
                
                try:
                    normalized_data = preprocessor.normalize_data(prepared_data.values, fit=False)
                except Exception as e:
                    errors.append({
                        'district_id': district_id,
                        'district_name': district['name'],
                        'error': f'Scaler error: {str(e)}'
                    })
                    continue
                
                last_sequence = normalized_data[-Config.SEQUENCE_LENGTH:]
                
                # Multi-output прогноз
                forecast_df = model.predict_future(last_sequence, hours)
                forecasts = forecast_df.to_dict('records')
                
                for f in forecasts:
                    if isinstance(f['measured_at'], pd.Timestamp):
                        f['measured_at'] = f['measured_at'].isoformat()
                
                if save_to_db:
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
            'model_type': 'Multi-Output LSTM',
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
    """Тренувати Multi-Output модель для району"""
    try:
        if district_id < 1 or district_id > 6:
            return jsonify({
                'success': False,
                'error': 'Invalid district_id'
            }), 400
        
        days = request.json.get('days', 30) if request.json else 30
        epochs = request.json.get('epochs', 50) if request.json else 50
        
        print(f"\n🎯 Тренування Multi-Output моделі для району {district_id}")
        
        df = db.get_historical_data(district_id, days=days)
        
        if len(df) < Config.SEQUENCE_LENGTH + 10:
            return jsonify({
                'success': False,
                'error': f'Not enough data. Need at least {Config.SEQUENCE_LENGTH + 10} records.',
                'available': len(df)
            }), 400
        
        # Підготувати дані
        preprocessor = DataPreprocessor(district_id)
        prepared_data = preprocessor.prepare_data(df)
        normalized_data = preprocessor.normalize_data(prepared_data.values, fit=True)
        
        # Створити multi-output послідовності
        X, y_dict = preprocessor.create_multi_output_sequences(normalized_data, Config.SEQUENCE_LENGTH)
        
        # Розділити
        split_idx = int(len(X) * 0.8)
        X_train, X_val = X[:split_idx], X[split_idx:]
        
        y_train_dict = {k: v[:split_idx] for k, v in y_dict.items()}
        y_val_dict = {k: v[split_idx:] for k, v in y_dict.items()}
        
        # Тренувати
        model = LSTMForecastModel(district_id)
        model.build_model(input_shape=(X_train.shape[1], X_train.shape[2]))
        history = model.train(X_train, y_train_dict, X_val, y_val_dict, epochs=epochs, batch_size=16)
        
        # Оцінити
        metrics = model.evaluate(X_val, y_val_dict)
        
        return jsonify({
            'success': True,
            'district_id': district_id,
            'model_type': 'Multi-Output LSTM',
            'training_records': len(df),
            'epochs': len(history.history['loss']),
            'metrics': metrics,
            'trained_at': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Помилка: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/train/all', methods=['POST'])
def train_all_models():
    """Тренувати Multi-Output моделі для всіх районів"""
    try:
        days = request.json.get('days', 30) if request.json else 30
        epochs = request.json.get('epochs', 50) if request.json else 50
        
        results = []
        errors = []
        
        for district in Config.DISTRICTS:
            district_id = district['id']
            try:
                print(f"\n🎯 Multi-Output тренування для району {district_id} ({district['name']})")
                
                df = db.get_historical_data(district_id, days=days)
                
                if len(df) < Config.SEQUENCE_LENGTH + 10:
                    errors.append({
                        'district_id': district_id,
                        'district_name': district['name'],
                        'error': f'Not enough data: {len(df)}'
                    })
                    continue
                
                preprocessor = DataPreprocessor(district_id)
                prepared_data = preprocessor.prepare_data(df)
                normalized_data = preprocessor.normalize_data(prepared_data.values, fit=True)
                
                X, y_dict = preprocessor.create_multi_output_sequences(normalized_data, Config.SEQUENCE_LENGTH)
                
                split_idx = int(len(X) * 0.8)
                X_train, X_val = X[:split_idx], X[split_idx:]
                
                y_train_dict = {k: v[:split_idx] for k, v in y_dict.items()}
                y_val_dict = {k: v[split_idx:] for k, v in y_dict.items()}
                
                model = LSTMForecastModel(district_id)
                model.build_model(input_shape=(X_train.shape[1], X_train.shape[2]))
                model.train(X_train, y_train_dict, X_val, y_val_dict, epochs=epochs, batch_size=16)
                
                metrics = model.evaluate(X_val, y_val_dict)
                
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
            'model_type': 'Multi-Output LSTM',
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
    print("🚀 Starting EcoLviv ML Service v2.0")
    print("   📊 Multi-Output LSTM Model")
    print("="*60)
    print(f"📍 Port: {Config.FLASK_PORT}")
    print(f"🔧 Debug: {Config.FLASK_DEBUG}")
    print(f"💾 Model path: {Config.MODEL_PATH}")
    print(f"🎯 Outputs: PM2.5, PM10, NO2, SO2, CO, O3")
    print("="*60 + "\n")
    
    app.run(
        host='0.0.0.0',
        port=Config.FLASK_PORT,
        debug=Config.FLASK_DEBUG
    )