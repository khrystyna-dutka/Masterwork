# ml-service/train_model.py
import sys
import os

# Додати поточну директорію до шляху
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data.preprocessor import DataPreprocessor
from models.air_quality_model import AirQualityModel
from utils.db_helper import DatabaseHelper
from config import Config
from sklearn.model_selection import train_test_split

def train_district_model(district_id):
    """
    Навчити модель для одного району
    """
    db = DatabaseHelper()
    
    print("\n" + "="*70)
    print(f"🎯 НАВЧАННЯ МОДЕЛІ: {Config.DISTRICTS[district_id-1]['name']} (ID: {district_id})")
    print("="*70)
    
    # 1. Завантажити дані
    print("\n1️⃣ Завантаження даних з БД...")
    df = db.get_training_data(district_id, days=30)
    
    if len(df) < 50:
        print(f"❌ Недостатньо даних для навчання: {len(df)} записів")
        print("   Мінімум потрібно 50 записів")
        return False
    
    print(f"✅ Завантажено {len(df)} записів")
    
    # 2. Підготувати features
    print("\n2️⃣ Підготовка features...")
    preprocessor = DataPreprocessor(district_id)
    
    try:
        X, y, df_processed = preprocessor.prepare_training_data(df)
    except Exception as e:
        print(f"❌ Помилка підготовки features: {e}")
        return False
    
    if len(X) < 20:
        print(f"❌ Недостатньо даних після обробки: {len(X)} зразків")
        print("   Після додавання lag та rolling features залишилося мало даних")
        return False
    
    # 3. Розділити на train/val
    print("\n3️⃣ Розділення train/val (80/20)...")
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, 
        test_size=0.2, 
        random_state=42,
        shuffle=False  # Не перемішуємо часові ряди
    )
    
    print(f"   Train: {len(X_train)} зразків")
    print(f"   Val: {len(X_val)} зразків")
    
    # 4. Навчити модель
    print("\n4️⃣ Навчання моделі...")
    model = AirQualityModel(district_id, model_type='xgboost')
    
    try:
        train_score, val_score = model.train(X_train, y_train, X_val, y_val)
    except Exception as e:
        print(f"❌ Помилка навчання: {e}")
        return False
    
    # 5. Детальна оцінка
    print("\n5️⃣ Оцінка точності на валідації...")
    
    try:
        metrics = model.evaluate(X_val, y_val)
        
        print("\n📊 Метрики по параметрах:")
        for param, values in metrics.items():
            print(f"   {param.upper()}: MAE={values['mae']:.3f}, RMSE={values['rmse']:.3f}, R²={values['r2']:.4f}")
    
    except Exception as e:
        print(f"⚠️ Не вдалося обчислити детальні метрики: {e}")
    
    print("\n" + "="*70)
    print(f"✅ НАВЧАННЯ ЗАВЕРШЕНО: {Config.DISTRICTS[district_id-1]['name']}")
    print("="*70)
    
    return True

def train_all_districts():
    """
    Навчити моделі для всіх районів
    """
    print("\n" + "="*70)
    print("🚀 НАВЧАННЯ МОДЕЛЕЙ ДЛЯ ВСІХ РАЙОНІВ")
    print("="*70)
    
    results = []
    
    for district in Config.DISTRICTS:
        success = train_district_model(district['id'])
        results.append({
            'id': district['id'],
            'name': district['name'],
            'success': success
        })
    
    # Підсумок
    print("\n" + "="*70)
    print("📊 ПІДСУМОК НАВЧАННЯ")
    print("="*70)
    
    successful = sum(1 for r in results if r['success'])
    
    for result in results:
        status = "✅" if result['success'] else "❌"
        print(f"{status} Район {result['id']}: {result['name']}")
    
    print(f"\n✅ Успішно навчено: {successful}/{len(results)}")

if __name__ == "__main__":
    train_all_districts()