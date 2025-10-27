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
    df = db.get_historical_data(district_id, days=7)
    
    if len(df) < Config.SEQUENCE_LENGTH + 1:
        print(f"⚠️ Недостатньо даних для тренування!")
        print(f"   Потрібно мінімум: {Config.SEQUENCE_LENGTH + 1} записів")
        print(f"   Є зараз: {len(df)} записів")
        print(f"\n💡 Підказка: Дочекайся коли накопичиться більше даних (2-3 дні)")
        print(f"   Або запусти скрипт генерації тестових даних")
        return
    
    # Крок 2: Підготувати дані
    print("\n2️⃣ Підготовка даних...")
    preprocessor = DataPreprocessor(district_id)
    prepared_data = preprocessor.prepare_data(df)
    
    if prepared_data is None or prepared_data.empty:
        print("❌ Помилка підготовки даних")
        return
    
    # Крок 3: Нормалізація
    print("\n3️⃣ Нормалізація даних...")
    normalized_data = preprocessor.normalize_data(prepared_data.values, fit=True)
    
    # Крок 4: Створення послідовностей
    print("\n4️⃣ Створення послідовностей для LSTM...")
    X, y = preprocessor.create_sequences(normalized_data, Config.SEQUENCE_LENGTH)
    
    if len(X) == 0:
        print("❌ Не вдалось створити послідовності")
        return
    
    # Крок 5: Розділення на train/val
    print("\n5️⃣ Розділення на тренувальний та валідаційний набори...")
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, shuffle=False  # shuffle=False для часових рядів
    )
    
    print(f"   Train: {len(X_train)} зразків")
    print(f"   Val: {len(X_val)} зразків")
    
    # Крок 6: Створення та тренування моделі
    print("\n6️⃣ Створення LSTM моделі...")
    model = LSTMForecastModel(district_id)
    model.build_model(input_shape=(X_train.shape[1], X_train.shape[2]))
    
    print("\n7️⃣ Тренування моделі...")
    print("   ⏳ Це може зайняти 1-3 хвилини...")
    
    history = model.train(
        X_train, y_train,
        X_val, y_val,
        epochs=30,  # Для тесту - менше епох
        batch_size=16
    )
    
    # Крок 7: Тестовий прогноз
    print("\n8️⃣ Тестовий прогноз...")
    test_sequence = X_val[0]
    prediction = model.predict(test_sequence.reshape(1, *test_sequence.shape))
    
    # Повернути до оригінального масштабу
    predicted_pm25 = preprocessor.inverse_transform_predictions(prediction)[0]
    actual_pm25 = preprocessor.inverse_transform_predictions(np.array([y_val[0]]))[0]
    
    print(f"\n   🔮 Прогноз PM2.5: {predicted_pm25:.2f} μg/m³")
    print(f"   ✅ Фактичний PM2.5: {actual_pm25:.2f} μg/m³")
    print(f"   📊 Різниця: {abs(predicted_pm25 - actual_pm25):.2f} μg/m³")
    
    # Крок 8: Прогноз на 24 години
    print("\n9️⃣ Прогноз на 24 години вперед...")
    future_predictions = model.predict_future(X_val[-1], n_hours=24)
    future_pm25 = preprocessor.inverse_transform_predictions(future_predictions)
    
    print(f"   ✅ Створено прогноз на {len(future_pm25)} годин")
    print(f"   📊 Середнє передбачене PM2.5: {np.mean(future_pm25):.2f} μg/m³")
    print(f"   📊 Min: {np.min(future_pm25):.2f}, Max: {np.max(future_pm25):.2f}")
    
    # Інформація про модель
    print("\n" + "=" * 60)
    model_info = model.get_model_info()
    print("📋 Інформація про модель:")
    for key, value in model_info.items():
        print(f"   {key}: {value}")
    
    print("\n" + "=" * 60)
    print("✅ ТЕСТУВАННЯ ЗАВЕРШЕНО УСПІШНО!")
    print("=" * 60)

if __name__ == "__main__":
    test_model_training()