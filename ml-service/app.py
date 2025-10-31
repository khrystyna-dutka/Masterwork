# ml-service/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from utils.db_helper import DatabaseHelper
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import traceback

app = Flask(__name__)
CORS(app)

db = DatabaseHelper()

# ==================== HELPER FUNCTIONS ====================

def linear_interpolation(value, c_low, c_high, aqi_low, aqi_high):
    """Лінійна інтерполяція для розрахунку AQI"""
    return ((aqi_high - aqi_low) / (c_high - c_low)) * (value - c_low) + aqi_low

def calculate_aqi_from_pm25(pm25):
    """Розрахунок AQI з PM2.5 (μg/m³)"""
    if pm25 <= 12.0:
        return linear_interpolation(pm25, 0, 12.0, 0, 50)
    elif pm25 <= 35.4:
        return linear_interpolation(pm25, 12.1, 35.4, 51, 100)
    elif pm25 <= 55.4:
        return linear_interpolation(pm25, 35.5, 55.4, 101, 150)
    elif pm25 <= 150.4:
        return linear_interpolation(pm25, 55.5, 150.4, 151, 200)
    elif pm25 <= 250.4:
        return linear_interpolation(pm25, 150.5, 250.4, 201, 300)
    else:
        return linear_interpolation(pm25, 250.5, 500.4, 301, 500)

def calculate_aqi_from_pm10(pm10):
    """Розрахунок AQI з PM10 (μg/m³)"""
    if pm10 <= 54:
        return linear_interpolation(pm10, 0, 54, 0, 50)
    elif pm10 <= 154:
        return linear_interpolation(pm10, 55, 154, 51, 100)
    elif pm10 <= 254:
        return linear_interpolation(pm10, 155, 254, 101, 150)
    elif pm10 <= 354:
        return linear_interpolation(pm10, 255, 354, 151, 200)
    elif pm10 <= 424:
        return linear_interpolation(pm10, 355, 424, 201, 300)
    else:
        return linear_interpolation(pm10, 425, 604, 301, 500)

def calculate_aqi_from_no2(no2):
    """Розрахунок AQI з NO2 (μg/m³)"""
    # Конвертуємо з μg/m³ в ppb (NO2: 1 ppb = 1.88 μg/m³)
    no2_ppb = no2 / 1.88
    
    if no2_ppb <= 53:
        return linear_interpolation(no2_ppb, 0, 53, 0, 50)
    elif no2_ppb <= 100:
        return linear_interpolation(no2_ppb, 54, 100, 51, 100)
    elif no2_ppb <= 360:
        return linear_interpolation(no2_ppb, 101, 360, 101, 150)
    elif no2_ppb <= 649:
        return linear_interpolation(no2_ppb, 361, 649, 151, 200)
    elif no2_ppb <= 1249:
        return linear_interpolation(no2_ppb, 650, 1249, 201, 300)
    else:
        return linear_interpolation(no2_ppb, 1250, 2049, 301, 500)

def calculate_aqi_from_so2(so2):
    """Розрахунок AQI з SO2 (μg/m³)"""
    # Конвертуємо з μg/m³ в ppb (SO2: 1 ppb = 2.62 μg/m³)
    so2_ppb = so2 / 2.62
    
    if so2_ppb <= 35:
        return linear_interpolation(so2_ppb, 0, 35, 0, 50)
    elif so2_ppb <= 75:
        return linear_interpolation(so2_ppb, 36, 75, 51, 100)
    elif so2_ppb <= 185:
        return linear_interpolation(so2_ppb, 76, 185, 101, 150)
    elif so2_ppb <= 304:
        return linear_interpolation(so2_ppb, 186, 304, 151, 200)
    elif so2_ppb <= 604:
        return linear_interpolation(so2_ppb, 305, 604, 201, 300)
    else:
        return linear_interpolation(so2_ppb, 605, 1004, 301, 500)

def calculate_aqi_from_co(co):
    """Розрахунок AQI з CO (μg/m³)"""
    # CO приходить в μg/m³, конвертуємо в ppm (1 ppm = 1150 μg/m³)
    co_ppm = co / 1150
    
    if co_ppm <= 4.4:
        return linear_interpolation(co_ppm, 0, 4.4, 0, 50)
    elif co_ppm <= 9.4:
        return linear_interpolation(co_ppm, 4.5, 9.4, 51, 100)
    elif co_ppm <= 12.4:
        return linear_interpolation(co_ppm, 9.5, 12.4, 101, 150)
    elif co_ppm <= 15.4:
        return linear_interpolation(co_ppm, 12.5, 15.4, 151, 200)
    elif co_ppm <= 30.4:
        return linear_interpolation(co_ppm, 15.5, 30.4, 201, 300)
    else:
        return linear_interpolation(co_ppm, 30.5, 50.4, 301, 500)

def calculate_aqi_from_o3(o3):
    """Розрахунок AQI з O3 (μg/m³)"""
    # Конвертуємо з μg/m³ в ppb (O3: 1 ppb = 2.0 μg/m³)
    o3_ppb = o3 / 2.0
    
    if o3_ppb <= 54:
        return linear_interpolation(o3_ppb, 0, 54, 0, 50)
    elif o3_ppb <= 70:
        return linear_interpolation(o3_ppb, 55, 70, 51, 100)
    elif o3_ppb <= 85:
        return linear_interpolation(o3_ppb, 71, 85, 101, 150)
    elif o3_ppb <= 105:
        return linear_interpolation(o3_ppb, 86, 105, 151, 200)
    elif o3_ppb <= 200:
        return linear_interpolation(o3_ppb, 106, 200, 201, 300)
    else:
        return 301

def calculate_overall_aqi(pm25, pm10, no2, so2, co, o3):
    """
    Розрахувати загальний AQI як максимум з усіх параметрів
    Повертає: (max_aqi, dominant_pollutant, breakdown_dict)
    """
    aqis = {
        'pm25': calculate_aqi_from_pm25(pm25),
        'pm10': calculate_aqi_from_pm10(pm10),
        'no2': calculate_aqi_from_no2(no2),
        'so2': calculate_aqi_from_so2(so2),
        'co': calculate_aqi_from_co(co),
        'o3': calculate_aqi_from_o3(o3)
    }
    
    # Знайти максимальний AQI
    max_aqi = max(aqis.values())
    dominant = max(aqis, key=aqis.get)
    
    return int(max_aqi), dominant, aqis

def get_aqi_status(aqi):
    """Отримати статус якості повітря"""
    if aqi <= 50: return 'Good'
    elif aqi <= 100: return 'Moderate'
    elif aqi <= 150: return 'Unhealthy for Sensitive'
    elif aqi <= 200: return 'Unhealthy'
    elif aqi <= 300: return 'Very Unhealthy'
    else: return 'Hazardous'

# ==================== API ENDPOINTS ====================

@app.route('/health', methods=['GET'])
def health_check():
    """Перевірка здоров'я сервісу"""
    return jsonify({
        'status': 'healthy',
        'service': 'ml-service',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/predict/<int:district_id>', methods=['GET'])
def predict_district(district_id):
    """
    Прогноз для одного району (використовує просту модель)
    Query params: hours (12, 24, 48)
    """
    try:
        if district_id < 1 or district_id > 6:
            return jsonify({'success': False, 'error': 'Invalid district_id'}), 400
        
        # Отримати параметр hours
        hours = request.args.get('hours', default=24, type=int)
        if hours not in [12, 24, 48]:
            hours = 24
        
        print(f"\n🔮 Прогноз для району {district_id} на {hours} годин...")
        
        # 1. Завантажити історичні дані (останні 48 годин)
        df = db.get_training_data(district_id, days=2)
        
        if len(df) < 10:
            return jsonify({
                'success': False,
                'error': f'Not enough historical data: {len(df)} records'
            }), 400
        
        print(f"✅ Завантажено {len(df)} історичних записів")
        
        # 2. Використовуємо просту модель прогнозування
        from models.simple_forecast_model import SimpleForecastModel
        
        simple_model = SimpleForecastModel(district_id)
        
        # Підготувати дані для прогнозу (останні 24 години)
        recent_data = df[['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']].tail(24)
        
        # Перевірка чи достатньо даних
        if len(recent_data) < 5:
            return jsonify({
                'success': False,
                'error': 'Not enough recent data for forecast'
            }), 400
        
        # 3. Зробити прогноз
        print(f"🤖 Генерація прогнозу на {hours} годин...")
        forecast_df = simple_model.predict(recent_data, hours=hours)
        
        # 4. Створити список прогнозів з timestampами
        forecasts = []
        last_time = df['measured_at'].max()
        
        for i, row in forecast_df.iterrows():
            forecast_time = last_time + timedelta(hours=i+1)
            
            # ✅ Розрахувати AQI з УСІХ параметрів
            aqi, dominant, aqi_breakdown = calculate_overall_aqi(
                row['pm25'],
                row['pm10'],
                row['no2'],
                row['so2'],
                row['co'],
                row['o3']
            )
            
            forecasts.append({
                'measured_at': forecast_time.isoformat(),
                'pm25': round(float(row['pm25']), 2),
                'pm10': round(float(row['pm10']), 2),
                'no2': round(float(row['no2']), 2),
                'so2': round(float(row['so2']), 2),
                'co': round(float(row['co']), 2),
                'o3': round(float(row['o3']), 2),
                'aqi': aqi,
                'aqi_status': get_aqi_status(aqi),
                'dominant_pollutant': dominant
            })
        
        print(f"✅ Створено {len(forecasts)} прогнозів")
        
        # 5. Зберегти прогнози в БД
        forecasts_df = pd.DataFrame(forecasts)
        db.save_forecasts(district_id, forecasts_df)
        
        return jsonify({
            'success': True,
            'district_id': district_id,
            'hours': hours,
            'model_type': 'persistence_trend',
            'forecasts': forecasts
        })
        
    except Exception as e:
        print(f"❌ Помилка: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/predict/all', methods=['GET'])
def predict_all_districts():
    """Прогноз для всіх районів"""
    try:
        hours = request.args.get('hours', default=24, type=int)
        results = []
        
        for district in Config.DISTRICTS:
            try:
                # Викликаємо predict для кожного району
                response = predict_district(district['id'])
                data = response.get_json()
                
                if data.get('success'):
                    results.append({
                        'district_id': district['id'],
                        'district_name': district['name'],
                        'success': True,
                        'forecasts_count': len(data['forecasts'])
                    })
                else:
                    results.append({
                        'district_id': district['id'],
                        'district_name': district['name'],
                        'success': False,
                        'error': data.get('error')
                    })
            except Exception as e:
                results.append({
                    'district_id': district['id'],
                    'district_name': district['name'],
                    'success': False,
                    'error': str(e)
                })
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/model/<int:district_id>/info', methods=['GET'])
def get_model_info(district_id):
    """Отримати інформацію про модель"""
    try:
        stats = db.get_data_stats(district_id)
        
        return jsonify({
            'success': True,
            'district_id': district_id,
            'training_data': stats
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/model/<int:district_id>/monitor', methods=['GET'])
def monitor_model(district_id):
    """Перевірити якість моделі"""
    from utils.model_monitor import ModelMonitor
    
    monitor = ModelMonitor()
    result = monitor.auto_retrain_if_needed(district_id)
    
    return jsonify({
        'success': True,
        'result': result
    })

@app.route('/api/model/<int:district_id>/retrain', methods=['POST'])
def force_retrain(district_id):
    """Примусово перенавчити модель"""
    from utils.model_monitor import ModelMonitor
    
    monitor = ModelMonitor()
    result = monitor.retrain_model(district_id)
    
    return jsonify(result)

@app.route('/api/monitor/all', methods=['POST'])
def monitor_all_districts():
    """Перевірити та перенавчити всі моделі якщо потрібно"""
    from utils.model_monitor import ModelMonitor
    from config import Config
    
    monitor = ModelMonitor()
    results = []
    
    for district in Config.DISTRICTS:
        result = monitor.auto_retrain_if_needed(district['id'])
        results.append(result)
    
    return jsonify({
        'success': True,
        'results': results
    })


# Додайте ЦЕЙ КОД в ml-service/app.py ПЕРЕД рядком "# ==================== MAIN ===================="

@app.route('/test-model', methods=['POST'])
def test_model():
    """
    Тестування ML моделі на історичних даних
    """
    try:
        data = request.json
        district_id = data.get('district_id')
        days = data.get('days', 30)
        test_size = data.get('test_size', 20) / 100  # конвертуємо відсотки в decimal
        
        print(f"\n{'='*70}")
        print(f"🧪 ТЕСТУВАННЯ МОДЕЛІ - Район {district_id}")
        print(f"{'='*70}")
        
        # 1. Завантажити дані
        print(f"\n1️⃣ Завантаження даних за {days} днів...")
        query = """
            SELECT 
                aqi, pm25, pm10, no2, so2, co, o3,
                temperature, humidity, pressure, 
                wind_speed, wind_direction,
                measured_at
            FROM air_quality_history
            WHERE district_id = %s
                AND is_forecast = false
                AND measured_at >= NOW() - INTERVAL '%s days'
            ORDER BY measured_at
        """
        
        conn = db.get_connection()
        df = pd.read_sql_query(query, conn, params=(district_id, days))
        conn.close()
        
        if len(df) < 100:
            return jsonify({
                'success': False,
                'error': f'Недостатньо даних: {len(df)} записів (потрібно мінімум 100)'
            }), 400
        
        print(f"✅ Завантажено {len(df)} записів")
        
        # 2. Підготовка features
        print("\n2️⃣ Підготовка features...")
        from data.preprocessor import DataPreprocessor
        preprocessor = DataPreprocessor(district_id)
        
        X, y, df_processed = preprocessor.prepare_training_data(df)
        print(f"✅ {len(X)} зразків з {X.shape[1]} features")
        
        # 3. Train/Test split
        print(f"\n3️⃣ Розділення Train/Test ({int((1-test_size)*100)}/{int(test_size*100)})...")
        split_idx = int(len(X) * (1 - test_size))
        
        X_train = X[:split_idx]
        X_test = X[split_idx:]
        y_train = y[:split_idx]
        y_test = y[split_idx:]
        df_test = df_processed.iloc[split_idx:].copy()
        
        print(f"   Train: {len(X_train)} зразків")
        print(f"   Test: {len(X_test)} зразків")
        
        # 4. Навчання моделі
        print("\n4️⃣ Навчання моделі...")
        from models.air_quality_model import AirQualityModel
        model = AirQualityModel(district_id, model_type='xgboost')
        
        train_score, val_score = model.train(X_train, y_train, X_test, y_test)
        print(f"✅ Train R²: {train_score:.4f}, Test R²: {val_score:.4f}")
        
        # 5. Прогноз на тестовій вибірці
        print("\n5️⃣ Прогнозування на тестовій вибірці...")
        predictions = model.predict(X_test)
        
        # 6. Розрахунок метрик для кожного параметра
        print("\n6️⃣ Розрахунок метрик...")
        parameters = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']
        metrics = {}
        comparison_data = []
        
        for i, param in enumerate(parameters):
            y_true = y_test[:, i]
            y_pred = predictions[:, i]
            
            # MAE, RMSE, R²
            mae = float(np.mean(np.abs(y_true - y_pred)))
            rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
            
            ss_res = np.sum((y_true - y_pred) ** 2)
            ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
            r2 = float(1 - (ss_res / ss_tot)) if ss_tot > 0 else 0
            
            # MAPE
            mask = y_true != 0
            mape = float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100) if mask.any() else 0
            
            # Accuracy (в межах ±10%)
            threshold = np.maximum(y_true * 0.1, 5)
            accurate = np.abs(y_true - y_pred) <= threshold
            accuracy = float(np.mean(accurate) * 100)
            
            metrics[param] = {
                'mae': round(mae, 2),
                'rmse': round(rmse, 2),
                'r2': round(r2, 4),
                'mape': round(mape, 2),
                'accuracy': round(accuracy, 2),
                'avgActual': round(float(np.mean(y_true)), 2),
                'avgPredicted': round(float(np.mean(y_pred)), 2),
                'samples': len(y_true)
            }
            
            print(f"   {param.upper()}: MAE={mae:.2f}, RMSE={rmse:.2f}, R²={r2:.4f}, Accuracy={accuracy:.1f}%")
        
        # 7. Дані для графіка
        for idx in range(len(df_test)):
            row = df_test.iloc[idx]
            comparison_data.append({
                'timestamp': row['measured_at'].isoformat(),
                'actual': {param: float(y_test[idx, i]) for i, param in enumerate(parameters)},
                'predicted': {param: float(predictions[idx, i]) for i, param in enumerate(parameters)}
            })
        
        print(f"\n{'='*70}")
        print("✅ ТЕСТУВАННЯ ЗАВЕРШЕНО")
        print(f"{'='*70}\n")
        
        return jsonify({
            'success': True,
            'district_id': district_id,
            'metrics': metrics,
            'comparison_data': comparison_data,
            'data_info': {
                'total_samples': len(df),
                'train_samples': len(X_train),
                'test_samples': len(X_test),
                'features_count': X.shape[1],
                'date_range': {
                    'start': df['measured_at'].min().isoformat(),
                    'end': df['measured_at'].max().isoformat()
                }
            }
        })
        
    except Exception as e:
        print(f"❌ Помилка тестування: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/test-data-info/<int:district_id>', methods=['GET'])
def get_test_data_info(district_id):
    """
    Інформація про доступні дані для тестування
    """
    try:
        query = """
            SELECT 
                COUNT(*) as total_records,
                MIN(measured_at) as first_date,
                MAX(measured_at) as last_date,
                COUNT(DISTINCT DATE(measured_at)) as days_with_data
            FROM air_quality_history
            WHERE district_id = %s
                AND is_forecast = false
        """
        
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute(query, (district_id,))
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'district_id': district_id,
            'total_records': result[0],
            'first_date': result[1].isoformat() if result[1] else None,
            'last_date': result[2].isoformat() if result[2] else None,
            'days_with_data': result[3]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== MAIN ====================

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 ML SERVICE ЗАПУЩЕНО")
    print("=" * 60)
    print(f"🌐 URL: http://localhost:{Config.FLASK_PORT}")
    print(f"📊 Endpoints:")
    print(f"   GET  /health")
    print(f"   GET  /api/predict/<district_id>?hours=24")
    print(f"   GET  /api/predict/all?hours=24")
    print(f"   GET  /api/model/<district_id>/info")
    print("=" * 60)
    
    app.run(
        host='0.0.0.0',
        port=Config.FLASK_PORT,
        debug=Config.FLASK_DEBUG
    )