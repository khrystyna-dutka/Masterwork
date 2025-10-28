# ml-service/scripts/generate_forecasts_all.py
"""
Згенерувати прогнози для всіх районів
"""
import sys
import os

# Додати шлях до модулів
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from config import Config

def generate_forecasts():
    print("=" * 70)
    print("🔮 ГЕНЕРАЦІЯ ПРОГНОЗІВ ДЛЯ ВСІХ РАЙОНІВ")
    print("=" * 70)
    
    base_url = f"http://localhost:{Config.FLASK_PORT}"
    
    # Перевірка чи запущений ML Service
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code != 200:
            print("❌ ML Service не відповідає!")
            print("💡 Запусти: python app.py")
            return
    except:
        print("❌ ML Service не запущений!")
        print("💡 Запусти в іншому терміналі: python app.py")
        return
    
    print("✅ ML Service запущений\n")
    
    for district in Config.DISTRICTS:
        district_id = district['id']
        district_name = district['name']
        
        print(f"📍 {district_name} (ID: {district_id})")
        
        try:
            response = requests.get(
                f"{base_url}/api/forecast/{district_id}?hours=24&save=true",
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    forecasts_count = len(data.get('forecasts', []))
                    print(f"   ✅ Створено {forecasts_count} прогнозів на 24 години")
                else:
                    print(f"   ❌ {data.get('error')}")
            else:
                print(f"   ❌ HTTP {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Помилка: {e}")
    
    print("\n" + "=" * 70)
    print("✅ Готово! Тепер запусти: python scripts/collect_feedback.py")
    print("=" * 70)

if __name__ == "__main__":
    generate_forecasts()