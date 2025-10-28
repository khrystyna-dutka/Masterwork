# ml-service/app.py
"""
EcoLviv ML Service - Multi-Output LSTM для прогнозування якості повітря
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from utils.db_helper import DatabaseHelper
from data.preprocessor import DataPreprocessor
from models.lstm_model import LSTMForecastModel
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import traceback

app = Flask(__name__)
CORS(app)

# Ініціалізація
os.makedirs(Config.MODEL_PATH, exist_ok=True)
db = DatabaseHelper()

# ==================== БАЗОВІ ENDPOINTS ====================

@app.route('/', methods=['GET'])
def index():
    """Головна сторінка API"""
    return jsonify({
        'success': True,
        'message': 'EcoLviv ML Service is running! 🤖',
        'version': '2.0.0 - Multi-Output LSTM',
        'endpoints': {
            'health': '/health',
            'dashboard': '/dashboard',
            'forecast': '/api/forecast/<district_id>',
            'forecast_all': '/api/forecast/all',
            'train': '/api/train/<district_id>',
            'model_info': '/api/model/<district_id>',
            'metrics': '/api/model/metrics/<district_id>',
            'scaler': '/api/scaler/<district_id>',
            'training_history': '/api/model/training-history/<district_id>',
            'stats': '/api/stats'
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

# ==================== API ПРОГНОЗУВАННЯ ====================

@app.route('/api/forecast/<int:district_id>', methods=['GET'])
def get_forecast(district_id):
    """Отримати прогноз для району"""
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
        
        print(f"\n📍 Прогноз для району {district_id} на {hours} годин")
        
        # 1. Завантажити модель
        model = LSTMForecastModel(district_id)
        if not model.load_model():
            return jsonify({
                'success': False,
                'error': f'Model not found for district {district_id}. Please train first.',
                'hint': f'POST /api/train/{district_id}'
            }), 404
        
        # 2. Отримати останні дані
        latest_data = db.get_latest_data(district_id, hours=Config.SEQUENCE_LENGTH)
        
        if len(latest_data) < Config.SEQUENCE_LENGTH:
            return jsonify({
                'success': False,
                'error': f'Not enough data. Need {Config.SEQUENCE_LENGTH}, got {len(latest_data)}'
            }), 400
        
        # 3. Підготувати послідовність
        preprocessor = DataPreprocessor(district_id)
        prepared_data = preprocessor.prepare_data(latest_data)
        normalized_data = preprocessor.normalize_data(prepared_data.values, fit=False)
        last_sequence = normalized_data[-Config.SEQUENCE_LENGTH:]
        
        # 4. Прогноз
        forecast_df = model.predict_future(
            last_sequence=last_sequence,
            n_hours=hours
        )
        
        # 5. Конвертувати в JSON (з обробкою NaN)
        forecasts = forecast_df.to_dict('records')
        
        for f in forecasts:
            # Замінити NaN на None (стане null в JSON)
            for key, value in f.items():
                if isinstance(value, float) and (np.isnan(value) or np.isinf(value)):
                    f[key] = None
            
            # Конвертувати дату
            if isinstance(f['measured_at'], pd.Timestamp):
                f['measured_at'] = f['measured_at'].isoformat()
        
        # 6. Зберегти в БД
        if save_to_db:
            db.save_forecast(district_id, forecast_df)
            print(f"✅ Збережено {len(forecasts)} прогнозів")
        
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
                        'error': f'Not enough data: {len(latest_data)}'
                    })
                    continue
                
                preprocessor = DataPreprocessor(district_id)
                prepared_data = preprocessor.prepare_data(latest_data)
                normalized_data = preprocessor.normalize_data(prepared_data.values, fit=False)
                last_sequence = normalized_data[-Config.SEQUENCE_LENGTH:]
                
                forecast_df = model.predict_future(last_sequence, hours)
                
                if save_to_db:
                    db.save_forecast(district_id, forecast_df)
                
                results.append({
                    'district_id': district_id,
                    'district_name': district['name'],
                    'forecast_count': len(forecast_df)
                })
                
            except Exception as e:
                errors.append({
                    'district_id': district_id,
                    'district_name': district['name'],
                    'error': str(e)
                })
        
        return jsonify({
            'success': True,
            'results': results,
            'errors': errors,
            'generated_at': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Помилка: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== API НАВЧАННЯ ====================

@app.route('/api/train/<int:district_id>', methods=['POST'])
def train_model(district_id):
    """Натренувати модель для району"""
    try:
        if district_id < 1 or district_id > 6:
            return jsonify({
                'success': False,
                'error': 'Invalid district_id'
            }), 400
        
        data = request.get_json() or {}
        days = data.get('days', 365)
        epochs = data.get('epochs', 50)
        
        print(f"\n🎓 Тренування моделі для району {district_id}")
        print(f"   Днів даних: {days}, Епох: {epochs}")
        
        # Отримати дані
        df = db.get_historical_data(district_id, days=days)
        
        if len(df) < Config.SEQUENCE_LENGTH + 50:
            return jsonify({
                'success': False,
                'error': f'Not enough data. Need at least {Config.SEQUENCE_LENGTH + 50}, got {len(df)}'
            }), 400
        
        # Підготувати
        preprocessor = DataPreprocessor(district_id)
        prepared_data = preprocessor.prepare_data(df)
        normalized_data = preprocessor.normalize_data(prepared_data.values, fit=True)
        
        # Створити послідовності
        X, y_dict = preprocessor.create_multi_output_sequences(
            normalized_data,
            Config.SEQUENCE_LENGTH
        )
        
        if len(X) == 0:
            return jsonify({
                'success': False,
                'error': 'Could not create sequences'
            }), 400
        
        # Розділити
        split_idx = int(len(X) * 0.8)
        X_train, X_val = X[:split_idx], X[split_idx:]
        y_train = {k: v[:split_idx] for k, v in y_dict.items()}
        y_val = {k: v[split_idx:] for k, v in y_dict.items()}
        
        # Натренувати
        model = LSTMForecastModel(district_id)
        model.build_model(input_shape=(X_train.shape[1], X_train.shape[2]))
        
        history = model.train(
            X_train, y_train,
            X_val, y_val,
            epochs=epochs,
            batch_size=16
        )
        
        metrics = model.evaluate(X_val, y_val)
        
        return jsonify({
            'success': True,
            'district_id': district_id,
            'training_samples': len(X_train),
            'validation_samples': len(X_val),
            'epochs': epochs,
            'final_loss': float(history.history['loss'][-1]),
            'metrics': metrics,
            'model_path': model.model_path
        })
        
    except Exception as e:
        print(f"❌ Помилка: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== API МЕТРИК ====================

@app.route('/api/model/metrics/<int:district_id>', methods=['GET'])
def get_model_metrics(district_id):
    """Отримати метрики моделі для dashboard"""
    try:
        if district_id < 1 or district_id > 6:
            return jsonify({'success': False, 'error': 'Invalid district_id'}), 400
        
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # 1. Статистика навчання
        cursor.execute("""
            SELECT 
                COUNT(*) as total_records,
                MIN(measured_at) as first_record,
                MAX(measured_at) as last_record
            FROM air_quality_history
            WHERE district_id = %s AND is_forecast = FALSE
        """, (district_id,))
        
        training_stats = cursor.fetchone()
        
        # 2. Статистика feedback
        cursor.execute("""
            SELECT 
                COUNT(*) as total_feedback,
                AVG(avg_error) as avg_error,
                AVG(error_pm25) as avg_pm25_error,
                AVG(error_pm10) as avg_pm10_error,
                AVG(error_no2) as avg_no2_error,
                AVG(error_so2) as avg_so2_error,
                AVG(error_co) as avg_co_error,
                AVG(error_o3) as avg_o3_error,
                MIN(created_at) as first_feedback,
                MAX(created_at) as last_feedback,
                COUNT(*) FILTER (WHERE used_for_training = TRUE) as used_for_training
            FROM training_feedback
            WHERE district_id = %s
        """, (district_id,))
        
        feedback_stats = cursor.fetchone()
        
        # 3. Прогнози vs реальність (з training_feedback)
        cursor.execute("""
            SELECT 
                tf.forecast_for,
                tf.predicted_pm25, tf.actual_pm25, tf.error_pm25,
                tf.predicted_pm10, tf.actual_pm10, tf.error_pm10,
                tf.predicted_no2, tf.actual_no2, tf.error_no2,
                tf.predicted_so2, tf.actual_so2, tf.error_so2,
                tf.predicted_co, tf.actual_co, tf.error_co,
                tf.predicted_o3, tf.actual_o3, tf.error_o3
            FROM training_feedback tf
            WHERE tf.district_id = %s
            ORDER BY tf.forecast_for DESC
            LIMIT 50
        """, (district_id,))
        
        predictions_history = cursor.fetchall()
        
        # 4. ⭐ НОВЕ: Історичні дані (останні 24 год)
        cursor.execute("""
            SELECT 
                measured_at,
                pm25, pm10, no2, so2, co, o3
            FROM air_quality_history
            WHERE district_id = %s 
              AND is_forecast = FALSE
              AND measured_at >= NOW() - INTERVAL '24 hours'
            ORDER BY measured_at ASC
        """, (district_id,))
        
        historical_data = cursor.fetchall()
        
        # 5. ⭐ НОВЕ: Прогнози (останні збережені)
        cursor.execute("""
            SELECT 
                measured_at,
                pm25, pm10, no2, so2, co, o3
            FROM air_quality_history
            WHERE district_id = %s 
              AND is_forecast = TRUE
              AND measured_at >= NOW() - INTERVAL '6 hours'
            ORDER BY measured_at ASC
            LIMIT 100
        """, (district_id,))
        
        forecast_data = cursor.fetchall()
        
        # Інформація про модель
        model = LSTMForecastModel(district_id)
        model_exists = model.load_model()
        
        model_info = {}
        if model_exists:
            model_info = model.get_model_info()
        
        cursor.close()
        conn.close()
        
        # Безпечна конвертація
        def safe_float(value, default=0.0):
            if value is None:
                return default
            try:
                f = float(value)
                if f != f or f == float('inf') or f == float('-inf'):
                    return default
                return f
            except (ValueError, TypeError):
                return default
        
        # Форматування feedback
        predictions_data = []
        for row in predictions_history:
            predictions_data.append({
                'time': row[0].isoformat() if row[0] else None,
                'predicted_pm25': safe_float(row[1]),
                'actual_pm25': safe_float(row[2]),
                'error_pm25': safe_float(row[3]),
                'predicted_pm10': safe_float(row[4]),
                'actual_pm10': safe_float(row[5]),
                'error_pm10': safe_float(row[6]),
                'predicted_no2': safe_float(row[7]),
                'actual_no2': safe_float(row[8]),
                'error_no2': safe_float(row[9]),
                'predicted_so2': safe_float(row[10]),
                'actual_so2': safe_float(row[11]),
                'error_so2': safe_float(row[12]),
                'predicted_co': safe_float(row[13]),
                'actual_co': safe_float(row[14]),
                'error_co': safe_float(row[15]),
                'predicted_o3': safe_float(row[16]),
                'actual_o3': safe_float(row[17]),
                'error_o3': safe_float(row[18])
            })
        
        # ⭐ Форматування історичних даних
        historical_formatted = []
        for row in historical_data:
            historical_formatted.append({
                'time': row[0].isoformat() if row[0] else None,
                'pm25': safe_float(row[1]),
                'pm10': safe_float(row[2]),
                'no2': safe_float(row[3]),
                'so2': safe_float(row[4]),
                'co': safe_float(row[5]),
                'o3': safe_float(row[6])
            })
        
        # ⭐ Форматування прогнозів
        forecast_formatted = []
        for row in forecast_data:
            forecast_formatted.append({
                'time': row[0].isoformat() if row[0] else None,
                'pm25': safe_float(row[1]),
                'pm10': safe_float(row[2]),
                'no2': safe_float(row[3]),
                'so2': safe_float(row[4]),
                'co': safe_float(row[5]),
                'o3': safe_float(row[6])
            })
        
        days_of_data = 0
        if training_stats[1] and training_stats[2]:
            days_of_data = (training_stats[2] - training_stats[1]).days
        
        return jsonify({
            'success': True,
            'district_id': district_id,
            'district_name': Config.DISTRICTS[district_id-1]['name'],
            'training_stats': {
                'total_records': training_stats[0] or 0,
                'first_record': training_stats[1].isoformat() if training_stats[1] else None,
                'last_record': training_stats[2].isoformat() if training_stats[2] else None,
                'days_of_data': days_of_data
            },
            'feedback_stats': {
                'total_feedback': feedback_stats[0] or 0,
                'avg_error': safe_float(feedback_stats[1]),
                'avg_pm25_error': safe_float(feedback_stats[2]),
                'avg_pm10_error': safe_float(feedback_stats[3]),
                'avg_no2_error': safe_float(feedback_stats[4]),
                'avg_so2_error': safe_float(feedback_stats[5]),
                'avg_co_error': safe_float(feedback_stats[6]),
                'avg_o3_error': safe_float(feedback_stats[7]),
                'used_for_training': feedback_stats[10] or 0,
                'first_feedback': feedback_stats[8].isoformat() if feedback_stats[8] else None,
                'last_feedback': feedback_stats[9].isoformat() if feedback_stats[9] else None
            },
            'model_info': model_info,
            'predictions_history': predictions_data,
            'historical_data': historical_formatted,  # ⭐ НОВЕ
            'forecast_data': forecast_formatted  # ⭐ НОВЕ
        })
        
    except Exception as e:
        print(f"❌ Помилка: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/scaler/<int:district_id>', methods=['GET'])
def get_scaler_info(district_id):
    """Отримати інформацію про scaler"""
    try:
        preprocessor = DataPreprocessor(district_id)
        scaler_info = preprocessor.get_scaler_info()
        
        return jsonify({
            'success': True,
            'district_id': district_id,
            'scaler_info': scaler_info
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/model/training-history/<int:district_id>', methods=['GET'])
def get_training_history(district_id):
    """Отримати історію навчання"""
    try:
        if district_id < 1 or district_id > 6:
            return jsonify({'success': False, 'error': 'Invalid district_id'}), 400
        
        conn = db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                DATE(created_at) as date,
                AVG(avg_error) as avg_error,
                AVG(error_pm25) as avg_pm25_error,
                COUNT(*) as feedback_count
            FROM training_feedback
            WHERE district_id = %s
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) ASC
            LIMIT 30
        """, (district_id,))
        
        history = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        history_data = []
        for row in history:
            history_data.append({
                'date': row[0].isoformat() if row[0] else None,
                'avg_error': float(row[1]) if row[1] else 0,
                'avg_pm25_error': float(row[2]) if row[2] else 0,
                'feedback_count': row[3] or 0
            })
        
        return jsonify({
            'success': True,
            'district_id': district_id,
            'history': history_data
        })
        
    except Exception as e:
        print(f"❌ Помилка: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Загальна статистика"""
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                district_id,
                COUNT(*) as total_records
            FROM air_quality_history
            WHERE is_forecast = FALSE
            GROUP BY district_id
            ORDER BY district_id
        """)
        
        stats = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'districts': [
                {
                    'district_id': row[0],
                    'district_name': Config.DISTRICTS[row[0]-1]['name'],
                    'total_records': row[1]
                }
                for row in stats
            ]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== DASHBOARD ====================

@app.route('/dashboard')
def dashboard():
    """HTML Dashboard для моніторингу моделей"""
    html_content = """
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EcoLviv ML Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 15px;
            min-height: 100vh;
        }
        .container { max-width: 1600px; margin: 0 auto; }
        
        .header {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
        }
        .header-left h1 { color: #667eea; font-size: 2em; margin-bottom: 5px; }
        .header-left p { color: #666; font-size: 1em; }
        .header-right { margin-top: 10px; }
        .export-btn {
            padding: 12px 24px;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1em;
            cursor: pointer;
            transition: all 0.3s;
        }
        .export-btn:hover {
            background: #059669;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        
        .district-selector {
            background: white;
            padding: 15px;
            border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: center;
        }
        .district-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            background: #667eea;
            color: white;
            font-size: 0.95em;
            cursor: pointer;
            transition: all 0.3s;
        }
        .district-btn:hover {
            background: #764ba2;
            transform: translateY(-2px);
        }
        .district-btn.active {
            background: #764ba2;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin-bottom: 20px;
        }
        .metric-card {
            background: white;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }
        .metric-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.15);
        }
        .metric-card h3 {
            color: #666;
            font-size: 0.75em;
            margin-bottom: 8px;
            text-transform: uppercase;
            font-weight: 600;
        }
        .metric-card .value {
            color: #667eea;
            font-size: 1.8em;
            font-weight: bold;
            line-height: 1;
        }
        .metric-card .label {
            color: #999;
            font-size: 0.8em;
            margin-top: 4px;
        }
        
        .parameter-selector {
            background: white;
            padding: 15px;
            border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .parameter-selector h3 {
            color: #667eea;
            font-size: 1.1em;
            margin-bottom: 12px;
        }
        .param-buttons {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .param-btn {
            padding: 8px 16px;
            border: 2px solid #667eea;
            border-radius: 8px;
            background: white;
            color: #667eea;
            font-size: 0.9em;
            cursor: pointer;
            transition: all 0.3s;
        }
        .param-btn:hover { background: #f0f0f0; }
        .param-btn.active {
            background: #667eea;
            color: white;
        }
        
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .chart-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .chart-card h2 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.1em;
        }
        .chart-wrapper {
            position: relative;
            height: 350px;
        }
        
        .stats-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .stats-table th,
        .stats-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        .stats-table th {
            background: #f8f9fa;
            color: #667eea;
            font-weight: 600;
            font-size: 0.9em;
        }
        .stats-table td {
            color: #666;
            font-size: 0.95em;
        }
        .stats-table tr:hover { background: #f8f9fa; }
        
        .loading {
            text-align: center;
            padding: 50px;
            color: white;
            font-size: 1.5em;
        }
        .error {
            background: #ff6b6b;
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
            text-align: center;
        }
        
        .info-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
        }
        .badge-success { background: #51cf66; color: white; }
        .badge-warning { background: #ffd43b; color: #333; }
        
        @media (max-width: 1200px) {
            .charts-grid {
                grid-template-columns: 1fr;
            }
        }
        
        @media (max-width: 768px) {
            .header {
                flex-direction: column;
                text-align: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-left">
                <h1>🤖 EcoLviv ML Dashboard</h1>
                <p>Моніторинг Multi-Output LSTM моделі</p>
            </div>
            <div class="header-right">
                <button class="export-btn" onclick="exportMetrics()">
                    📊 Експорт метрик
                </button>
            </div>
        </div>

        <div class="district-selector" id="districtSelector"></div>
        <div id="metricsContainer"></div>
        
        <div class="parameter-selector">
            <h3>📊 Виберіть параметр:</h3>
            <div class="param-buttons">
                <button class="param-btn active" onclick="selectParameter('pm25')">PM2.5</button>
                <button class="param-btn" onclick="selectParameter('pm10')">PM10</button>
                <button class="param-btn" onclick="selectParameter('no2')">NO₂</button>
                <button class="param-btn" onclick="selectParameter('so2')">SO₂</button>
                <button class="param-btn" onclick="selectParameter('co')">CO</button>
                <button class="param-btn" onclick="selectParameter('o3')">O₃</button>
            </div>
        </div>
        
        <div id="chartsContainer"></div>
    </div>

    <script>
        const districts = [
            {id: 1, name: 'Галицький'},
            {id: 2, name: 'Залізничний'},
            {id: 3, name: 'Личаківський'},
            {id: 4, name: 'Сихівський'},
            {id: 5, name: 'Франківський'},
            {id: 6, name: 'Шевченківський'}
        ];

        const parameterNames = {
            'pm25': 'PM2.5', 'pm10': 'PM10', 'no2': 'NO₂',
            'so2': 'SO₂', 'co': 'CO', 'o3': 'O₃'
        };
        
        const parameterUnits = {
            'pm25': 'μg/m³', 'pm10': 'μg/m³', 'no2': 'μg/m³',
            'so2': 'μg/m³', 'co': 'mg/m³', 'o3': 'μg/m³'
        };

        let currentDistrict = 1;
        let currentParameter = 'pm25';
        let currentData = null;
        let predictionChart = null;
        let errorChart = null;

        function createDistrictButtons() {
            const selector = document.getElementById('districtSelector');
            districts.forEach(district => {
                const btn = document.createElement('button');
                btn.className = 'district-btn' + (district.id === 1 ? ' active' : '');
                btn.textContent = district.name;
                btn.onclick = () => selectDistrict(district.id);
                btn.id = `district-btn-${district.id}`;
                selector.appendChild(btn);
            });
        }

        function selectDistrict(districtId) {
            currentDistrict = districtId;
            document.querySelectorAll('.district-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.getElementById(`district-btn-${districtId}`).classList.add('active');
            loadMetrics(districtId);
        }
        
        function selectParameter(param) {
            currentParameter = param;
            document.querySelectorAll('.param-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
            
            if (currentData) {
                renderCharts(currentData);
            }
        }

        async function loadMetrics(districtId) {
            try {
                document.getElementById('metricsContainer').innerHTML = '<div class="loading">⏳ Завантаження...</div>';
                document.getElementById('chartsContainer').innerHTML = '';
                
                const response = await fetch(`/api/model/metrics/${districtId}`);
                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error);
                }

                currentData = data;
                renderMetrics(data);
                renderCharts(data);
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('metricsContainer').innerHTML = 
                    `<div class="error">❌ Помилка: ${error.message}</div>`;
            }
        }

        function renderMetrics(data) {
            const ts = data.training_stats;
            const fs = data.feedback_stats;
            const mi = data.model_info;
            
            const accuracy = fs.total_feedback > 0 ? 
                (100 - (fs.avg_pm25_error * 100)).toFixed(1) : 'N/A';
            
            const html = `
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h3>📊 Тренувальні дані</h3>
                        <div class="value">${ts.total_records.toLocaleString()}</div>
                        <div class="label">записів (${ts.days_of_data} днів)</div>
                    </div>
                    <div class="metric-card">
                        <h3>🔄 Валідовано</h3>
                        <div class="value">${fs.total_feedback}</div>
                        <div class="label">${fs.used_for_training} використано</div>
                    </div>
                    <div class="metric-card">
                        <h3>🎯 Точність</h3>
                        <div class="value">${accuracy}%</div>
                        <div class="label">середня PM2.5</div>
                    </div>
                    <div class="metric-card">
                        <h3>📈 Помилка MAE</h3>
                        <div class="value">${(fs.avg_error * 100).toFixed(2)}%</div>
                        <div class="label">загальна</div>
                    </div>
                    <div class="metric-card">
                        <h3>✅ Статус</h3>
                        <div class="value">${mi.model_exists ? '🟢' : '🔴'}</div>
                        <div class="label">${mi.model_exists ? 'Активна' : 'Не навчена'}</div>
                    </div>
                    <div class="metric-card">
                        <h3>🧠 Модель</h3>
                        <div class="value" style="font-size: 1.2em;">LSTM</div>
                        <div class="label">Multi-Output (6 параметрів)</div>
                    </div>
                </div>
            `;
            
            document.getElementById('metricsContainer').innerHTML = html;
        }

        function renderCharts(data) {
            const container = document.getElementById('chartsContainer');
            
            // Перевірка чи є дані
            if (data.historical_data.length === 0 && data.forecast_data.length === 0) {
                container.innerHTML = `
                    <div class="chart-card">
                        <h2>⚠️ Немає даних для візуалізації</h2>
                        <p style="color: #666; margin-top: 10px;">
                            Зачекайте поки backend зібере дані або створіть прогнози.
                        </p>
                    </div>
                `;
                return;
            }
            
            const fs = data.feedback_stats;
            const param = currentParameter;
            const paramName = parameterNames[param];
            const unit = parameterUnits[param];
            
            container.innerHTML = `
                <div class="charts-grid">
                    <div class="chart-card">
                        <h2>📈 Історія + Прогноз - ${paramName}</h2>
                        <div class="chart-wrapper">
                            <canvas id="predictionChart"></canvas>
                        </div>
                    </div>
                    
                    <div class="chart-card">
                        <h2>📊 Точність всіх параметрів</h2>
                        <div class="chart-wrapper">
                            <canvas id="errorChart"></canvas>
                        </div>
                    </div>
                </div>
                
                <div class="chart-card" style="margin-top: 20px;">
                    <h2>📋 Детальна статистика</h2>
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th>Параметр</th>
                                <th>Помилка MAE</th>
                                <th>Точність</th>
                                <th>Статус</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'].map(p => {
                                const error = fs['avg_' + p + '_error'] * 100;
                                const accuracy = 100 - error;
                                const status = error < 10 ? 'badge-success' : 'badge-warning';
                                const statusText = error < 10 ? 'Відмінно' : 'Добре';
                                return `
                                    <tr>
                                        <td><strong>${parameterNames[p]}</strong></td>
                                        <td>${error.toFixed(2)}%</td>
                                        <td>${accuracy.toFixed(1)}%</td>
                                        <td><span class="info-badge ${status}">${statusText}</span></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            // ⭐ НОВИЙ ГРАФІК: Історія + Прогноз
            const predCtx = document.getElementById('predictionChart').getContext('2d');
            if (predictionChart) predictionChart.destroy();
            
            const datasets = [];
            
            // Історичні дані (зелена суцільна)
            if (data.historical_data.length > 0) {
                datasets.push({
                    label: '✅ Історія (реальні дані)',
                    data: data.historical_data.map(d => ({
                        x: new Date(d.time),
                        y: d[param]
                    })),
                    borderColor: '#51cf66',
                    backgroundColor: 'rgba(81, 207, 102, 0.1)',
                    borderWidth: 2,
                    pointRadius: 2,
                    tension: 0.3,
                    fill: false
                });
            }
            
            // Прогнози (синя пунктирна)
            if (data.forecast_data.length > 0) {
                datasets.push({
                    label: '🔮 Прогноз (модель)',
                    data: data.forecast_data.map(d => ({
                        x: new Date(d.time),
                        y: d[param]
                    })),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 2,
                    tension: 0.3,
                    fill: false
                });
            }
            
            predictionChart = new Chart(predCtx, {
                type: 'line',
                data: { datasets: datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + 
                                           context.parsed.y.toFixed(2) + ' ' + unit;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { 
                            type: 'time',
                            time: {
                                unit: 'hour',
                                displayFormats: { hour: 'dd.MM HH:mm' }
                            },
                            title: { display: true, text: 'Час' }
                        },
                        y: { 
                            beginAtZero: true,
                            title: { display: true, text: paramName + ' (' + unit + ')' }
                        }
                    }
                }
            });

            // Графік помилок
            const errCtx = document.getElementById('errorChart').getContext('2d');
            if (errorChart) errorChart.destroy();
            
            errorChart = new Chart(errCtx, {
                type: 'bar',
                data: {
                    labels: ['PM2.5', 'PM10', 'NO₂', 'SO₂', 'CO', 'O₃'],
                    datasets: [{
                        label: 'Помилка MAE (%)',
                        data: [
                            fs.avg_pm25_error * 100, fs.avg_pm10_error * 100, fs.avg_no2_error * 100,
                            fs.avg_so2_error * 100, fs.avg_co_error * 100, fs.avg_o3_error * 100
                        ],
                        backgroundColor: [
                            'rgba(102, 126, 234, 0.7)', 'rgba(118, 75, 162, 0.7)',
                            'rgba(81, 207, 102, 0.7)', 'rgba(255, 193, 7, 0.7)',
                            'rgba(255, 107, 107, 0.7)', 'rgba(56, 178, 172, 0.7)'
                        ],
                        borderColor: ['#667eea', '#764ba2', '#51cf66', '#ffc107', '#ff6b6b', '#38b2ac'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            title: { display: true, text: 'Помилка (%)' }
                        }
                    }
                }
            });
        }
        
        function exportMetrics() {
            if (!currentData) {
                alert('Спочатку завантажте дані!');
                return;
            }
            
            const districtName = districts.find(d => d.id === currentDistrict).name;
            const fs = currentData.feedback_stats;
            
            let csv = 'EcoLviv ML Dashboard - Експорт метрик\\n\\n';
            csv += 'Район:,' + districtName + '\\n';
            csv += 'Дата:,' + new Date().toLocaleString('uk-UA') + '\\n\\n';
            
            csv += 'Параметр,Помилка MAE (%),Точність (%)\\n';
            ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'].forEach(p => {
                const error = (fs['avg_' + p + '_error'] * 100).toFixed(2);
                const accuracy = (100 - error).toFixed(1);
                csv += parameterNames[p] + ',' + error + ',' + accuracy + '\\n';
            });
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'ecolv_metrics_district_' + currentDistrict + '_' + new Date().toISOString().split('T')[0] + '.csv';
            link.click();
        }

        createDistrictButtons();
        loadMetrics(1);
        setInterval(() => loadMetrics(currentDistrict), 60000); // Автооновлення кожну хвилину
    </script>
</body>
</html>
    """
    return html_content

# ==================== ЗАПУСК ====================

if __name__ == '__main__':
    print("=" * 70)
    print("🚀 EcoLviv ML Service")
    print("=" * 70)
    print(f"📍 Порт: {Config.FLASK_PORT}")
    print(f"🗄️ База даних: {Config.DB_NAME}")
    print(f"📁 Моделі: {Config.MODEL_PATH}")
    print("=" * 70)
    
    app.run(
        host='0.0.0.0',
        port=Config.FLASK_PORT,
        debug=True
    )