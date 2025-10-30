# ml-service/utils/db_helper.py
import psycopg2
import pandas as pd
from datetime import datetime, timedelta
from config import Config

class DatabaseHelper:
    """Робота з PostgreSQL"""
    
    def __init__(self):
        self.connection_params = {
            'host': Config.DB_HOST,
            'port': Config.DB_PORT,
            'database': Config.DB_NAME,
            'user': Config.DB_USER,
            'password': Config.DB_PASSWORD
        }
    
    def get_connection(self):
        """Створити з'єднання"""
        try:
            return psycopg2.connect(**self.connection_params)
        except Exception as e:
            print(f"❌ Помилка підключення до БД: {e}")
            raise
    
    def query(self, sql, params=None):
        """Виконати запит і повернути результат"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            
            result = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            return result
            
        except Exception as e:
            print(f"❌ Помилка виконання запиту: {e}")
            return []
    
    def test_connection(self):
        """Перевірити підключення"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            cursor.close()
            conn.close()
            print(f"✅ Підключення успішне! PostgreSQL: {version[0][:50]}...")
            return True
        except Exception as e:
            print(f"❌ Помилка: {e}")
            return False
    
    def get_training_data(self, district_id, days=30):
        """
        Отримати дані для навчання (тільки реальні, без прогнозів)
        """
        try:
            conn = self.get_connection()
            
            query = """
                SELECT 
                    measured_at,
                    pm25, pm10, no2, so2, co, o3,
                    temperature, humidity, pressure, wind_speed
                FROM air_quality_history
                WHERE district_id = %s
                    AND is_forecast = FALSE
                    AND measured_at >= NOW() - INTERVAL '%s days'
                ORDER BY measured_at ASC
            """
            
            df = pd.read_sql_query(query, conn, params=(district_id, days))
            conn.close()
            
            print(f"✅ Завантажено {len(df)} записів для району {district_id}")
            return df
            
        except Exception as e:
            print(f"❌ Помилка: {e}")
            return pd.DataFrame()
    
    def get_latest_data(self, district_id, hours=48):
        """
        Отримати останні дані для прогнозу
        """
        try:
            conn = self.get_connection()
            
            query = """
                SELECT 
                    measured_at,
                    pm25, pm10, no2, so2, co, o3,
                    temperature, humidity, pressure, wind_speed
                FROM air_quality_history
                WHERE district_id = %s
                    AND is_forecast = FALSE
                    AND measured_at >= NOW() - INTERVAL '%s hours'
                ORDER BY measured_at ASC
            """
            
            df = pd.read_sql_query(query, conn, params=(district_id, hours))
            conn.close()
            
            return df
            
        except Exception as e:
            print(f"❌ Помилка: {e}")
            return pd.DataFrame()
    
    def save_forecasts(self, district_id, forecasts_df):
        """
        Зберегти прогнози в БД
        forecasts_df має колонки: measured_at, pm25, pm10, no2, so2, co, o3, aqi, aqi_status
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Видалити старі прогнози
            cursor.execute("""
                DELETE FROM air_quality_history
                WHERE district_id = %s AND is_forecast = TRUE AND measured_at > NOW()
            """, (district_id,))
            
            # Вставити нові прогнози
            for _, row in forecasts_df.iterrows():
                cursor.execute("""
                    INSERT INTO air_quality_history (
                        district_id, measured_at, is_forecast,
                        pm25, pm10, no2, so2, co, o3,
                        aqi, aqi_status, data_source
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    district_id,
                    row['measured_at'],
                    True,  # is_forecast
                    float(row['pm25']),
                    float(row['pm10']),
                    float(row['no2']),
                    float(row['so2']),
                    float(row['co']),
                    float(row['o3']),
                    int(row['aqi']),
                    row['aqi_status'],
                    'ml_model'
                ))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            print(f"✅ Збережено {len(forecasts_df)} прогнозів для району {district_id}")
            return True
            
        except Exception as e:
            print(f"❌ Помилка збереження: {e}")
            return False
    
    def get_data_stats(self, district_id):
        """Статистика по даних"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    MIN(measured_at) as first_date,
                    MAX(measured_at) as last_date,
                    AVG(pm25) as avg_pm25,
                    AVG(aqi) as avg_aqi
                FROM air_quality_history
                WHERE district_id = %s AND is_forecast = FALSE
            """, (district_id,))
            
            row = cursor.fetchone()
            cursor.close()
            conn.close()
            
            return {
                'total_records': row[0],
                'first_date': row[1],
                'last_date': row[2],
                'avg_pm25': float(row[3]) if row[3] else 0,
                'avg_aqi': float(row[4]) if row[4] else 0
            }
            
        except Exception as e:
            print(f"❌ Помилка: {e}")
            return None
    
    def get_forecasts_for_validation(self, district_id, hours_back=24):
        """
        Отримати прогнози для валідації
        """
        try:
            conn = self.get_connection()
            cutoff_time = datetime.now() - timedelta(hours=hours_back)
            
            query = """
                SELECT measured_at, pm25, pm10, no2, so2, co, o3, aqi
                FROM air_quality_history
                WHERE district_id = %s
                  AND is_forecast = true
                  AND measured_at >= %s
                  AND measured_at <= NOW()
                ORDER BY measured_at ASC
            """
            
            df = pd.read_sql_query(query, conn, params=(district_id, cutoff_time))
            conn.close()
            
            return df
            
        except Exception as e:
            print(f"❌ Помилка: {e}")
            return pd.DataFrame()
    
    def get_actual_data_for_period(self, district_id, start_time, end_time):
        """
        Отримати реальні дані за період
        """
        try:
            conn = self.get_connection()
            
            query = """
                SELECT measured_at, pm25, pm10, no2, so2, co, o3, aqi
                FROM air_quality_history
                WHERE district_id = %s
                  AND is_forecast = false
                  AND measured_at >= %s
                  AND measured_at <= %s
                ORDER BY measured_at ASC
            """
            
            df = pd.read_sql_query(query, conn, params=(district_id, start_time, end_time))
            conn.close()
            
            return df
            
        except Exception as e:
            print(f"❌ Помилка: {e}")
            return pd.DataFrame()