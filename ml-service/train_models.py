# ml-service/train_models.py
import requests
import json

print("🎯 Початок тренування моделей...")

url = "http://localhost:5001/api/train/all"
data = {
    "days": 30,
    "epochs": 30
}

try:
    response = requests.post(url, json=data)
    result = response.json()
    
    print("\n✅ Результат:")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
except Exception as e:
    print(f"❌ Помилка: {e}")