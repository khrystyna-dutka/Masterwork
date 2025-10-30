# ml-service/scheduler.py
import schedule
import time
import requests
from datetime import datetime

def check_and_retrain_all():
    """Перевірити всі моделі та перенавчити якщо потрібно"""
    print(f"\n{'='*70}")
    print(f"⏰ AUTO-CHECK: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*70}")
    
    try:
        response = requests.post('http://localhost:5001/api/monitor/all')
        data = response.json()
        
        if data.get('success'):
            for result in data.get('results', []):
                district_id = result.get('district_id')
                retrained = result.get('retrained')
                
                if retrained:
                    print(f"🔄 Район {district_id}: Модель перенавчена (виявлено drift)")
                else:
                    print(f"✅ Район {district_id}: Модель працює нормально")
        
    except Exception as e:
        print(f"❌ Помилка: {e}")
    
    print(f"{'='*70}\n")

# ⬇️ ЗМІНИЛИ: Кожну годину замість 6 годин!
schedule.every(1).hour.do(check_and_retrain_all)

# ⬇️ ДОДАЛИ: Перша перевірка одразу при запуску
check_and_retrain_all()

print("🤖 Real-time Model Monitor запущено!")
print("🔄 Перевірка моделей КОЖНУ ГОДИНУ")
print("🎯 Автоматичне перенавчання при виявленні drift")
print("⏰ Наступна перевірка через 1 годину...\n")

while True:
    schedule.run_pending()
    time.sleep(60)  # Перевірка кожну хвилину