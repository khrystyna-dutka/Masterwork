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
    """Розрахувати загальний AQI як максимум з усіх параметрів"""
    aqis = {
        'pm25': calculate_aqi_from_pm25(pm25),
        'pm10': calculate_aqi_from_pm10(pm10),
        'no2': calculate_aqi_from_no2(no2),
        'so2': calculate_aqi_from_so2(so2),
        'co': calculate_aqi_from_co(co),
        'o3': calculate_aqi_from_o3(o3)
    }
    
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
    """Прогноз для одного району"""
    try:
        if district_id < 1 or district_id > 6:
            return jsonify({'success': False, 'error': 'Invalid district_id'}), 400
        
        hours = request.args.get('hours', default=24, type=int)
        if hours not in [12, 24, 48]:
            hours = 24
        
        print(f"\n🔮 Прогноз для району {district_id} на {hours} годин...")
        
        df = db.get_training_data(district_id, days=2)
        
        if len(df) < 10:
            return jsonify({
                'success': False,
                'error': f'Not enough historical data: {len(df)} records'
            }), 400
        
        print(f"✅ Завантажено {len(df)} історичних записів")
        
        from models.simple_forecast_model import SimpleForecastModel
        
        simple_model = SimpleForecastModel(district_id)
        recent_data = df[['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']].tail(24)
        
        if len(recent_data) < 5:
            return jsonify({
                'success': False,
                'error': 'Not enough recent data for forecast'
            }), 400
        
        print(f"🤖 Генерація прогнозу на {hours} годин...")
        forecast_df = simple_model.predict(recent_data, hours=hours)
        
        forecasts = []
        last_time = df['measured_at'].max()
        
        for i, row in forecast_df.iterrows():
            forecast_time = last_time + timedelta(hours=i+1)
            
            aqi, dominant, aqi_breakdown = calculate_overall_aqi(
                row['pm25'], row['pm10'], row['no2'],
                row['so2'], row['co'], row['o3']
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
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/predict/all', methods=['GET'])
def predict_all_districts():
    """Прогноз для всіх районів"""
    try:
        hours = request.args.get('hours', default=24, type=int)
        results = []
        
        for district in Config.DISTRICTS:
            try:
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
        
        return jsonify({'success': True, 'results': results})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

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
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/model/<int:district_id>/monitor', methods=['GET'])
def monitor_model(district_id):
    """Перевірити якість моделі"""
    from utils.model_monitor import ModelMonitor
    monitor = ModelMonitor()
    result = monitor.auto_retrain_if_needed(district_id)
    return jsonify({'success': True, 'result': result})

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
    monitor = ModelMonitor()
    results = []
    
    for district in Config.DISTRICTS:
        result = monitor.auto_retrain_if_needed(district['id'])
        results.append(result)
    
    return jsonify({'success': True, 'results': results})

@app.route('/test-model', methods=['POST'])
def test_model():
    """Тестування ML моделі з детальною діагностикою на data leakage"""
    try:
        data = request.json
        district_id = data.get('district_id')
        days = data.get('days', 30)
        
        print(f"\n{'='*70}")
        print(f"🧪 TIME SERIES ТЕСТУВАННЯ - Район {district_id}")
        print(f"{'='*70}")
        
        # 1. Завантажити дані
        print(f"\n1️⃣ Завантаження даних за {days} днів...")
        query = """
            SELECT aqi, pm25, pm10, no2, so2, co, o3,
                   temperature, humidity, pressure, 
                   wind_speed, wind_direction, measured_at
            FROM air_quality_history
            WHERE district_id = %s AND is_forecast = false
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
        
        df_processed = preprocessor.prepare_features(df)
        print(f"✅ Features підготовлено: {df_processed.shape}")
        
        # 3. Time Series Split з GAP
        print("\n3️⃣ Time Series Split з gap (уникаємо data leakage)...")
        
        parameters = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']
        feature_cols = preprocessor.get_feature_columns()
        
        # Train: 70%, Gap: 5%, Test: 25%
        total_size = len(df_processed)
        train_size = int(total_size * 0.70)
        gap_size = int(total_size * 0.05)
        test_start = train_size + gap_size
        
        print(f"   Train: 0-{train_size} ({train_size} записів)")
        print(f"   Gap: {train_size}-{test_start} ({gap_size} записів) ← НЕ використовується!")
        print(f"   Test: {test_start}-{total_size} ({total_size - test_start} записів)")
        
        # Розділити дані
        train_df = df_processed.iloc[:train_size].copy()
        test_df = df_processed.iloc[test_start:].copy()
        
        # Підготувати X, y
        X_train = train_df[feature_cols].values
        y_train = train_df[parameters].values
        
        X_test = test_df[feature_cols].values
        y_test = test_df[parameters].values
        
        # 4. Нормалізація (scaler ТІЛЬКИ на train)
        print("\n4️⃣ Нормалізація (scaler на train)...")
        from sklearn.preprocessing import MinMaxScaler
        scaler = MinMaxScaler()
        
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        print(f"✅ Train scaled: {X_train_scaled.shape}")
        print(f"✅ Test scaled: {X_test_scaled.shape}")
        
        # 5. Навчання моделі
        print("\n5️⃣ Навчання XGBoost моделі...")
        from models.air_quality_model import AirQualityModel
        
        model = AirQualityModel(district_id, model_type='xgboost')
        train_score, val_score = model.train(X_train_scaled, y_train, X_test_scaled, y_test)
        
        print(f"✅ Train R²: {train_score:.4f}, Test R²: {val_score:.4f}")
        
        # 6. Прогноз на тестовій вибірці
        print("\n6️⃣ Прогнозування на тестовій вибірці...")
        predictions = model.predict(X_test_scaled)
        
        # 7. Розрахунок метрик
        print("\n7️⃣ Розрахунок метрик...")
        
        metrics = {}
        
        for i, param in enumerate(parameters):
            y_true = y_test[:, i]
            y_pred = predictions[:, i]
            
            mae = float(np.mean(np.abs(y_true - y_pred)))
            rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
            
            ss_res = np.sum((y_true - y_pred) ** 2)
            ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
            r2 = float(1 - (ss_res / ss_tot)) if ss_tot > 0 else 0
            
            mask = y_true != 0
            mape = float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100) if mask.any() else 0
            
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
        
        # 8. Розрахунок AQI
        print("\n8️⃣ Розрахунок AQI...")
        
        aqi_actual = []
        aqi_predicted = []
        
        for idx in range(len(y_test)):
            pm25_actual = y_test[idx, 0]
            aqi_actual.append(calculate_aqi_from_pm25(pm25_actual))
            
            pm25_pred = predictions[idx, 0]
            aqi_predicted.append(calculate_aqi_from_pm25(pm25_pred))
        
        aqi_actual = np.array(aqi_actual)
        aqi_predicted = np.array(aqi_predicted)
        
        mae_aqi = float(np.mean(np.abs(aqi_actual - aqi_predicted)))
        rmse_aqi = float(np.sqrt(np.mean((aqi_actual - aqi_predicted) ** 2)))
        
        ss_res_aqi = np.sum((aqi_actual - aqi_predicted) ** 2)
        ss_tot_aqi = np.sum((aqi_actual - np.mean(aqi_actual)) ** 2)
        r2_aqi = float(1 - (ss_res_aqi / ss_tot_aqi)) if ss_tot_aqi > 0 else 0
        
        mask_aqi = aqi_actual != 0
        mape_aqi = float(np.mean(np.abs((aqi_actual[mask_aqi] - aqi_predicted[mask_aqi]) / aqi_actual[mask_aqi])) * 100) if mask_aqi.any() else 0
        
        threshold_aqi = np.maximum(aqi_actual * 0.1, 5)
        accurate_aqi = np.abs(aqi_actual - aqi_predicted) <= threshold_aqi
        accuracy_aqi = float(np.mean(accurate_aqi) * 100)
        
        metrics['aqi'] = {
            'mae': round(mae_aqi, 2),
            'rmse': round(rmse_aqi, 2),
            'r2': round(r2_aqi, 4),
            'mape': round(mape_aqi, 2),
            'accuracy': round(accuracy_aqi, 2),
            'avgActual': round(float(np.mean(aqi_actual)), 2),
            'avgPredicted': round(float(np.mean(aqi_predicted)), 2),
            'samples': len(aqi_actual)
        }
        
        print(f"   AQI: MAE={mae_aqi:.2f}, RMSE={rmse_aqi:.2f}, R²={r2_aqi:.4f}, Accuracy={accuracy_aqi:.1f}%")
        
        # 9. Підготовка даних для графіка
        print("\n9️⃣ Підготовка даних для графіка...")
        
        comparison_data = []
        
        for idx in range(len(test_df)):
            row = test_df.iloc[idx]
            
            actual_dict = {'aqi': float(aqi_actual[idx])}
            predicted_dict = {'aqi': float(aqi_predicted[idx])}
            
            for i, param in enumerate(parameters):
                actual_dict[param] = float(y_test[idx, i])
                predicted_dict[param] = float(predictions[idx, i])
            
            comparison_data.append({
                'timestamp': row['measured_at'].isoformat(),
                'actual': actual_dict,
                'predicted': predicted_dict
            })
        
        # DEBUG інформація про стрибок
        print("\n🔍 DEBUG - Перші 5 прогнозів (PM2.5):")
        for idx in range(min(5, len(test_df))):
            row = test_df.iloc[idx]
            lag_val = row.get('pm25_lag_1', 0)
            print(f"   {row['measured_at'].strftime('%d-%m %H:%M')} → "
                  f"Actual: {y_test[idx, 0]:.2f}, "
                  f"Predicted: {predictions[idx, 0]:.2f}, "
                  f"Lag_1: {lag_val:.2f}")
        
        # Знайти найбільший стрибок
        if len(test_df) > 1:
            diffs = np.abs(np.diff(y_test[:, 0]))
            max_jump_idx = np.argmax(diffs)
            
            print(f"\n🔥 DEBUG - Найбільший стрибок PM2.5:")
            for offset in range(-2, 3):
                idx = max_jump_idx + offset
                if 0 <= idx < len(test_df):
                    row = test_df.iloc[idx]
                    lag_val = row.get('pm25_lag_1', 0)
                    marker = " ⬅️ СТРИБОК" if idx == max_jump_idx else ""
                    print(f"   {row['measured_at'].strftime('%d-%m %H:%M')} → "
                          f"Actual: {y_test[idx, 0]:.2f}, "
                          f"Predicted: {predictions[idx, 0]:.2f}, "
                          f"Lag_1: {lag_val:.2f}{marker}")
        
        # ========== ТЕСТИ НА DATA LEAKAGE ==========
        
        print(f"\n{'='*70}")
        print("🔬 ДІАГНОСТИКА DATA LEAKAGE")
        print(f"{'='*70}")
        
        # ТЕСТ 1: Feature Importance
        print("\n🔬 ТЕСТ 1: Feature Importance (Топ-20)...")
        
        importances = []
        for estimator in model.model.estimators_:
            importances.append(estimator.feature_importances_)
        
        avg_importance = np.mean(importances, axis=0)
        
        importance_df = pd.DataFrame({
            'feature': feature_cols,
            'importance': avg_importance
        }).sort_values('importance', ascending=False)
        
        print("\nТоп-20 найважливіших features:")
        for idx, row in importance_df.head(20).iterrows():
            print(f"   {row['feature']:35s} → {row['importance']:.4f}")
        
        top_20_features = importance_df.head(20)['feature'].tolist()
        current_targets = [f for f in top_20_features if f in Config.TARGET_FEATURES]
        
        test1_passed = len(current_targets) == 0
        
        if test1_passed:
            print(f"\n   ✅ ОК! Немає поточних targets в топ-20!")
        else:
            print(f"\n   ❌ УВАГА! Поточні target features в топ-20: {current_targets}")
        
        # ТЕСТ 2: Persistence Baseline
        print("\n🔬 ТЕСТ 2: Порівняння з Persistence Baseline...")
        
        persistence_predictions = []
        for idx in range(len(test_df)):
            row = test_df.iloc[idx]
            pers_pred = []
            for param in parameters:
                lag_val = row.get(f'{param}_lag_1', 0)
                pers_pred.append(lag_val)
            persistence_predictions.append(pers_pred)
        
        persistence_predictions = np.array(persistence_predictions)
        
        model_mae = np.mean(np.abs(y_test[:, 0] - predictions[:, 0]))
        persistence_mae = np.mean(np.abs(y_test[:, 0] - persistence_predictions[:, 0]))
        
        improvement = ((persistence_mae - model_mae) / persistence_mae) * 100
        
        print(f"\n   PM2.5 MAE:")
        print(f"   Persistence (lag_1):  {persistence_mae:.2f}")
        print(f"   ML Model:             {model_mae:.2f}")
        print(f"   Покращення:           {improvement:.1f}%")
        
        test2_passed = improvement > 10
        
        if test2_passed:
            print(f"   ✅ Модель на {improvement:.1f}% краща за naive baseline!")
        else:
            print(f"   ⚠️ Модель недостатньо краща ({improvement:.1f}%)")
        
        # ТЕСТ 3: Random Shuffle Test
        print("\n🔬 ТЕСТ 3: Random Shuffle (детекція temporal leakage)...")
        
        shuffle_idx = np.random.permutation(len(X_test_scaled))
        X_test_shuffled = X_test_scaled[shuffle_idx]
        y_test_shuffled = y_test[shuffle_idx]
        
        pred_shuffled = model.predict(X_test_shuffled)
        
        mae_normal = np.mean(np.abs(y_test[:, 0] - predictions[:, 0]))
        mae_shuffled = np.mean(np.abs(y_test_shuffled[:, 0] - pred_shuffled[:, 0]))
        
        mae_diff = abs(mae_shuffled - mae_normal)
        mae_diff_pct = (mae_diff / mae_normal) * 100
        
        print(f"\n   PM2.5 MAE:")
        print(f"   Нормальний порядок:   {mae_normal:.2f}")
        print(f"   Після shuffle:        {mae_shuffled:.2f}")
        print(f"   Різниця:              {mae_diff:.2f} ({mae_diff_pct:.1f}%)")
        
        test3_passed = mae_diff_pct < 10
        
        if test3_passed:
            print(f"   ✅ Різниця мала ({mae_diff_pct:.1f}%) - немає temporal leakage!")
        else:
            print(f"   ⚠️ Різниця помітна ({mae_diff_pct:.1f}%)")
        
        # ТЕСТ 4: Manual Check
        print("\n🔬 ТЕСТ 4: Ручна перевірка першого прогнозу...")
        
        first_row = test_df.iloc[0]
        
        print(f"\n   Час: {first_row['measured_at']}")
        print(f"   Actual PM2.5: {y_test[0, 0]:.2f}")
        print(f"   Predicted PM2.5: {predictions[0, 0]:.2f}")
        print(f"\n   Перші 10 features:")
        
        first_features = X_test[0]
        for idx in range(min(10, len(feature_cols))):
            feat_name = feature_cols[idx]
            feat_value = first_features[idx]
            print(f"      {feat_name:30s} = {feat_value:.2f}")
        
        test4_passed = 'pm25' not in feature_cols
        
        if test4_passed:
            print(f"\n   ✅ ОК! 'pm25' не в features!")
        else:
            print(f"\n   ❌ LEAKAGE! 'pm25' знайдено в features!")
        
        # ТЕСТ 5: Overfitting Check
        print("\n🔬 ТЕСТ 5: Перевірка на overfitting...")
        
        print(f"\n   Train R²: {train_score:.4f}")
        print(f"   Test R²:  {val_score:.4f}")
        print(f"   Різниця:  {abs(train_score - val_score):.4f}")
        
        test5_passed = train_score < 0.99 and abs(train_score - val_score) < 0.30
        
        if train_score > 0.99:
            print(f"   ❌ ПРОБЛЕМА! Train R² = {train_score:.4f} (занадто високий!)")
            print(f"      Можливі причини:")
            print(f"      1. Target leakage")
            print(f"      2. Overfitting")
        elif abs(train_score - val_score) > 0.30:
            print(f"   ⚠️ УВАГА! Велика різниця train/test")
        else:
            print(f"   ✅ ОК! Нормальні показники!")
        
        # ФІНАЛЬНИЙ ВИСНОВОК
        print("\n" + "="*70)
        print("🎯 ФІНАЛЬНА ДІАГНОСТИКА")
        print("="*70)
        
        checks_passed = sum([test1_passed, test2_passed, test3_passed, test4_passed, test5_passed])
        total_checks = 5
        
        if test1_passed:
            print("✅ Тест 1: Немає current targets в топ features")
        else:
            print(f"❌ Тест 1: Current targets знайдені: {current_targets}")
        
        if test2_passed:
            print(f"✅ Тест 2: Модель на {improvement:.1f}% краща за baseline")
        else:
            print(f"⚠️ Тест 2: Покращення {improvement:.1f}% (мало)")
        
        if test3_passed:
            print(f"✅ Тест 3: Shuffle test пройдено ({mae_diff_pct:.1f}%)")
        else:
            print(f"⚠️ Тест 3: Shuffle різниця {mae_diff_pct:.1f}%")
        
        if test4_passed:
            print("✅ Тест 4: pm25 не в features")
        else:
            print("❌ Тест 4: pm25 знайдено в features!")
        
        if test5_passed:
            print(f"✅ Тест 5: Немає overfitting/leakage")
        else:
            print(f"⚠️ Тест 5: Підозра на overfitting (Train R²={train_score:.4f})")
        
        print(f"\n{'='*70}")
        print(f"📊 РЕЗУЛЬТАТ: {checks_passed}/{total_checks} тестів пройдено")
        
        if checks_passed == total_checks:
            print("✅✅✅ ВСЕ ЧУДОВО! Модель повністю чиста!")
        elif checks_passed >= 4:
            print("✅⚠️ Майже ідеально, є невеликі застереження")
        elif checks_passed >= 3:
            print("⚠️ Прийнятно, але потрібно звернути увагу")
        else:
            print("❌ КРИТИЧНІ ПРОБЛЕМИ! Потрібне виправлення!")
        
        print(f"{'='*70}\n")
        
        # 10. Зберегти scaler
        print("🔟 Збереження scaler...")
        preprocessor.scaler = scaler
        import joblib
        import os
        os.makedirs(Config.MODEL_PATH, exist_ok=True)
        joblib.dump(scaler, preprocessor.scaler_path)
        print(f"✅ Scaler збережено: {preprocessor.scaler_path}")
        
        print(f"\n{'='*70}")
        print("✅ ТЕСТУВАННЯ ЗАВЕРШЕНО")
        print(f"{'='*70}\n")
        
        # Додати diagnostic результати до response
        diagnostic_results = {
            'test1_feature_importance': bool(test1_passed),
            'test2_persistence': bool(test2_passed),
            'test2_improvement': round(float(improvement), 1),
            'test3_shuffle': bool(test3_passed),
            'test3_difference': round(float(mae_diff_pct), 1),
            'test4_manual': bool(test4_passed),
            'test5_overfitting': bool(test5_passed),
            'total_passed': int(checks_passed),
            'total_tests': int(total_checks),
            'top_features': [
                {
                    'feature': str(row['feature']),
                    'importance': round(float(row['importance']), 4)
                }
                for _, row in importance_df.head(20).iterrows()
            ]
        }

        # 🔍 ДЕТАЛЬНА ПЕРЕВІРКА АНОМАЛІЇ
        print("\n" + "="*70)
        print("🔍 ДЕТАЛЬНА ПЕРЕВІРКА АНОМАЛЬНОГО СТРИБКА")
        print("="*70)
        
        anomaly_details = None
        
        if len(test_df) > 1:
            diffs = np.abs(np.diff(y_test[:, 0]))
            max_jump_idx = np.argmax(diffs) + 1  # ✅ +1 щоб показати НАСТУПНУ точку!
            
            print(f"\n📍 Аномалія на індексі {max_jump_idx}")
            
            # Показати попередню точку для контексту
            if max_jump_idx > 0:
                prev_row = test_df.iloc[max_jump_idx - 1]
                print(f"   Попередній момент: {prev_row['measured_at'].strftime('%d-%m %H:%M')}")
                print(f"      PM2.5: {y_test[max_jump_idx - 1, 0]:.2f}")
            
            # Показати ВСІ параметри в момент стрибка
            anomaly_row = test_df.iloc[max_jump_idx]
            
            print(f"\n🔥 Момент стрибка: {anomaly_row['measured_at'].strftime('%d-%m %H:%M')}")
            print("\nВСІ параметри actual vs predicted:")
            
            anomaly_params = []
            for i, param in enumerate(parameters):
                actual = y_test[max_jump_idx, i]
                predicted = predictions[max_jump_idx, i]
                lag_1 = anomaly_row.get(f'{param}_lag_1', 0)
                
                # ✅ Порівнюємо з ПОПЕРЕДНІМ значенням
                if max_jump_idx > 0:
                    prev_actual = y_test[max_jump_idx - 1, i]
                    jump_size = actual / prev_actual if prev_actual > 0.01 else 0
                else:
                    jump_size = actual / lag_1 if lag_1 > 0.01 else 0
                
                anomaly_params.append({
                    'param': param,
                    'actual': float(actual),
                    'predicted': float(predicted),
                    'lag_1': float(lag_1),
                    'jump_ratio': float(jump_size)
                })
                
                print(f"   {param:6s}: Actual={actual:7.2f}, "
                      f"Predicted={predicted:7.2f}, "
                      f"Lag_1={lag_1:7.2f}, "
                      f"Стрибок: {jump_size:.1f}x")
            
            # Перевірити чи ВСІ параметри стрибнули одночасно
            print("\n🔬 Аналіз:")
            
            jumps = []
            for entry in anomaly_params:
                jumps.append((entry['param'], entry['jump_ratio']))
            
            # Відсортувати за розміром стрибка
            jumps.sort(key=lambda x: x[1], reverse=True)
            
            print("\nПараметри відсортовані за розміром стрибка:")
            for param, ratio in jumps:
                if ratio > 2:
                    print(f"   ⚠️ {param:6s}: стрибок у {ratio:.1f} разів! ⬆️")
                elif ratio < 0.5:
                    print(f"   ⬇️ {param:6s}: впав у {1/ratio:.1f} разів!")
                else:
                    print(f"   ✅ {param:6s}: стабільний ({ratio:.2f}x)")
            
            # Перевірити чи це був default value (багато параметрів стрибнули)
            print("\n🤔 ГІПОТЕЗА: Чи це default values від API?")
            
            # Підрахувати скільки параметрів РІЗКО змінились
            significant_jumps = sum(1 for _, r in jumps if r > 1.5 or r < 0.7)
            
            is_api_glitch = False
            if significant_jumps >= 4:
                print(f"   ❗ {significant_jumps} з {len(jumps)} параметрів РІЗКО стрибнули!")
                print("   ⚠️ ПІДОЗРА: Це схоже на технічний збій API!")
                print("   💡 Пояснення:")
                print("      - В реальності параметри НЕ змінюються одночасно")
                print("      - PM2.5, PM10, NO2, SO2, CO, O3 мають різну динаміку")
                print("      - Одночасна зміна = API повернув дефолтні/помилкові значення")
                print("")
                print("   🔧 РЕКОМЕНДАЦІЯ: Видалити ці записи з тренувальних даних!")
                is_api_glitch = True
            else:
                print(f"   ✅ Тільки {significant_jumps} параметрів стрибнули")
                print("   ℹ️ Схоже на реальну подію (напр. викид забруднювачів)")
            
            # Додаткова перевірка: чи значення "округлені"?
            print(f"\n🔎 Перевірка на підозрілі значення:")
            for i, param in enumerate(parameters):
                actual = y_test[max_jump_idx, i]
                # Перевірити чи значення "підозріло округлене" (0, 5, 10, 100 тощо)
                if actual in [0, 1, 5, 10, 50, 100, 200, 500]:
                    print(f"   ⚠️ {param}: {actual} (підозріло округлене значення!)")
            
            # Перевірити timestamp
            anomaly_time = anomaly_row['measured_at']
            train_end_time = train_df['measured_at'].max()
            
            print(f"\n📅 Часова перевірка:")
            print(f"   Train закінчився: {train_end_time.strftime('%d-%m %H:%M')}")
            print(f"   Аномалія сталась: {anomaly_time.strftime('%d-%m %H:%M')}")
            
            time_diff = (anomaly_time - train_end_time).total_seconds() / 3600
            print(f"   Різниця: {time_diff:.1f} годин після train")
            
            # Перевірити чи модель бачила такі значення раніше
            if max_jump_idx > 0:
                prev_pm25 = y_test[max_jump_idx - 1, 0]
                curr_pm25 = y_test[max_jump_idx, 0]
                predicted_pm25 = predictions[max_jump_idx, 0]
                
                print(f"\n🤖 Чому модель передбачила {predicted_pm25:.1f}?")
                print(f"   Попереднє значення: {prev_pm25:.1f}")
                print(f"   Фактичне значення:  {curr_pm25:.1f}")
                print(f"   Модель передбачила: {predicted_pm25:.1f}")
                
                if predicted_pm25 > prev_pm25 * 2:
                    print(f"\n   💡 Модель побачила ЩОСЬ в features що вказувало на погіршення:")
                    print(f"      - Можливо інші параметри (CO, NO2) вже почали рости")
                    print(f"      - Можливо погодні умови (вітер впав, вологість зросла)")
                    print(f"      - Можливо EWM/rolling features показали тренд")
                    
                    # Показати які features найбільше вплинули
                    print(f"\n   📊 Найважливіші features для цього прогнозу:")
                    print(f"      (features з importance > 0.05)")
                    for idx, row_imp in importance_df.iterrows():
                        if row_imp['importance'] > 0.05:
                            feat_name = row_imp['feature']
                            feat_value = anomaly_row.get(feat_name, 0)
                            print(f"         {feat_name:30s} = {feat_value:.2f} (importance: {row_imp['importance']:.3f})")
            
            if time_diff > gap_size / 24:
                print(f"   ✅ Аномалія в test даних (після gap)")
            else:
                print(f"   ⚠️ Аномалія близько до train даних")
            
            # Зберегти деталі для response
            anomaly_details = {
                'timestamp': anomaly_time.isoformat(),
                'index': int(max_jump_idx),
                'parameters': anomaly_params,
                'jumped_count': int(significant_jumps),
                'total_params': len(jumps),
                'is_api_glitch': is_api_glitch,
                'hours_after_train': float(time_diff)
            }
        
        print(f"{'='*70}\n")
        
        # Додати anomaly_details до diagnostic_results
        diagnostic_results = {
            'test1_feature_importance': bool(test1_passed),
            'test2_persistence': bool(test2_passed),
            'test2_improvement': round(float(improvement), 1),
            'test3_shuffle': bool(test3_passed),
            'test3_difference': round(float(mae_diff_pct), 1),
            'test4_manual': bool(test4_passed),
            'test5_overfitting': bool(test5_passed),
            'total_passed': int(checks_passed),
            'total_tests': int(total_checks),
            'anomaly_analysis': anomaly_details,  # ✅ Додано!
            'top_features': [
                {
                    'feature': str(row['feature']),
                    'importance': round(float(row['importance']), 4)
                }
                for _, row in importance_df.head(20).iterrows()
            ]
        }
        
        return jsonify({
            'success': True,
            'district_id': district_id,
            'metrics': metrics,
            'comparison_data': comparison_data,
            'diagnostic': diagnostic_results,
            'data_info': {
                'total_samples': len(df),
                'train_samples': train_size,
                'gap_samples': gap_size,
                'test_samples': len(test_df),
                'features_count': len(feature_cols),
                'date_range': {
                    'start': df['measured_at'].min().isoformat(),
                    'end': df['measured_at'].max().isoformat()
                }
            }
        })
    
        
    except Exception as e:
        print(f"❌ Помилка тестування: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/test-data-info/<int:district_id>', methods=['GET'])
def get_test_data_info(district_id):
    """Інформація про доступні дані для тестування"""
    try:
        query = """
            SELECT COUNT(*) as total_records,
                   MIN(measured_at) as first_date,
                   MAX(measured_at) as last_date,
                   COUNT(DISTINCT DATE(measured_at)) as days_with_data
            FROM air_quality_history
            WHERE district_id = %s AND is_forecast = false
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
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/test-scenario', methods=['POST'])
def test_scenario():
    """Тестування моделі на екстремальному сценарії"""
    try:
        data = request.json
        district_id = data.get('district_id')
        scenario = data.get('scenario', 'fire')
        custom_values = data.get('custom_values')
        
        print(f"\n{'='*70}")
        print(f"🔥 СЦЕНАРНИЙ ТЕСТ - Район {district_id}, Сценарій: {scenario}")
        print(f"{'='*70}")
        
        from data.preprocessor import DataPreprocessor
        from models.air_quality_model import AirQualityModel
        
        print("\n1️⃣ Завантаження моделі...")
        model = AirQualityModel(district_id, model_type='xgboost')
        
        if not model.load_model():
            return jsonify({
                'success': False,
                'error': 'Модель не натренована. Спочатку запустіть тест моделі.'
            }), 400
        
        print("✅ Модель завантажена")
        
        print("\n2️⃣ Завантаження контексту...")
        query = """
            SELECT pm25, pm10, no2, so2, co, o3,
                   temperature, humidity, pressure, 
                   wind_speed, wind_direction, measured_at
            FROM air_quality_history
            WHERE district_id = %s AND is_forecast = false
            ORDER BY measured_at DESC
            LIMIT 50
        """
        
        conn = db.get_connection()
        df_context = pd.read_sql_query(query, conn, params=(district_id,))
        conn.close()
        
        if len(df_context) < 10:
            return jsonify({
                'success': False,
                'error': 'Недостатньо історичних даних для контексту'
            }), 400
        
        print(f"✅ Завантажено {len(df_context)} записів контексту")
        
        print(f"\n3️⃣ Створення екстремального сценарію: {scenario}")
        
        last_record = df_context.iloc[0].copy()
        
        if custom_values:
            extreme_values = custom_values
        else:
            scenarios_values = {
                'fire': {
                    'pm25': 250, 'pm10': 300, 'no2': 80, 'so2': 50,
                    'co': 2000, 'o3': 120, 'temperature': 28,
                    'humidity': 45, 'wind_speed': 2
                },
                'industrial_accident': {
                    'pm25': 80, 'pm10': 120, 'no2': 200, 'so2': 150,
                    'co': 3500, 'o3': 40, 'temperature': 22,
                    'humidity': 55, 'wind_speed': 3
                },
                'heavy_fog': {
                    'pm25': 65, 'pm10': 150, 'no2': 60, 'so2': 40,
                    'co': 800, 'o3': 30, 'temperature': 8,
                    'humidity': 95, 'wind_speed': 0.5
                },
                'strong_wind': {
                    'pm25': 12, 'pm10': 25, 'no2': 20, 'so2': 15,
                    'co': 400, 'o3': 60, 'temperature': 18,
                    'humidity': 60, 'wind_speed': 15
                },
                'normal': {
                    'pm25': 25, 'pm10': 40, 'no2': 35, 'so2': 25,
                    'co': 600, 'o3': 70, 'temperature': 15,
                    'humidity': 65, 'wind_speed': 5
                }
            }
            extreme_values = scenarios_values.get(scenario, scenarios_values['fire'])
        
        extreme_record = last_record.copy()
        for key, value in extreme_values.items():
            if key in extreme_record.index:
                extreme_record[key] = value
        
        extreme_record['measured_at'] = pd.Timestamp.now()
        
        df_with_extreme = pd.concat([
            pd.DataFrame([extreme_record]),
            df_context
        ], ignore_index=True)
        
        print("✅ Екстремальні значення:")
        for key, value in extreme_values.items():
            print(f"   {key}: {value}")
        
        print("\n4️⃣ Підготовка features...")
        preprocessor = DataPreprocessor(district_id)
        
        import os
        import joblib
        scaler_path = f"{Config.MODEL_PATH}/scaler_district_{district_id}.pkl"
        
        if not os.path.exists(scaler_path):
            return jsonify({
                'success': False,
                'error': 'Scaler не знайдено. Спочатку запустіть тест моделі.'
            }), 400
        
        preprocessor.scaler = joblib.load(scaler_path)
        
        # Отримати назви колонок features
        feature_cols = preprocessor.get_feature_columns()
        
        print(f"✅ Scaler завантажено")
        
        # 5. ІТЕРАТИВНЕ прогнозування на наступні 12 годин
        print("\n5️⃣ ІТЕРАТИВНЕ прогнозування наступних 12 годин...")
        
        forecasts = []
        current_time = pd.Timestamp.now()
        parameters = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']
        
        # Використовуємо df_with_extreme для ітеративного прогнозу
        working_df = df_with_extreme.copy()
        
        for hour in range(1, 13):
            print(f"   Година {hour}...")
            
            # 1. Підготувати features з поточного стану
            df_features = preprocessor.prepare_features(working_df)
            
            if len(df_features) == 0:
                print(f"   ⚠️ Не вдалося підготувати features для години {hour}")
                break
            
            # 2. Взяти перший рядок (найсвіжіші дані)
            X_current = df_features[feature_cols].iloc[0:1].values
            X_current_scaled = preprocessor.scaler.transform(X_current)
            
            # 3. Зробити прогноз
            prediction = model.predict(X_current_scaled)[0]
            
            # 4. Створити запис прогнозу
            forecast_time = current_time + timedelta(hours=hour)
            
            forecast_dict = {
                'timestamp': forecast_time.isoformat(),
                'hour': hour
            }
            
            for i, param in enumerate(parameters):
                forecast_dict[param] = round(float(prediction[i]), 2)
            
            # Розрахувати AQI
            aqi = calculate_aqi_from_pm25(forecast_dict['pm25'])
            forecast_dict['aqi'] = int(aqi)
            forecast_dict['aqi_status'] = get_aqi_status(aqi)
            
            forecasts.append(forecast_dict)
            
            # 5. ВАЖЛИВО: Оновити робочий DataFrame
            # Створити новий запис з прогнозом
            new_row = working_df.iloc[0].copy()
            new_row['measured_at'] = forecast_time
            
            # Оновити прогнозовані значення
            for i, param in enumerate(parameters):
                new_row[param] = prediction[i]
            
            # Додати новий запис на початок DataFrame
            working_df = pd.concat([
                pd.DataFrame([new_row]),
                working_df
            ], ignore_index=True)
            
            # Обмежити розмір (зберігаємо останні 50 записів)
            working_df = working_df.head(50)
            
            # Показати що спрогнозувалось
            if hour <= 3 or hour == 12:  # Показати перші 3 і останню
                pm25_val = forecast_dict['pm25']
                co_val = forecast_dict['co']
                print(f"      → PM2.5: {pm25_val:.1f}, CO: {co_val:.1f}, AQI: {forecast_dict['aqi']}")
        
        print(f"✅ Створено {len(forecasts)} ітеративних прогнозів")
        
        print("\n6️⃣ Аналіз тренду по параметрах...")
        
        SAFE_THRESHOLDS = {
            'pm25': 12.0, 'pm10': 50.0, 'no2': 40.0,
            'so2': 20.0, 'co': 4000.0, 'o3': 100.0
        }
        
        MODERATE_THRESHOLDS = {
            'pm25': 35.4, 'pm10': 154.0, 'no2': 100.0,
            'so2': 75.0, 'co': 9400.0, 'o3': 140.0
        }
        
        CRITICAL_THRESHOLDS = {
            'pm25': 150.4, 'pm10': 254.0, 'no2': 200.0,
            'so2': 185.0, 'co': 15400.0, 'o3': 200.0
        }
        
        parameter_analysis = {}
        
        for param in parameters:
            initial_value = extreme_values[param]
            final_value = forecasts[-1][param]
            
            safe_time = None
            moderate_time = None
            
            for i, f in enumerate(forecasts):
                if f[param] <= SAFE_THRESHOLDS[param] and safe_time is None:
                    safe_time = i + 1
                if f[param] <= MODERATE_THRESHOLDS[param] and moderate_time is None:
                    moderate_time = i + 1
            
            initial_status = 'critical' if initial_value > CRITICAL_THRESHOLDS[param] else \
                           'high' if initial_value > MODERATE_THRESHOLDS[param] else \
                           'moderate' if initial_value > SAFE_THRESHOLDS[param] else 'safe'
            
            final_status = 'critical' if final_value > CRITICAL_THRESHOLDS[param] else \
                         'high' if final_value > MODERATE_THRESHOLDS[param] else \
                         'moderate' if final_value > SAFE_THRESHOLDS[param] else 'safe'
            
            percent_change = ((final_value - initial_value) / initial_value * 100) if initial_value > 0 else 0
            
            parameter_analysis[param] = {
                'initial_value': round(float(initial_value), 2),
                'final_value': round(float(final_value), 2),
                'initial_status': initial_status,
                'final_status': final_status,
                'percent_change': round(percent_change, 1),
                'safe_threshold': SAFE_THRESHOLDS[param],
                'moderate_threshold': MODERATE_THRESHOLDS[param],
                'critical_threshold': CRITICAL_THRESHOLDS[param],
                'time_to_safe': safe_time,
                'time_to_moderate': moderate_time,
                'will_be_safe': safe_time is not None,
                'will_be_moderate': moderate_time is not None
            }
            
            print(f"   {param.upper()}: {initial_value:.1f} → {final_value:.1f} ({percent_change:+.1f}%)")
            if safe_time:
                print(f"      ✅ Безпечний рівень через {safe_time} год")
            elif moderate_time:
                print(f"      ⚠️ Помірний рівень через {moderate_time} год")
            else:
                print(f"      ❌ Не досягне безпечного рівня")
        
        initial_aqi = int(calculate_aqi_from_pm25(extreme_values['pm25']))
        final_aqi = forecasts[-1]['aqi']
        max_aqi = max(f['aqi'] for f in forecasts)
        min_aqi = min(f['aqi'] for f in forecasts)
        
        slowest_recovery = None
        slowest_recovery_time = 0
        
        for param, info in parameter_analysis.items():
            if info['will_be_safe'] and info['time_to_safe'] > slowest_recovery_time:
                slowest_recovery = param
                slowest_recovery_time = info['time_to_safe']
        
        all_parameters_safe = all(info['will_be_safe'] for info in parameter_analysis.values())
        
        critical_pollutants = [
            param for param, info in parameter_analysis.items() 
            if info['initial_status'] == 'critical'
        ]
        
        analysis = {
            'initial_aqi': initial_aqi,
            'final_aqi': final_aqi,
            'max_aqi': max_aqi,
            'min_aqi': min_aqi,
            'trend': 'improving' if final_aqi < initial_aqi else 'worsening' if final_aqi > initial_aqi else 'stable',
            'all_parameters_safe': all_parameters_safe,
            'slowest_recovery': slowest_recovery,
            'slowest_recovery_time': slowest_recovery_time,
            'critical_pollutants': critical_pollutants,
            'parameter_details': parameter_analysis
        }
        
        print(f"\n   Загальний тренд: {analysis['trend']}")
        print(f"   AQI: {initial_aqi} → {final_aqi}")
        if all_parameters_safe:
            print(f"   ✅ Всі параметри досягнуть безпечного рівня")
            print(f"   ⏱️ Найповільніше відновлення: {slowest_recovery} ({slowest_recovery_time} год)")
        else:
            print(f"   ⚠️ Не всі параметри досягнуть безпечного рівня за 12 годин")
        
        print(f"\n{'='*70}")
        print("✅ СЦЕНАРНИЙ ТЕСТ ЗАВЕРШЕНО")
        print(f"{'='*70}\n")
        
        return jsonify({
            'success': True,
            'district_id': district_id,
            'scenario': scenario,
            'initial_values': extreme_values,
            'forecasts': forecasts,
            'analysis': analysis
        })
        
    except Exception as e:
        print(f"❌ Помилка сценарного тесту: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

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
    print(f"   POST /test-model")
    print(f"   GET  /test-data-info/<district_id>")
    print(f"   POST /test-scenario")
    print("=" * 60)
    
    app.run(
        host='0.0.0.0',
        port=Config.FLASK_PORT,
        debug=Config.FLASK_DEBUG
    )