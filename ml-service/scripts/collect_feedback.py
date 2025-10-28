# ml-service/scripts/collect_feedback.py
"""
Збір feedback: порівняння прогнозів з реальними даними
"""
import sys
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db_helper import DatabaseHelper
from data.preprocessor import DataPreprocessor
from config import Config
import numpy as np
import joblib

def collect_feedback_for_district(district_id):
    """Зібрати feedback для одного району"""
    
    db = DatabaseHelper()
    conn = db.get_connection()
    cursor = conn.cursor()
    
    print(f"\n📍 Район {district_id}:")
    
    try:
        # Завантажити scaler
        preprocessor = DataPreprocessor(district_id)
        
        if not os.path.exists(preprocessor.scaler_path):
            print(f"   ⚠️ Scaler не знайдено")
            return 0
        
        scaler = joblib.load(preprocessor.scaler_path)
        print(f"   ✅ Scaler завантажено")
        
        # Знайти прогнози
        cursor.execute("""
            SELECT id, district_id, pm25, pm10, no2, so2, co, o3, measured_at
            FROM air_quality_history
            WHERE district_id = %s
              AND is_forecast = TRUE
              AND measured_at <= NOW()
              AND measured_at >= NOW() - INTERVAL '24 hours'
            ORDER BY measured_at DESC
            LIMIT 50
        """, (district_id,))
        
        forecasts = cursor.fetchall()
        
        if not forecasts:
            print("   ⚠️ Немає прогнозів")
            return 0
        
        print(f"   📊 Знайдено {len(forecasts)} прогнозів")
        
        feedback_count = 0
        
        for forecast in forecasts:
            forecast_id = forecast[0]
            pred_pm25, pred_pm10, pred_no2, pred_so2, pred_co, pred_o3 = forecast[2:8]
            forecast_time = forecast[8]
            
            # Перевірити чи вже є feedback
            cursor.execute("SELECT COUNT(*) FROM training_feedback WHERE forecast_id = %s", (forecast_id,))
            if cursor.fetchone()[0] > 0:
                continue
            
            # Знайти реальні дані
            cursor.execute("""
                SELECT pm25, pm10, no2, so2, co, o3
                FROM air_quality_history
                WHERE district_id = %s
                  AND is_forecast = FALSE
                  AND measured_at BETWEEN %s - INTERVAL '30 minutes' 
                                      AND %s + INTERVAL '30 minutes'
                ORDER BY ABS(EXTRACT(EPOCH FROM (measured_at - %s)))
                LIMIT 1
            """, (district_id, forecast_time, forecast_time, forecast_time))
            
            actual = cursor.fetchone()
            if not actual:
                continue
            
            actual_pm25, actual_pm10, actual_no2, actual_so2, actual_co, actual_o3 = actual
            
            try:
                # Нормалізувати
                pred_vector = np.array([[pred_pm25, 15.0, 70, pred_pm10, pred_no2, pred_so2, pred_co, pred_o3]])
                actual_vector = np.array([[actual_pm25, 15.0, 70, actual_pm10, actual_no2, actual_so2, actual_co, actual_o3]])
                
                pred_norm = scaler.transform(pred_vector)[0]
                actual_norm = scaler.transform(actual_vector)[0]
                
                # Помилки
                errors = [
                    abs(pred_norm[0] - actual_norm[0]),  # pm25
                    abs(pred_norm[3] - actual_norm[3]),  # pm10
                    abs(pred_norm[4] - actual_norm[4]),  # no2
                    abs(pred_norm[5] - actual_norm[5]),  # so2
                    abs(pred_norm[6] - actual_norm[6]),  # co
                    abs(pred_norm[7] - actual_norm[7])   # o3
                ]
                
                avg_error = sum(errors) / len(errors)
                
                # Конвертувати в Python float (важливо!)
                pred_vals = [float(pred_norm[0]), float(pred_norm[3]), float(pred_norm[4]), 
                            float(pred_norm[5]), float(pred_norm[6]), float(pred_norm[7])]
                actual_vals = [float(actual_norm[0]), float(actual_norm[3]), float(actual_norm[4]),
                              float(actual_norm[5]), float(actual_norm[6]), float(actual_norm[7])]
                error_vals = [float(e) for e in errors]
                
                # Зберегти
                cursor.execute("""
                    INSERT INTO training_feedback (
                        district_id, forecast_id,
                        predicted_pm25, predicted_pm10, predicted_no2, predicted_so2, predicted_co, predicted_o3,
                        actual_pm25, actual_pm10, actual_no2, actual_so2, actual_co, actual_o3,
                        error_pm25, error_pm10, error_no2, error_so2, error_co, error_o3,
                        avg_error, forecast_for, used_for_training
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, FALSE
                    )
                """, (
                    district_id, forecast_id,
                    pred_vals[0], pred_vals[1], pred_vals[2], pred_vals[3], pred_vals[4], pred_vals[5],
                    actual_vals[0], actual_vals[1], actual_vals[2], actual_vals[3], actual_vals[4], actual_vals[5],
                    error_vals[0], error_vals[1], error_vals[2], error_vals[3], error_vals[4], error_vals[5],
                    float(avg_error), forecast_time
                ))
                
                feedback_count += 1
                
            except Exception as e:
                print(f"   ⚠️ Помилка: {e}")
                conn.rollback()
                continue
        
        conn.commit()
        
        if feedback_count > 0:
            print(f"   ✅ Додано {feedback_count} feedback")
        else:
            print(f"   ⚠️ Не знайдено пар прогноз-реальність")
        
        return feedback_count
        
    except Exception as e:
        print(f"   ❌ Помилка: {e}")
        conn.rollback()
        return 0
    finally:
        cursor.close()
        conn.close()

def collect_feedback_all():
    """Зібрати feedback для всіх районів"""
    
    print("=" * 70)
    print("🔄 ЗБІР FEEDBACK")
    print("=" * 70)
    print(f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    total = sum(collect_feedback_for_district(d['id']) for d in Config.DISTRICTS)
    
    print("\n" + "=" * 70)
    if total > 0:
        print(f"✅ ЗІБРАНО: {total} feedback")
        print(f"\n💡 Коли буде 50+, запусти: python scripts/incremental_training.py")
    else:
        print("⚠️ Feedback не зібрано (можливо вже зібрано раніше)")
    print("=" * 70)

if __name__ == "__main__":
    collect_feedback_all()