import requests
import json
from config import Config

def train_all_districts():
    """Тренувати моделі для всіх районів"""
    
    print("=" * 60)
    print("🎯 ТРЕНУВАННЯ МОДЕЛЕЙ ДЛЯ ВСІХ РАЙОНІВ ЛЬВОВА")
    print("=" * 60)
    
    base_url = f"http://localhost:{Config.FLASK_PORT}"
    
    # Параметри тренування
    training_params = {
        "days": 7,      # Використовуємо всі доступні дані (7 днів)
        "epochs": 30    # 30 епох для швидкого тренування
    }
    
    results = []
    errors = []
    
    for district in Config.DISTRICTS:
        district_id = district['id']
        district_name = district['name']
        
        print(f"\n{'='*60}")
        print(f"🏘️ Район {district_id}: {district_name}")
        print(f"{'='*60}")
        
        try:
            # Відправити POST запит для тренування
            response = requests.post(
                f"{base_url}/api/train/{district_id}",
                json=training_params,
                timeout=300  # 5 хвилин timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success'):
                    print(f"✅ Тренування успішне!")
                    print(f"   📊 Записів: {data.get('training_records')}")
                    print(f"   🔄 Епох: {data.get('epochs_trained')}")
                    print(f"   📉 Loss: {data.get('metrics', {}).get('loss', 'N/A'):.4f}")
                    print(f"   📈 MAE: {data.get('metrics', {}).get('mae', 'N/A'):.4f}")
                    
                    results.append({
                        'district_id': district_id,
                        'district_name': district_name,
                        'status': 'success',
                        'metrics': data.get('metrics')
                    })
                else:
                    error_msg = data.get('error', 'Unknown error')
                    print(f"❌ Помилка: {error_msg}")
                    errors.append({
                        'district_id': district_id,
                        'district_name': district_name,
                        'error': error_msg
                    })
            else:
                error_data = response.json()
                error_msg = error_data.get('error', f'HTTP {response.status_code}')
                print(f"❌ Помилка: {error_msg}")
                errors.append({
                    'district_id': district_id,
                    'district_name': district_name,
                    'error': error_msg
                })
                
        except requests.exceptions.Timeout:
            print(f"⏱️ Timeout - тренування занадто довге")
            errors.append({
                'district_id': district_id,
                'district_name': district_name,
                'error': 'Timeout'
            })
        except Exception as e:
            print(f"❌ Помилка: {str(e)}")
            errors.append({
                'district_id': district_id,
                'district_name': district_name,
                'error': str(e)
            })
    
    # Підсумок
    print("\n" + "=" * 60)
    print("📊 ПІДСУМОК ТРЕНУВАННЯ")
    print("=" * 60)
    print(f"✅ Успішно: {len(results)} / {len(Config.DISTRICTS)}")
    print(f"❌ Помилки: {len(errors)} / {len(Config.DISTRICTS)}")
    
    if results:
        print("\n🎉 Успішно натреновані райони:")
        for r in results:
            print(f"   • {r['district_name']} (ID: {r['district_id']})")
            if r.get('metrics'):
                print(f"     Loss: {r['metrics'].get('loss', 'N/A'):.4f}, MAE: {r['metrics'].get('mae', 'N/A'):.4f}")
    
    if errors:
        print("\n⚠️ Райони з помилками:")
        for e in errors:
            print(f"   • {e['district_name']} (ID: {e['district_id']}): {e['error']}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    # Перевірка чи запущений ML сервіс
    try:
        response = requests.get(f"http://localhost:{Config.FLASK_PORT}/health", timeout=5)
        if response.status_code == 200:
            print("✅ ML Service запущений\n")
            train_all_districts()
        else:
            print("❌ ML Service не відповідає")
    except:
        print("❌ ML Service не запущений!")
        print("💡 Запусти спочатку: python app.py")