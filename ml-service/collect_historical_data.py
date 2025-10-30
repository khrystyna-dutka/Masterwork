# ml-service/collect_historical_data.py
import requests
import psycopg2
from datetime import datetime, timedelta
import time
import os
from dotenv import load_dotenv

load_dotenv()

# Конфігурація
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY')
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'ecolviv'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'root')
}

# Райони Львова з координатами
DISTRICTS = [
    {'id': 1, 'name': 'Галицький', 'lat': 49.842, 'lon': 24.0315},
    {'id': 2, 'name': 'Франківський', 'lat': 49.8326, 'lon': 23.9964},
    {'id': 3, 'name': 'Залізничний', 'lat': 49.8173, 'lon': 23.9818},
    {'id': 4, 'name': 'Шевченківський', 'lat': 49.8293, 'lon': 24.0081},
    {'id': 5, 'name': 'Личаківський', 'lat': 49.8322, 'lon': 24.0512},
    {'id': 6, 'name': 'Сихівський', 'lat': 49.8025, 'lon': 23.9815}
]

def get_historical_air_pollution(lat, lon, start_timestamp, end_timestamp):
    """
    Отримати історичні дані про забруднення повітря
    API: http://api.openweathermap.org/data/2.5/air_pollution/history
    """
    url = "http://api.openweathermap.org/data/2.5/air_pollution/history"
    params = {
        'lat': lat,
        'lon': lon,
        'start': start_timestamp,
        'end': end_timestamp,
        'appid': OPENWEATHER_API_KEY
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"❌ Помилка запиту: {e}")
        return None

def save_to_database(district_id, data_list):
    """Зберегти дані в БД"""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    inserted = 0
    
    for data_point in data_list:
        try:
            components = data_point['components']
            measured_at = datetime.fromtimestamp(data_point['dt'])
            
            # Перевірити чи вже є такий запис
            cursor.execute(
                "SELECT id FROM air_quality_history WHERE district_id = %s AND measured_at = %s",
                (district_id, measured_at)
            )
            
            if cursor.fetchone() is not None:
                continue  # Вже є
            
            # Вставити новий запис
            cursor.execute("""
                INSERT INTO air_quality_history 
                (district_id, aqi, aqi_status, pm25, pm10, no2, so2, co, o3, 
                 measured_at, data_source, is_forecast)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                district_id,
                data_point['main']['aqi'] * 50,  # Конвертувати 1-5 в AQI
                'Historical',
                components.get('pm2_5', 0),
                components.get('pm10', 0),
                components.get('no2', 0),
                components.get('so2', 0),
                components.get('co', 0),
                components.get('o3', 0),
                measured_at,
                'openweather_history',
                False
            ))
            
            inserted += 1
            
        except Exception as e:
            print(f"  ⚠️ Помилка збереження: {e}")
            continue
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return inserted

def collect_historical_data(days_back=30):
    """
    Зібрати історичні дані за останні N днів
    """
    print("=" * 70)
    print(f"🚀 ЗБІР ІСТОРИЧНИХ ДАНИХ ЗА ОСТАННІ {days_back} ДНІВ")
    print("=" * 70)
    
    if not OPENWEATHER_API_KEY:
        print("❌ OPENWEATHER_API_KEY не знайдено в .env!")
        return
    
    end_time = datetime.now()
    start_time = end_time - timedelta(days=days_back)
    
    start_timestamp = int(start_time.timestamp())
    end_timestamp = int(end_time.timestamp())
    
    print(f"📅 Період: {start_time.strftime('%Y-%m-%d')} - {end_time.strftime('%Y-%m-%d')}")
    print()
    
    total_inserted = 0
    
    for district in DISTRICTS:
        print(f"📍 {district['name']} (ID: {district['id']})")
        print(f"   Координати: {district['lat']}, {district['lon']}")
        
        # Отримати дані
        data = get_historical_air_pollution(
            district['lat'], 
            district['lon'],
            start_timestamp,
            end_timestamp
        )
        
        if data and 'list' in data:
            print(f"   📦 Отримано {len(data['list'])} записів")
            
            # Зберегти в БД
            inserted = save_to_database(district['id'], data['list'])
            total_inserted += inserted
            
            print(f"   ✅ Збережено {inserted} нових записів")
        else:
            print("   ❌ Не вдалося отримати дані")
        
        print()
        time.sleep(1)  # Пауза між запитами
    
    print("=" * 70)
    print(f"✅ ЗАВЕРШЕНО! Всього додано {total_inserted} записів")
    print("=" * 70)

if __name__ == "__main__":
    # Зібрати дані за останні 30 днів
    collect_historical_data(days_back=30)