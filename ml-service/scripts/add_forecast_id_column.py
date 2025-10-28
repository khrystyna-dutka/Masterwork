# ml-service/scripts/add_forecast_id_column.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db_helper import DatabaseHelper

db = DatabaseHelper()
conn = db.get_connection()
cursor = conn.cursor()

cursor.execute("""
    ALTER TABLE training_feedback 
    ADD COLUMN IF NOT EXISTS forecast_id INTEGER;
""")

conn.commit()
print("✅ Колонка forecast_id додана!")
cursor.close()
conn.close()