# ml-service/scripts/check_district_2.py
"""
Детальна перевірка району 2
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db_helper import DatabaseHelper

def check_district_2():
    print("=" * 70)
    print("🔍 ДЕТАЛЬНА ПЕРЕВІРКА РАЙОНУ 2 (ЗАЛІЗНИЧНИЙ)")
    print("=" * 70)
    
    db = DatabaseHelper()
    conn = db.get_connection()
    cursor = conn.cursor()
    
    # 1. Реальні дані
    print("\n1️⃣ РЕАЛЬНІ ДАНІ (is_forecast=FALSE):")
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            MIN(measured_at) as first_time,
            MAX(measured_at) as last_time,
            AVG(pm25) as avg_pm25
        FROM air_quality_history
        WHERE district_id = 2
          AND is_forecast = FALSE
          AND measured_at >= NOW() - INTERVAL '7 days'
    """)
    
    real = cursor.fetchone()
    print(f"   Всього: {real[0]} записів")
    if real[1]:
        print(f"   Період: {real[1]} → {real[2]}")
        print(f"   Середній PM2.5: {real[3]:.2f}")
    
    # 2. Прогнози
    print("\n2️⃣ ПРОГНОЗИ (is_forecast=TRUE):")
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            MIN(measured_at) as first_time,
            MAX(measured_at) as last_time
        FROM air_quality_history
        WHERE district_id = 2
          AND is_forecast = TRUE
          AND measured_at >= NOW() - INTERVAL '24 hours'
    """)
    
    forecast = cursor.fetchone()
    print(f"   Всього: {forecast[0]} прогнозів")
    if forecast[1]:
        print(f"   Період: {forecast[1]} → {forecast[2]}")
    
    # 3. Feedback
    print("\n3️⃣ FEEDBACK:")
    cursor.execute("""
        SELECT COUNT(*) FROM training_feedback
        WHERE district_id = 2
    """)
    
    feedback_count = cursor.fetchone()[0]
    print(f"   Всього: {feedback_count} feedback")
    
    # 4. Прогнози без відповідних реальних даних
    print("\n4️⃣ ПРОГНОЗИ БЕЗ РЕАЛЬНИХ ДАНИХ:")
    cursor.execute("""
        SELECT 
            f.id,
            f.measured_at as forecast_time,
            (
                SELECT COUNT(*)
                FROM air_quality_history r
                WHERE r.district_id = 2
                  AND r.is_forecast = FALSE
                  AND r.measured_at BETWEEN f.measured_at - INTERVAL '30 minutes'
                                        AND f.measured_at + INTERVAL '30 minutes'
            ) as has_real_data
        FROM air_quality_history f
        WHERE f.district_id = 2
          AND f.is_forecast = TRUE
          AND f.measured_at >= NOW() - INTERVAL '24 hours'
        ORDER BY f.measured_at DESC
        LIMIT 10
    """)
    
    forecasts_check = cursor.fetchall()
    print(f"   Перевірка останніх 10 прогнозів:")
    
    no_match_count = 0
    for row in forecasts_check:
        has_real = row[2] > 0
        status = "✅" if has_real else "❌"
        print(f"   {status} Прогноз на {row[1]} - реальні дані: {'є' if has_real else 'НЕМАЄ'}")
        if not has_real:
            no_match_count += 1
    
    print(f"\n   ⚠️ Прогнозів без реальних даних: {no_match_count}/10")
    
    # 5. Порівняння з іншими районами
    print("\n5️⃣ ПОРІВНЯННЯ З ІНШИМИ РАЙОНАМИ (за 24 год):")
    cursor.execute("""
        SELECT 
            district_id,
            COUNT(*) FILTER (WHERE is_forecast = FALSE) as real_data,
            COUNT(*) FILTER (WHERE is_forecast = TRUE) as forecasts
        FROM air_quality_history
        WHERE measured_at >= NOW() - INTERVAL '24 hours'
        GROUP BY district_id
        ORDER BY district_id
    """)
    
    comparison = cursor.fetchall()
    for row in comparison:
        print(f"   Район {row[0]}: {row[1]} реальних, {row[2]} прогнозів")
    
    print("\n" + "=" * 70)
    
    if no_match_count > 5:
        print("💡 РЕКОМЕНДАЦІЯ:")
        print("   Проблема: прогнози не збігаються з реальними даними по часу")
        print("   Рішення: збільшити вікно пошуку в collect_feedback.py")
        print("   Або: перевірити чи правильно працює data collector")
    
    if real[0] < 50:
        print("💡 РЕКОМЕНДАЦІЯ:")
        print("   Проблема: мало реальних даних для району 2")
        print("   Рішення: перевірити data collector API")
    
    print("=" * 70)
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    check_district_2()