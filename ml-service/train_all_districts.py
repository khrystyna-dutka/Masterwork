# ml-service/train_all_districts.py
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
        "days": 365,    # Всі доступні дані
        "epochs": 20    # 20 епох (для малого датасету)
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
                    print(f"   📊 Записів: {data.get('training_records', 'N/A')}")
                    
                    epochs = data.get('epochs_trained') or data.get('epochs')
                    print(f"   🔄 Епох: {epochs if epochs else 'N/A'}")
                    
                    # Безпечне форматування метрик
                    metrics = data.get('metrics', {})
                    
                    if isinstance(metrics, dict):
                        # Avg MAE
                        avg_mae = metrics.get('avg_mae')
                        if avg_mae and isinstance(avg_mae, (int, float)):
                            print(f"   📈 Avg MAE: {avg_mae:.4f}")
                        
                        # PM2.5 MAE
                        pm25_mae = metrics.get('pm25_mae')
                        if pm25_mae and isinstance(pm25_mae, (int, float)):
                            print(f"   💨 PM2.5 MAE: {pm25_mae:.4f}")
                    
                    results.append({
                        'district_id': district_id,
                        'district_name': district_name,
                        'status': 'success',
                        'metrics': metrics,
                        'records': data.get('training_records', 0)
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
                error_data = response.json() if response.text else {}
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
            import traceback
            traceback.print_exc()
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
            print(f"     Записів: {r.get('records', 'N/A')}")
            
            if r.get('metrics') and isinstance(r['metrics'], dict):
                avg_mae = r['metrics'].get('avg_mae')
                if avg_mae and isinstance(avg_mae, (int, float)):
                    print(f"     Avg MAE: {avg_mae:.4f}")
    
    if errors:
        print("\n⚠️ Райони з помилками:")
        for e in errors:
            print(f"   • {e['district_name']} (ID: {e['district_id']}): {e['error']}")
    
    print("\n" + "=" * 60)
    
    if len(results) > 0:
        print("✅ Моделі збережено в: ml-service/trained_models/")
        print("\n💡 Наступні кроки:")
        print("   1. Моделі готові для прогнозування")
        print("   2. Можеш тестувати через API: GET /api/forecast/<district_id>")
        print("   3. Для онлайн-навчання треба додати feedback систему")
    
    print("=" * 60)

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