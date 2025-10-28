# ml-service/scripts/clean_and_retrain.py
"""
Очистити старі дані та перенавчити моделі правильно
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db_helper import DatabaseHelper
from data.preprocessor import DataPreprocessor
from models.lstm_model import LSTMForecastModel
from config import Config
from sklearn.model_selection import train_test_split
import shutil

def clean_old_data():
    """Очистити старі feedback та моделі"""
    
    print("=" * 70)
    print("🧹 ОЧИЩЕННЯ СТАРИХ ДАНИХ")
    print("=" * 70)
    
    # 1. Очистити feedback
    db = DatabaseHelper()
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM training_feedback")
    old_count = cursor.fetchone()[0]
    
    print(f"\n📊 Старих feedback: {old_count}")
    
    if old_count > 0:
        cursor.execute("DELETE FROM training_feedback")
        conn.commit()
        print(f"✅ Видалено {old_count} старих feedback")
    
    cursor.close()
    conn.close()
    
    # 2. Видалити старі моделі
    models_path = Config.MODEL_PATH
    if os.path.exists(models_path):
        print(f"\n📁 Очищення папки моделей: {models_path}")
        for file in os.listdir(models_path):
            file_path = os.path.join(models_path, file)
            try:
                if os.path.isfile(file_path):
                    os.unlink(file_path)
                    print(f"   🗑️  Видалено: {file}")
            except Exception as e:
                print(f"   ⚠️  Помилка видалення {file}: {e}")
    
    print("\n✅ Очищення завершено!")
    print("=" * 70)

def train_all_districts_properly():
    """Навчити всі райони правильно"""
    
    print("\n" + "=" * 70)
    print("🎓 НАВЧАННЯ МОДЕЛЕЙ ДЛЯ ВСІХ РАЙОНІВ")
    print("=" * 70)
    
    db = DatabaseHelper()
    results = []
    
    for district in Config.DISTRICTS:
        district_id = district['id']
        district_name = district['name']
        
        print(f"\n{'=' * 70}")
        print(f"📍 РАЙОН {district_id}: {district_name}")
        print(f"{'=' * 70}")
        
        try:
            # 1. Отримати дані
            print("\n1️⃣ Отримання даних з БД...")
            df = db.get_historical_data(district_id, days=365)
            
            if len(df) < Config.SEQUENCE_LENGTH + 50:
                print(f"❌ Недостатньо даних: {len(df)} записів (потрібно мінімум {Config.SEQUENCE_LENGTH + 50})")
                results.append({
                    'district_id': district_id,
                    'name': district_name,
                    'status': 'insufficient_data',
                    'records': len(df)
                })
                continue
            
            print(f"✅ Отримано {len(df)} записів")
            
            # 2. Підготувати дані
            print("\n2️⃣ Підготовка даних...")
            preprocessor = DataPreprocessor(district_id)
            prepared_data = preprocessor.prepare_data(df)
            
            # 3. Нормалізація
            print("\n3️⃣ Нормалізація...")
            normalized_data = preprocessor.normalize_data(prepared_data.values, fit=True)
            
            # 4. Створення послідовностей (multi-output)
            print("\n4️⃣ Створення послідовностей...")
            X, y_dict = preprocessor.create_multi_output_sequences(
                normalized_data, 
                Config.SEQUENCE_LENGTH
            )
            
            if len(X) == 0:
                print("❌ Не вдалось створити послідовності")
                results.append({
                    'district_id': district_id,
                    'name': district_name,
                    'status': 'no_sequences'
                })
                continue
            
            # 5. Розділення на train/val
            print("\n5️⃣ Розділення train/val (80/20)...")
            split_idx = int(len(X) * 0.8)
            X_train, X_val = X[:split_idx], X[split_idx:]
            
            y_train_dict = {k: v[:split_idx] for k, v in y_dict.items()}
            y_val_dict = {k: v[split_idx:] for k, v in y_dict.items()}
            
            print(f"   Train: {len(X_train)} зразків")
            print(f"   Val: {len(X_val)} зразків")
            
            # 6. Створення моделі
            print("\n6️⃣ Створення Multi-Output LSTM моделі...")
            model = LSTMForecastModel(district_id)
            model.build_model(input_shape=(X_train.shape[1], X_train.shape[2]))
            
            # 7. Визначити epochs залежно від кількості даних
            if len(X_train) < 100:
                epochs = 20
            elif len(X_train) < 300:
                epochs = 30
            else:
                epochs = 50
            
            print(f"\n7️⃣ Тренування ({epochs} епох)...")
            print("   ⏳ Це може зайняти 2-5 хвилин...")
            
            history = model.train(
                X_train, y_train_dict,
                X_val, y_val_dict,
                epochs=epochs,
                batch_size=16 if len(X_train) > 100 else 8
            )
            
            # 8. Оцінка
            print("\n8️⃣ Оцінка моделі...")
            metrics = model.evaluate(X_val, y_val_dict)
            
            final_loss = history.history['loss'][-1]
            
            print(f"\n✅ Навчання завершено!")
            print(f"   📉 Final Loss: {final_loss:.4f}")
            print(f"   📊 Avg MAE: {metrics.get('avg_mae', 0):.4f}")
            print(f"   💾 Модель збережена: {model.model_path}")
            print(f"   💾 Scaler збережений: {preprocessor.scaler_path}")
            
            results.append({
                'district_id': district_id,
                'name': district_name,
                'status': 'success',
                'records': len(df),
                'sequences': len(X_train),
                'epochs': epochs,
                'final_loss': final_loss,
                'avg_mae': metrics.get('avg_mae', 0)
            })
            
        except Exception as e:
            print(f"\n❌ Помилка: {e}")
            import traceback
            traceback.print_exc()
            results.append({
                'district_id': district_id,
                'name': district_name,
                'status': 'error',
                'error': str(e)
            })
    
    # Підсумок
    print("\n" + "=" * 70)
    print("📊 ПІДСУМОК НАВЧАННЯ")
    print("=" * 70)
    
    for result in results:
        status_icon = {
            'success': '✅',
            'insufficient_data': '⚠️',
            'no_sequences': '❌',
            'error': '❌'
        }.get(result['status'], '❓')
        
        print(f"\n{status_icon} Район {result['district_id']}: {result['name']}")
        print(f"   Статус: {result['status']}")
        
        if result['status'] == 'success':
            print(f"   📊 Записів: {result['records']}")
            print(f"   🔄 Послідовностей: {result['sequences']}")
            print(f"   📈 Епох: {result['epochs']}")
            print(f"   📉 Loss: {result['final_loss']:.4f}")
            print(f"   🎯 MAE: {result['avg_mae']:.4f}")
        elif result['status'] == 'insufficient_data':
            print(f"   📊 Записів: {result['records']} (замало)")
        elif 'error' in result:
            print(f"   ❌ Помилка: {result['error']}")
    
    success_count = sum(1 for r in results if r['status'] == 'success')
    
    print("\n" + "=" * 70)
    print(f"✅ Успішно навчено: {success_count}/6 районів")
    print("=" * 70)
    
    return success_count > 0

if __name__ == "__main__":
    print("🚀 ПОВНЕ ПЕРЕНАВЧАННЯ МОДЕЛЕЙ\n")
    
    # Крок 1: Очистити
    clean_old_data()
    
    # Крок 2: Навчити заново
    success = train_all_districts_properly()
    
    if success:
        print("\n💡 НАСТУПНІ КРОКИ:")
        print("   1. Створи прогнози: python scripts/generate_forecasts_all.py")
        print("   2. Зібери feedback: python scripts/collect_feedback.py")
        print("   3. Запусти автонавчання: python scripts/auto_learning_scheduler.py")
        print("\n🎯 Відкрий dashboard: http://localhost:5001/dashboard")