-- 003_create_air_quality_history.sql
-- Таблиця для зберігання історичних даних про якість повітря

CREATE TABLE IF NOT EXISTS air_quality_history (
    id SERIAL PRIMARY KEY,
    district_id INTEGER NOT NULL,
    aqi INTEGER NOT NULL,
    pm25 DECIMAL(10, 2) NOT NULL,
    pm10 DECIMAL(10, 2) NOT NULL,
    no2 DECIMAL(10, 2) DEFAULT 0,
    so2 DECIMAL(10, 2) DEFAULT 0,
    co DECIMAL(10, 2) DEFAULT 0,
    o3 DECIMAL(10, 2) DEFAULT 0,
    temperature DECIMAL(5, 2),
    humidity DECIMAL(5, 2),
    source VARCHAR(50) DEFAULT 'openweather',
    measured_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_district 
        FOREIGN KEY (district_id) 
        REFERENCES districts(id) 
        ON DELETE CASCADE
);

-- Індекс для швидкого пошуку по району та часу
CREATE INDEX idx_air_quality_district_time ON air_quality_history(district_id, measured_at DESC);

-- Індекс для швидкого пошуку по часу
CREATE INDEX idx_air_quality_measured_at ON air_quality_history(measured_at DESC);

COMMENT ON TABLE air_quality_history IS 'Історичні дані про якість повітря по районах';
COMMENT ON COLUMN air_quality_history.measured_at IS 'Час вимірювання (не час запису в БД)';