import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask
    FLASK_PORT = int(os.getenv('FLASK_PORT', 5001))
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'True') == 'True'
    
    # PostgreSQL
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 5432))
    DB_NAME = os.getenv('DB_NAME', 'ecolv_db')
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    
    # ML Config
    MODEL_PATH = os.getenv('MODEL_PATH', './trained_models/')
    SEQUENCE_LENGTH = int(os.getenv('SEQUENCE_LENGTH', 24))  # Останні 24 години для прогнозу
    FORECAST_HOURS = int(os.getenv('FORECAST_HOURS', 24))    # Прогноз на 24 години
    RETRAIN_INTERVAL_HOURS = int(os.getenv('RETRAIN_INTERVAL_HOURS', 24))
    
    # Districts
    DISTRICTS = [
        {'id': 1, 'name': 'Галицький'},
        {'id': 2, 'name': 'Залізничний'},
        {'id': 3, 'name': 'Личаківський'},
        {'id': 4, 'name': 'Сихівський'},
        {'id': 5, 'name': 'Франківський'},
        {'id': 6, 'name': 'Шевченківський'}
    ]
    
    @staticmethod
    def get_db_connection_string():
        return f"postgresql://{Config.DB_USER}:{Config.DB_PASSWORD}@{Config.DB_HOST}:{Config.DB_PORT}/{Config.DB_NAME}"