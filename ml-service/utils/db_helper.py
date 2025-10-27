import psycopg2
from psycopg2.extras import RealDictCursor
from config import Config
import pandas as pd
from datetime import datetime, timedelta
import pandas as pd

class DatabaseHelper:
    """Клас для роботи з PostgreSQL базою даних"""
    
    def __init__(self):
        self.connection_params = {
            'host': Config.DB_HOST,
            'port': Config.DB_PORT,
            'database': Config.DB_NAME,
            'user': Config.DB_USER,
            'password': Config.DB_PASSWORD
        }
    
    def get_connection(self):
        """Створити з'єднання з базою даних"""
        try:
            conn = psycopg2.connect(**self.connection_params)
            return conn
        except Exception as e:
            print(f"❌ Помилка підключення до БД: {e}")
            raise
    
    def test_connection(self):
        """Перевірити з'єднання з базою даних"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            cursor.close()
            conn.close()
            print(f"✅ Підключення до PostgreSQL успішне!")
            print(f"📊 Версія: {version[0]}")
            return True
        except Exception as e:
            print(f"❌ Помилка: {e}")
            return False
    
    def get_historical_data(self, district_id, days=30, only_real=True):
        """
        Отримати історичні дані для району
        
        Args:
            district_id: ID району
            days: Кількість днів історії
            only_real: Тільки реальні дані (не прогнози)
        
        Returns:
            DataFrame з даними
        """
        try:
            conn = self.get_connection()
            
            # SQL запит
            query = """
                SELECT 
                    id,
                    district_id,
                    aqi,
                    aqi_status,
                    pm25,
                    pm10,
                    no2,
                    so2,
                    co,
                    o3,
                    temperature,
                    humidity,
                    pressure,
                    wind_speed,
                    wind_direction,
                    measured_at,
                    is_forecast
                FROM air_quality_history
                WHERE district_id = %s
                    AND measured_at >= NOW() - INTERVAL '%s days'
            """
            
            if only_real:
                query += " AND is_forecast = FALSE"
            
            query += " ORDER BY measured_at ASC"
            
            # Виконати запит
            df = pd.read_sql_query(query, conn, params=(district_id, days))
            conn.close()
            
            print(f"✅ Отримано {len(df)} записів для району {district_id}")
            return df
            
        except Exception as e:
            print(f"❌ Помилка отримання даних: {e}")
            return pd.DataFrame()
    
    def get_latest_data(self, district_id, hours=24):
        """
        Отримати останні дані для району
        
        Args:
            district_id: ID району
            hours: Кількість годин
        
        Returns:
            DataFrame з даними
        """
        try:
            conn = self.get_connection()
            
            query = """
                SELECT *
                FROM air_quality_history
                WHERE district_id = %s
                    AND measured_at >= NOW() - INTERVAL '%s hours'
                    AND is_forecast = FALSE
                ORDER BY measured_at ASC
            """
            
            df = pd.read_sql_query(query, conn, params=(district_id, hours))
            conn.close()
            
            return df
            
        except Exception as e:
            print(f"❌ Помилка: {e}")
            return pd.DataFrame()
    
    def save_forecast(self, district_id, forecasts_df):
        """
        Зберегти прогнози в БД
        forecasts_df: DataFrame з колонками [measured_at, pm25, pm10, no2, so2, co, o3, ...]
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Видалити старі прогнози для цього району
            cursor.execute("""
                DELETE FROM air_quality_history
                WHERE district_id = %s AND is_forecast = true AND measured_at > NOW()
            """, (district_id,))
            
            print(f"🗑️ Видалено старі прогнози для району {district_id}")
            
            # Вставити нові прогнози
            for _, row in forecasts_df.iterrows():
                cursor.execute("""
                    INSERT INTO air_quality_history (
                        district_id, aqi, aqi_status, pm25, pm10, no2, so2, co, o3,
                        temperature, humidity, pressure, wind_speed, wind_direction,
                        measured_at, is_forecast, confidence_level, data_source
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    district_id,
                    int(row['aqi']),
                    row['aqi_status'],
                    float(row['pm25']),
                    float(row['pm10']) if pd.notna(row.get('pm10')) else None,
                    float(row['no2']) if pd.notna(row.get('no2')) else None,
                    float(row['so2']) if pd.notna(row.get('so2')) else None,
                    float(row['co']) if pd.notna(row.get('co')) else None,
                    float(row['o3']) if pd.notna(row.get('o3')) else None,
                    float(row['temperature']) if pd.notna(row.get('temperature')) else None,
                    int(row['humidity']) if pd.notna(row.get('humidity')) else None,
                    int(row['pressure']) if pd.notna(row.get('pressure')) else None,
                    float(row['wind_speed']) if pd.notna(row.get('wind_speed')) else None,
                    row.get('wind_direction') if pd.notna(row.get('wind_direction')) else None,
                    row['measured_at'],
                    True,  # ← is_forecast = True для прогнозів!
                    float(row.get('confidence_level', 0.85)),
                    'ml_model'
                ))
            
            conn.commit()
            print(f"✅ Збережено {len(forecasts_df)} прогнозів для району {district_id}")
            
            cursor.close()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"❌ Помилка збереження прогнозів: {str(e)}")
            return False
    
    def get_data_stats(self, district_id):
        """Отримати статистику по даних району"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_records,
                    MIN(measured_at) as earliest_date,
                    MAX(measured_at) as latest_date,
                    AVG(pm25) as avg_pm25,
                    AVG(aqi) as avg_aqi
                FROM air_quality_history
                WHERE district_id = %s AND is_forecast = FALSE
            """, (district_id,))
            
            stats = cursor.fetchone()
            cursor.close()
            conn.close()
            
            return dict(stats) if stats else {}
            
        except Exception as e:
            print(f"❌ Помилка: {e}")
            return {}