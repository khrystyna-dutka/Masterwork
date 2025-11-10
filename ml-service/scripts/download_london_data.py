# ml-service/scripts/download_london_data.py

import requests
import pandas as pd
from datetime import datetime, timedelta
import time
import json
import numpy as np
import os

def fetch_openaq_data():
    """
    Завантажує реальні дані якості повітря для Лондону з OpenAQ API
    """
    print("🌍 Завантаження даних якості повітря для Лондону...")
    
    # OpenAQ API v2
    base_url = "https://api.openaq.org/v2/measurements"
    
    # Параметри для Лондону
    # Координати Лондону: 51.5074° N, 0.1278° W
    params = {
        'coordinates': '51.5074,-0.1278',
        'radius': 25000,  # 25 км радіус
        'limit': 1000,
        'order_by': 'datetime',
        'sort': 'asc',
        'date_from': (datetime.now() - timedelta(days=60)).strftime('%Y-%m-%d'),
        'date_to': datetime.now().strftime('%Y-%m-%d')
    }
    
    all_measurements = []
    page = 1
    
    print(f"📡 Запит даних з {params['date_from']} до {params['date_to']}...")
    
    while page <= 5:  # Обмежуємо 5 сторінками (~5000 вимірів)
        print(f"   Сторінка {page}...")
        params['page'] = page
        
        try:
            response = requests.get(base_url, params=params, timeout=30)
            
            if response.status_code != 200:
                print(f"   ⚠️ Помилка: {response.status_code}")
                break
            
            data = response.json()
            results = data.get('results', [])
            
            if not results:
                print("   ℹ️ Більше даних немає")
                break
            
            all_measurements.extend(results)
            print(f"   ✅ Отримано {len(results)} записів")
            
            page += 1
            time.sleep(1)  # Затримка між запитами
            
        except Exception as e:
            print(f"   ❌ Помилка: {str(e)}")
            break
    
    print(f"\n✅ Всього завантажено {len(all_measurements)} вимірів")
    
    return all_measurements

def process_measurements(measurements):
    """
    Обробляє дані в потрібний формат
    """
    print("\n🔧 Обробка даних...")
    
    # Групуємо по часу та параметру
    data_by_time = {}
    
    for m in measurements:
        timestamp = m.get('date', {}).get('utc')
        if not timestamp:
            continue
        
        # Округляємо до години
        dt = pd.to_datetime(timestamp)
        hour_key = dt.floor('H')
        
        if hour_key not in data_by_time:
            data_by_time[hour_key] = {}
        
        parameter = m.get('parameter', '').lower()
        value = m.get('value')
        unit = m.get('unit', '')
        
        # Конвертуємо одиниці в μg/m³
        if value is not None:
            if parameter == 'co' and unit == 'ppm':
                value = value * 1150  # ppm to μg/m³
            elif parameter in ['no2', 'so2', 'o3'] and unit == 'ppb':
                conversions = {'no2': 1.88, 'so2': 2.62, 'o3': 2.0}
                value = value * conversions.get(parameter, 1)
            
            # Беремо середнє якщо є кілька вимірів
            if parameter in data_by_time[hour_key]:
                data_by_time[hour_key][parameter].append(value)
            else:
                data_by_time[hour_key][parameter] = [value]
    
    # Створюємо DataFrame
    rows = []
    for timestamp, params in sorted(data_by_time.items()):
        row = {'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S')}
        
        # Усереднюємо значення
        for param in ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']:
            if param in params and params[param]:
                row[param] = sum(params[param]) / len(params[param])
            else:
                row[param] = None
        
        rows.append(row)
    
    df = pd.DataFrame(rows)
    
    print(f"✅ Створено DataFrame: {len(df)} записів")
    print(f"📊 Колонки: {list(df.columns)}")
    print(f"📅 Період: {df['timestamp'].min()} - {df['timestamp'].max()}")
    
    return df

def add_weather_data(df):
    """
    Додає метеорологічні дані (синтетичні для демо)
    """
    print("\n🌤️ Додавання метеорологічних даних...")
    
    # В реальності тут треба API від OpenWeatherMap або аналогічного
    # Для демо генеруємо реалістичні значення
    
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Температура (залежить від пори року та часу доби)
    day_of_year = df['timestamp'].dt.dayofyear
    hour = df['timestamp'].dt.hour
    
    df['temperature'] = (
        10 + 10 * np.sin((day_of_year - 80) / 365 * 2 * np.pi) +  # Річні коливання
        5 * np.sin((hour - 6) / 12 * np.pi)  # Денні коливання
    )
    
    # Вологість (обернено пропорційна температурі)
    df['humidity'] = 75 - df['temperature'] + np.random.normal(0, 5, len(df))
    df['humidity'] = df['humidity'].clip(30, 95)
    
    # Атмосферний тиск
    df['pressure'] = 1013 + np.random.normal(0, 5, len(df))
    
    # Швидкість вітру
    df['wind_speed'] = np.abs(np.random.normal(4, 2, len(df)))
    
    # Напрямок вітру
    df['wind_direction'] = np.random.randint(0, 360, len(df))
    
    print(f"✅ Додано метео дані")
    
    return df

def fill_missing_values(df):
    """
    Заповнює пропущені значення
    """
    print("\n🔧 Обробка пропущених значень...")
    
    # Показати статистику по пропущених значеннях
    missing = df.isnull().sum()
    print("\nПропущені значення:")
    for col in missing[missing > 0].index:
        pct = (missing[col] / len(df)) * 100
        print(f"   {col}: {missing[col]} ({pct:.1f}%)")
    
    # Заповнюємо forward fill + backward fill
    df = df.fillna(method='ffill').fillna(method='bfill')
    
    # Якщо все ще є NaN - заповнюємо типовими значеннями
    defaults = {
        'pm25': 15, 'pm10': 25, 'no2': 30, 
        'so2': 10, 'co': 500, 'o3': 60,
        'temperature': 12, 'humidity': 70, 
        'pressure': 1013, 'wind_speed': 3, 'wind_direction': 180
    }
    
    for col, default_val in defaults.items():
        if col in df.columns:
            df[col].fillna(default_val, inplace=True)
    
    print(f"✅ Пропущені значення заповнено")
    
    return df

def save_dataset(df, filename='london_air_quality.csv'):
    """
    Зберігає датасет
    """
    print(f"\n💾 Збереження датасету: {filename}...")
    
    # Округлюємо значення
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    df[numeric_cols] = df[numeric_cols].round(1)
    
    # Зберігаємо
    df.to_csv(filename, index=False)
    
    print(f"✅ Збережено: {filename}")
    print(f"📊 Розмір: {len(df)} рядків, {len(df.columns)} колонок")
    print(f"💿 Розмір файлу: {os.path.getsize(filename) / 1024:.1f} KB")
    
    return filename

def main():
    """
    Головна функція
    """
    print("="*70)
    print("🇬🇧 ЗАВАНТАЖЕННЯ РЕАЛЬНИХ ДАНИХ ЯКОСТІ ПОВІТРЯ ДЛЯ ЛОНДОНУ")
    print("="*70)
    
    try:
        # 1. Завантажити дані
        measurements = fetch_openaq_data()
        
        if not measurements:
            print("\n❌ Не вдалося завантажити дані!")
            print("💡 Спробуємо альтернативний метод...")
            return create_fallback_dataset()
        
        # 2. Обробити
        df = process_measurements(measurements)
        
        # 3. Додати метео
        import numpy as np
        df = add_weather_data(df)
        
        # 4. Заповнити пропуски
        df = fill_missing_values(df)
        
        # 5. Зберегти
        import os
        filename = save_dataset(df)
        
        # 6. Показати статистику
        print("\n" + "="*70)
        print("📈 СТАТИСТИКА ДАТАСЕТУ")
        print("="*70)
        print(df.describe())
        
        print("\n" + "="*70)
        print("✅ ГОТОВО!")
        print("="*70)
        print(f"📁 Файл: {filename}")
        print(f"📊 Рядків: {len(df)}")
        print(f"📅 Період: {df['timestamp'].min()} - {df['timestamp'].max()}")
        
        return filename
        
    except Exception as e:
        print(f"\n❌ Критична помилка: {str(e)}")
        import traceback
        traceback.print_exc()
        
        print("\n💡 Створюємо резервний датасет...")
        return create_fallback_dataset()

def create_fallback_dataset():
    """
    Створює резервний датасет з реалістичними даними
    якщо API не працює
    """
    print("\n📦 Генерація резервного датасету з реалістичними даними...")
    
    import numpy as np
    
    # Генеруємо 1500 записів (2 місяці погодинно)
    start_date = datetime(2024, 9, 1, 0, 0, 0)
    timestamps = [start_date + timedelta(hours=i) for i in range(1500)]
    
    data = []
    for i, ts in enumerate(timestamps):
        hour = ts.hour
        day = i // 24
        weekday = ts.weekday()
        
        # Ефекти
        weekend_effect = 0.7 if weekday >= 5 else 1.0
        rush_hour = 1.4 if (7 <= hour <= 9 or 17 <= hour <= 19) else 1.0
        night_effect = 0.6 if (0 <= hour <= 5) else 1.0
        
        # Забруднювачі з реалістичними залежностями
        base_pollution = 1.0 + 0.2 * np.sin(day / 30)  # Місячний цикл
        
        pm25 = max(5, (15 + 10 * base_pollution + 5 * np.sin(hour / 24 * 2 * np.pi)) 
                   * weekend_effect * rush_hour * night_effect + np.random.normal(0, 3))
        
        pm10 = pm25 * (1.6 + np.random.normal(0, 0.1))
        
        no2 = max(10, (35 + 15 * base_pollution + 10 * np.sin(hour / 12 * np.pi)) 
                  * rush_hour * weekend_effect + np.random.normal(0, 5))
        
        so2 = max(5, 12 + 5 * base_pollution + np.random.normal(0, 2))
        
        co = max(200, (600 + 300 * base_pollution + 200 * np.sin(hour / 12 * np.pi)) 
                 * rush_hour * weekend_effect + np.random.normal(0, 50))
        
        # O3 обернено корелює з NO2 та залежить від сонячної радіації
        o3 = max(10, 70 - no2 * 0.3 + 30 * np.sin((hour - 12) / 12 * np.pi) 
                 + np.random.normal(0, 10))
        
        # Погода
        temp = 12 + 8 * np.sin((day / 60) * 2 * np.pi) + 6 * np.sin((hour - 6) / 12 * np.pi)
        humidity = max(40, min(90, 70 - temp * 1.5 + np.random.normal(0, 5)))
        pressure = 1013 + 10 * np.sin(day / 15) + np.random.normal(0, 3)
        wind_speed = max(0, 4 + 2 * np.sin(day / 7) + np.random.normal(0, 1.5))
        wind_direction = int((180 + 90 * np.sin(day / 10) + np.random.normal(0, 30)) % 360)
        
        data.append({
            'timestamp': ts.strftime('%Y-%m-%d %H:%M:%S'),
            'pm25': round(pm25, 1),
            'pm10': round(pm10, 1),
            'no2': round(no2, 1),
            'so2': round(so2, 1),
            'co': round(co, 1),
            'o3': round(o3, 1),
            'temperature': round(temp, 1),
            'humidity': round(humidity, 1),
            'pressure': round(pressure, 1),
            'wind_speed': round(wind_speed, 1),
            'wind_direction': wind_direction
        })
    
    df = pd.DataFrame(data)
    filename = 'london_air_quality_realistic.csv'
    df.to_csv(filename, index=False)
    
    print(f"✅ Створено резервний датасет: {filename}")
    print(f"📊 {len(df)} рядків з реалістичними залежностями")
    
    return filename

if __name__ == '__main__':
    main()