# ml-service/scripts/create_feedback_table.py
"""
Створення таблиці для training feedback (онлайн-навчання)
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db_helper import DatabaseHelper

def create_feedback_table():
    """Створити таблицю training_feedback"""
    
    print("=" * 70)
    print("📊 СТВОРЕННЯ ТАБЛИЦІ TRAINING_FEEDBACK")
    print("=" * 70)
    
    sql = """
    -- Таблиця для зберігання feedback (порівняння прогнозів з реальністю)
    CREATE TABLE IF NOT EXISTS training_feedback (
        id SERIAL PRIMARY KEY,
        district_id INTEGER NOT NULL,
        
        -- Прогнозовані значення (нормалізовані 0-1)
        predicted_pm25 DECIMAL(10, 4),
        predicted_pm10 DECIMAL(10, 4),
        predicted_no2 DECIMAL(10, 4),
        predicted_so2 DECIMAL(10, 4),
        predicted_co DECIMAL(10, 4),
        predicted_o3 DECIMAL(10, 4),
        
        -- Реальні значення (нормалізовані 0-1)
        actual_pm25 DECIMAL(10, 4),
        actual_pm10 DECIMAL(10, 4),
        actual_no2 DECIMAL(10, 4),
        actual_so2 DECIMAL(10, 4),
        actual_co DECIMAL(10, 4),
        actual_o3 DECIMAL(10, 4),
        
        -- Помилки (MAE)
        error_pm25 DECIMAL(10, 4),
        error_pm10 DECIMAL(10, 4),
        error_no2 DECIMAL(10, 4),
        error_so2 DECIMAL(10, 4),
        error_co DECIMAL(10, 4),
        error_o3 DECIMAL(10, 4),
        avg_error DECIMAL(10, 4),
        
        -- Час прогнозу та реальності
        forecast_for TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Чи використано для навчання
        used_for_training BOOLEAN DEFAULT FALSE
    );
    
    -- Індекси
    CREATE INDEX IF NOT EXISTS idx_feedback_district ON training_feedback(district_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_time ON training_feedback(forecast_for);
    CREATE INDEX IF NOT EXISTS idx_feedback_unused ON training_feedback(district_id, used_for_training) 
        WHERE used_for_training = FALSE;
    """
    
    db = DatabaseHelper()
    
    try:
        print("\n🔧 Підключення до БД...")
        conn = db.get_connection()
        cursor = conn.cursor()
        
        print("📝 Виконання SQL...")
        cursor.execute(sql)
        conn.commit()
        
        print("✅ Таблиця training_feedback створена!")
        
        # Перевірка
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'training_feedback'
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        print(f"\n📊 Створено {len(columns)} колонок:")
        for col_name, col_type in columns[:5]:
            print(f"   • {col_name}: {col_type}")
        print(f"   ... та ще {len(columns) - 5} колонок")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 70)
        print("✅ ТАБЛИЦЯ ГОТОВА!")
        print("=" * 70)
        
    except Exception as e:
        print(f"\n❌ Помилка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    create_feedback_table()