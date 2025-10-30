# ml-service/test_connection.py
from utils.db_helper import DatabaseHelper
from config import Config

print("=" * 60)
print("🧪 ТЕСТУВАННЯ ПІДКЛЮЧЕННЯ ДО БД")
print("=" * 60)

db = DatabaseHelper()

# Тест підключення
db.test_connection()

# Статистика по районах
print("\n📊 СТАТИСТИКА ПО РАЙОНАХ:")
for district in Config.DISTRICTS:
    district_id = district['id']
    district_name = district['name']
    
    stats = db.get_data_stats(district_id)
    
    if stats and stats['total_records'] > 0:
        print(f"\n🏘️ {district_name} (ID: {district_id})")
        print(f"   📝 Записів: {stats['total_records']}")
        print(f"   📅 Період: {stats['first_date']} - {stats['last_date']}")
        print(f"   💨 Середній PM2.5: {stats['avg_pm25']:.2f}")
        print(f"   🌡️ Середній AQI: {stats['avg_aqi']:.2f}")
    else:
        print(f"\n🏘️ {district_name} (ID: {district_id}) - ⚠️ Немає даних")

print("\n" + "=" * 60)
print("✅ ТЕСТ ЗАВЕРШЕНО")
print("=" * 60)