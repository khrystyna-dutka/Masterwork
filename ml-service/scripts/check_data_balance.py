# ml-service/scripts/check_data_balance.py
"""
Перевірка балансу даних по районах
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db_helper import DatabaseHelper
from config import Config

def check_data_balance():
    """Перевірити розподіл даних по районах"""
    
    print("=" * 80)
    print("🔍 АНАЛІЗ БАЛАНСУ ДАНИХ ПО РАЙОНАХ")
    print("=" * 80)
    
    db = DatabaseHelper()
    conn = db.get_connection()
    cursor = conn.cursor()
    
    print("\n📊 1. РЕАЛЬНІ ДАНІ (is_forecast=FALSE) за останні 7 днів:")
    print("-" * 80)
    cursor.execute("""
        SELECT 
            district_id,
            COUNT(*) as total,
            MIN(measured_at) as first_time,
            MAX(measured_at) as last_time
        FROM air_quality_history
        WHERE is_forecast = FALSE
          AND measured_at >= NOW() - INTERVAL '7 days'
        GROUP BY district_id
        ORDER BY district_id
    """)
    
    real_data = cursor.fetchall()
    for row in real_data:
        district_name = Config.DISTRICTS[row[0]-1]['name']
        print(f"Район {row[0]} ({district_name:15s}): {row[1]:4d} записів  "
              f"({row[2].strftime('%d.%m %H:%M')} → {row[3].strftime('%d.%m %H:%M')})")
    
    print("\n📈 2. ПРОГНОЗИ (is_forecast=TRUE) за останні 24 години:")
    print("-" * 80)
    cursor.execute("""
        SELECT 
            district_id,
            COUNT(*) as total,
            MIN(measured_at) as first_time,
            MAX(measured_at) as last_time
        FROM air_quality_history
        WHERE is_forecast = TRUE
          AND measured_at >= NOW() - INTERVAL '24 hours'
        GROUP BY district_id
        ORDER BY district_id
    """)
    
    forecast_data = cursor.fetchall()
    for row in forecast_data:
        district_name = Config.DISTRICTS[row[0]-1]['name']
        print(f"Район {row[0]} ({district_name:15s}): {row[1]:4d} прогнозів  "
              f"({row[2].strftime('%d.%m %H:%M')} → {row[3].strftime('%d.%m %H:%M')})")
    
    print("\n🔄 3. FEEDBACK (зібрані порівняння):")
    print("-" * 80)
    cursor.execute("""
        SELECT 
            district_id,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE used_for_training = TRUE) as used,
            COUNT(*) FILTER (WHERE used_for_training = FALSE) as unused
        FROM training_feedback
        GROUP BY district_id
        ORDER BY district_id
    """)
    
    feedback_data = cursor.fetchall()
    for row in feedback_data:
        district_name = Config.DISTRICTS[row[0]-1]['name']
        print(f"Район {row[0]} ({district_name:15s}): {row[1]:3d} feedback  "
              f"(використано: {row[2]}, невикористано: {row[3]})")
    
    print("\n💡 4. РЕКОМЕНДАЦІЇ:")
    print("-" * 80)
    
    # Знайти райони з малою кількістю даних
    real_counts = {row[0]: row[1] for row in real_data}
    forecast_counts = {row[0]: row[1] for row in forecast_data}
    feedback_counts = {row[0]: row[1] for row in feedback_data}
    
    for district_id in range(1, 7):
        district_name = Config.DISTRICTS[district_id-1]['name']
        real = real_counts.get(district_id, 0)
        forecasts = forecast_counts.get(district_id, 0)
        feedback = feedback_counts.get(district_id, 0)
        
        issues = []
        if real < 100:
            issues.append(f"мало реальних даних ({real})")
        if forecasts < 10:
            issues.append(f"мало прогнозів ({forecasts})")
        if feedback < 5:
            issues.append(f"мало feedback ({feedback})")
        
        if issues:
            print(f"⚠️  Район {district_id} ({district_name}): {', '.join(issues)}")
    
    print("\n" + "=" * 80)
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    check_data_balance()