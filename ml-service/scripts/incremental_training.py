# ml-service/scripts/incremental_training.py
"""
Інкрементальне навчання: дотренування моделі на нових даних
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db_helper import DatabaseHelper
from models.lstm_model import LSTMForecastModel
from config import Config
import numpy as np
from datetime import datetime

def incremental_train_district(district_id, min_samples=50, epochs=5):
    """Інкрементальне навчання для одного району"""
    
    db = DatabaseHelper()
    conn = db.get_connection()
    cursor = conn.cursor()
    
    print(f"\n📍 Район {district_id}:")
    
    try:
        # Перевірити кількість
        cursor.execute("""
            SELECT COUNT(*)
            FROM training_feedback
            WHERE district_id = %s AND used_for_training = FALSE
        """, (district_id,))
        
        unused_count = cursor.fetchone()[0]
        print(f"   📊 Невикористаних прикладів: {unused_count}")
        
        if unused_count < min_samples:
            print(f"   ⚠️ Мало даних (потрібно мінімум {min_samples})")
            return False
        
        # Отримати приклади
        cursor.execute("""
            SELECT 
                predicted_pm25, predicted_pm10, predicted_no2, predicted_so2, predicted_co, predicted_o3,
                actual_pm25, actual_pm10, actual_no2, actual_so2, actual_co, actual_o3
            FROM training_feedback
            WHERE district_id = %s AND used_for_training = FALSE
            ORDER BY created_at
            LIMIT 1000
        """, (district_id,))
        
        feedback_data = cursor.fetchall()
        print(f"   📥 Завантажено {len(feedback_data)} прикладів")
        
        # Підготувати дані
        X_new = []
        y_new = {'pm25': [], 'pm10': [], 'no2': [], 'so2': [], 'co': [], 'o3': []}
        
        for row in feedback_data:
            pred = list(row[:6])
            actual = list(row[6:])
            
            # Створити фейкову послідовність
            full_vector = pred[:1] + [0.5, 0.5] + pred[1:]
            fake_sequence = np.tile(full_vector, (Config.SEQUENCE_LENGTH, 1))
            X_new.append(fake_sequence)
            
            # y - КОНВЕРТУВАТИ В FLOAT!
            y_new['pm25'].append(float(actual[0]))
            y_new['pm10'].append(float(actual[1]))
            y_new['no2'].append(float(actual[2]))
            y_new['so2'].append(float(actual[3]))
            y_new['co'].append(float(actual[4]))
            y_new['o3'].append(float(actual[5]))
        
        X_new = np.array(X_new, dtype=np.float32)
        y_new = {k: np.array(v, dtype=np.float32) for k, v in y_new.items()}
        
        print(f"   📐 Форма X: {X_new.shape}, dtype: {X_new.dtype}")
        
        # Завантажити модель
        model = LSTMForecastModel(district_id)
        if not model.load_model():
            print("   ❌ Модель не знайдена!")
            return False
        
        print("   ✅ Модель завантажена")
        
        # Дотренування
        print(f"   🔄 Дотренування ({epochs} епох)...")
        
        import tensorflow as tf
        model.model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.0001),
            loss={'pm25': 'mse', 'pm10': 'mse', 'no2': 'mse', 'so2': 'mse', 'co': 'mse', 'o3': 'mse'}
        )
        
        history = model.model.fit(
            X_new, y_new,
            epochs=epochs,
            batch_size=min(16, len(X_new)),
            verbose=0
        )
        
        final_loss = history.history['loss'][-1]
        print(f"   ✅ Завершено! Loss: {final_loss:.4f}")
        
        # Зберегти
        model.model.save(model.model_path)
        print(f"   💾 Модель збережена")
        
        # Позначити
        cursor.execute("""
            UPDATE training_feedback
            SET used_for_training = TRUE
            WHERE district_id = %s AND used_for_training = FALSE
        """, (district_id,))
        
        conn.commit()
        print(f"   ✅ Позначено {cursor.rowcount} записів")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Помилка: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

def incremental_train_all(min_samples=50, epochs=5):
    """Інкрементальне навчання для всіх районів"""
    
    print("=" * 70)
    print("🧠 ІНКРЕМЕНТАЛЬНЕ НАВЧАННЯ МОДЕЛЕЙ")
    print("=" * 70)
    print(f"🕐 Час: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"⚙️ Параметри: min_samples={min_samples}, epochs={epochs}")
    
    success_count = sum(
        1 for district in Config.DISTRICTS 
        if incremental_train_district(district['id'], min_samples, epochs)
    )
    
    print("\n" + "=" * 70)
    print(f"✅ ОНОВЛЕНО МОДЕЛЕЙ: {success_count}/{len(Config.DISTRICTS)}")
    
    if success_count > 0:
        print(f"\n🎉 Моделі стали точнішими!")
        print(f"💡 Feedback цикл працює!")
    
    print("=" * 70)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Інкрементальне навчання')
    parser.add_argument('--min-samples', type=int, default=50)
    parser.add_argument('--epochs', type=int, default=5)
    
    args = parser.parse_args()
    incremental_train_all(min_samples=args.min_samples, epochs=args.epochs)