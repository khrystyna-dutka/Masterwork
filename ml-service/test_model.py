# ml-service/test_model.py
from utils.db_helper import DatabaseHelper
from data.preprocessor import DataPreprocessor
from models.lstm_model import LSTMForecastModel
from config import Config
import numpy as np
from sklearn.model_selection import train_test_split

def test_model_training():
    """Тестування створення та тренування моделі"""
    
    print("=" * 60)
    print("🧪 ТЕСТУВАННЯ LSTM МОДЕЛІ")
    print("=" * 60)
    
    # Вибрати район для тесту
    district_id = 1
    
    print(f"\n📌 Район: {Config.DISTRICTS[district_id-1]['name']} (ID: {district_id})")
    
    # Крок 1: Отримати дані
    print("\n1️⃣ Отримання даних з БД...")
    db = DatabaseHelper()
    df = db.get_historical_data(district_id, days=365)
    
    if len(df) < Config.SEQUENCE_LENGTH + 1:
        print(f"\n⚠️ НЕДОСТАТНЬО ДАНИХ!")
        print(f"   Потрібно мінімум: {Config.SEQUENCE_LENGTH + 1} записів")
        print(f"   Є зараз: {len(df)} записів")
        return
    
    print(f"✅ Отримано {len(df)} записів")
    
    if len(df) < 500:
        print(f"\n⚠️ УВАГА: Даних мало для якісного навчання!")
        print(f"   Модель буде навчена для демонстрації...\n")
    
    # Крок 2: Підготувати дані
    print("\n2️⃣ Підготовка даних...")
    preprocessor = DataPreprocessor(district_id)
    prepared_data = preprocessor.prepare_data(df)
    
    # Крок 3: Нормалізація
    print("\n3️⃣ Нормалізація даних...")
    normalized_data = preprocessor.normalize_data(prepared_data.values, fit=True)
    
    # Крок 4: Створення послідовностей
    print("\n4️⃣ Створення послідовностей для LSTM...")
    X, y = preprocessor.create_sequences(normalized_data, Config.SEQUENCE_LENGTH)
    
    # Крок 5: Розділення на train/val
    print("\n5️⃣ Розділення на train/val...")
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, shuffle=False
    )
    
    print(f"   Train: {len(X_train)} зразків")
    print(f"   Val: {len(X_val)} зразків")
    
    # Крок 6: Створення моделі
    print("\n6️⃣ Створення LSTM моделі...")
    model = LSTMForecastModel(district_id)
    model.build_model(input_shape=(X_train.shape[1], X_train.shape[2]))
    
    # Крок 7: Тренування
    print("\n7️⃣ Тренування моделі...")
    print("   ⏳ Це може зайняти 1-3 хвилини...")
    
    y_train_dict = {
        'pm25': y_train[:, 0],
        'pm10': y_train[:, 1],
        'no2': y_train[:, 2],
        'so2': y_train[:, 3],
        'co': y_train[:, 4],
        'o3': y_train[:, 5]
    }
    
    y_val_dict = {
        'pm25': y_val[:, 0],
        'pm10': y_val[:, 1],
        'no2': y_val[:, 2],
        'so2': y_val[:, 3],
        'co': y_val[:, 4],
        'o3': y_val[:, 5]
    }
    
    history = model.train(
        X_train, y_train_dict,
        X_val, y_val_dict,
        epochs=20,
        batch_size=8
    )
    
    # Крок 8: Тестовий прогноз
    print("\n8️⃣ Тестовий прогноз...")
    test_sequence = X_val[0]
    predictions = model.model.predict(test_sequence.reshape(1, *test_sequence.shape), verbose=0)
    
    # predictions[0] = pm25, predictions[1] = pm10, і т.д.
    # Візьмемо PM2.5 та денормалізуємо
    pm25_pred_norm = predictions[0][0][0]
    pm25_actual_norm = y_val[0][0]
    
    # Простий спосіб денормалізації - створити фейковий вектор
    fake_vector_pred = np.zeros((1, 8))
    fake_vector_pred[0, 0] = pm25_pred_norm  # PM2.5
    fake_vector_pred[0, 1:] = 0.5  # Інші - середні значення
    
    fake_vector_actual = np.zeros((1, 8))
    fake_vector_actual[0, 0] = pm25_actual_norm
    fake_vector_actual[0, 1:] = 0.5
    
    # Денормалізація
    pm25_pred_real = preprocessor.inverse_transform(fake_vector_pred)[0, 0]
    pm25_actual_real = preprocessor.inverse_transform(fake_vector_actual)[0, 0]
    
    print(f"\n   🔮 Прогноз PM2.5: {pm25_pred_real:.2f} μg/m³")
    print(f"   ✅ Фактичний PM2.5: {pm25_actual_real:.2f} μg/m³")
    print(f"   📊 Різниця: {abs(pm25_pred_real - pm25_actual_real):.2f} μg/m³")
    
    # Крок 9: Прогноз на 24 години
    print("\n9️⃣ Прогноз на 24 години вперед...")
    try:
        future_predictions = model.predict_future(X_val[-1], n_hours=24)
        print(f"   ✅ Створено прогноз на {len(future_predictions)} годин")
        print(f"   📊 Середнє PM2.5: {future_predictions['pm25'].mean():.2f} μg/m³")
    except Exception as e:
        print(f"   ⚠️ Помилка прогнозу: {e}")
    
    # Інформація про модель
    print("\n" + "=" * 60)
    print("✅ ТЕСТУВАННЯ ЗАВЕРШЕНО!")
    print("=" * 60)
    print(f"\n📋 Модель збережено: {model.model_path}")
    print(f"📋 Scaler збережено: {preprocessor.scaler_path}")
    print("\n⚠️ ВАЖЛИВО:")
    print("   Модель навчена на малому датасеті (121 запис)")
    print("   Для кращої точності накопичуй більше даних (500+ записів)")
    print("=" * 60)

if __name__ == "__main__":
    test_model_training()