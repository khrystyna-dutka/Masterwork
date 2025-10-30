# ml-service/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask
    FLASK_PORT = int(os.getenv('FLASK_PORT', 5001))
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'True') == 'True'
    
    # PostgreSQL (з твого backend/.env)
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 5432))
    DB_NAME = os.getenv('DB_NAME', 'ecolv_db')
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'your_password')
    
    # ML параметри
    MODEL_PATH = './trained_models/'
    HISTORY_HOURS = 48  # Скільки годин історії для прогнозу
    
    # Параметри які прогнозуємо
    TARGET_FEATURES = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']
    
    # Додаткові features (погода)
    WEATHER_FEATURES = ['temperature', 'humidity', 'pressure', 'wind_speed']
    
    # Часові features
    TIME_FEATURES = ['hour', 'day_of_week', 'is_weekend']
    
    # Райони
    DISTRICTS = [
        {'id': 1, 'name': 'Галицький'},
        {'id': 2, 'name': 'Франківський'},
        {'id': 3, 'name': 'Залізничний'},
        {'id': 4, 'name': 'Шевченківський'},
        {'id': 5, 'name': 'Личаківський'},
        {'id': 6, 'name': 'Сихівський'}
    ]