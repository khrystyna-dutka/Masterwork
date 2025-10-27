from utils.db_helper import DatabaseHelper
from data.preprocessor import DataPreprocessor
from config import Config

def test_database():
    """Тестування підключення до БД та отримання даних"""
    
    print("=" * 60)
    print("🧪 ТЕСТУВАННЯ ПІДКЛЮЧЕННЯ ДО БАЗИ ДАНИХ")
    print("=" * 60)
    
    db = DatabaseHelper()
    
    # Тест 1: Підключення
    print("\n📌 Тест 1: Підключення до PostgreSQL")
    db.test_connection()
    
    # Тест 2: Статистика по районах
    print("\n📌 Тест 2: Статистика по районах")
    for district in Config.DISTRICTS:
        print(f"\n🏘️ Район: {district['name']} (ID: {district['id']})")
        stats = db.get_data_stats(district['id'])
        
        if stats:
            print(f"   📊 Всього записів: {stats.get('total_records', 0)}")
            print(f"   📅 Перша дата: {stats.get('earliest_date', 'N/A')}")
            print(f"   📅 Остання дата: {stats.get('latest_date', 'N/A')}")
            print(f"   💨 Середній PM2.5: {stats.get('avg_pm25', 0):.2f}")
            print(f"   🌡️ Середній AQI: {stats.get('avg_aqi', 0):.2f}")
        else:
            print("   ⚠️ Немає даних")
    
    # Тест 3: Отримання даних для першого району
    print("\n📌 Тест 3: Отримання історичних даних")
    district_id = 1
    df = db.get_historical_data(district_id, days=7)
    
    if not df.empty:
        print(f"\n✅ Отримано {len(df)} записів за останні 7 днів")
        print(f"   Колонки: {', '.join(df.columns[:5])}...")
        print(f"\n📊 Перші 3 записи:")
        print(df[['measured_at', 'pm25', 'aqi', 'temperature']].head(3))
    else:
        print("⚠️ Немає даних для тестування")
        print("💡 Підказка: Спочатку потрібно додати дані в таблицю air_quality_history")
        return
    
    # Тест 4: Препроцесинг даних
    print("\n📌 Тест 4: Підготовка даних для ML")
    preprocessor = DataPreprocessor(district_id)
    
    prepared_data = preprocessor.prepare_data(df)
    
    if prepared_data is not None and not prepared_data.empty:
        print(f"✅ Дані підготовлено: {prepared_data.shape}")
        print(f"   Ознаки: {', '.join(prepared_data.columns)}")
    
    print("\n" + "=" * 60)
    print("✅ ТЕСТУВАННЯ ЗАВЕРШЕНО")
    print("=" * 60)

if __name__ == "__main__":
    test_database()