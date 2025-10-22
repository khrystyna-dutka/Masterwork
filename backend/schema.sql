-- ================================================
-- EcoLviv Database Schema for PostgreSQL
-- ================================================

-- Видалення існуючих таблиць (якщо є)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS air_quality_history CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS districts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ================================================
-- 1. Таблиця користувачів
-- ================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expire TIMESTAMP,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    notification_preferences JSONB DEFAULT '{"email": true, "push": false, "telegram": false}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_users_reset_token ON users(reset_password_token);

-- ================================================
-- 2. Таблиця районів Львова
-- ================================================
CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    population INTEGER,
    area_km2 DECIMAL(10, 2),
    tree_coverage_percent INTEGER CHECK (tree_coverage_percent >= 0 AND tree_coverage_percent <= 100),
    traffic_level INTEGER CHECK (traffic_level >= 0 AND traffic_level <= 100),
    industrial_zones INTEGER DEFAULT 0,
    geojson JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_districts_name ON districts(name);
CREATE INDEX idx_districts_coordinates ON districts(latitude, longitude);

-- ================================================
-- 3. Таблиця даних про якість повітря
-- ================================================
CREATE TABLE air_quality_history (
    id SERIAL PRIMARY KEY,
    district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
    
    aqi INTEGER NOT NULL CHECK (aqi >= 0 AND aqi <= 500),
    aqi_status VARCHAR(50) NOT NULL,
    
    pm25 DECIMAL(10, 2) CHECK (pm25 >= 0),
    pm10 DECIMAL(10, 2) CHECK (pm10 >= 0),
    no2 DECIMAL(10, 2) CHECK (no2 >= 0),
    so2 DECIMAL(10, 2) CHECK (so2 >= 0),
    co DECIMAL(10, 2) CHECK (co >= 0),
    o3 DECIMAL(10, 2) CHECK (o3 >= 0),
    
    temperature DECIMAL(5, 2),
    humidity INTEGER CHECK (humidity >= 0 AND humidity <= 100),
    pressure INTEGER,
    wind_speed DECIMAL(5, 2),
    wind_direction VARCHAR(10),
    
    data_source VARCHAR(50) DEFAULT 'sensor',
    sensor_id VARCHAR(100),
    is_forecast BOOLEAN DEFAULT FALSE,
    confidence_level DECIMAL(3, 2) CHECK (confidence_level >= 0 AND confidence_level <= 1),
    
    measured_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_aqi_district ON air_quality_history(district_id);
CREATE INDEX idx_aqi_measured_at ON air_quality_history(measured_at DESC);
CREATE INDEX idx_aqi_district_time ON air_quality_history(district_id, measured_at DESC);
CREATE INDEX idx_aqi_status ON air_quality_history(aqi_status);
CREATE INDEX idx_aqi_forecast ON air_quality_history(is_forecast, measured_at);

-- ================================================
-- 4. Таблиця підписок користувачів на райони
-- ================================================
CREATE TABLE user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
    
    alert_threshold INTEGER DEFAULT 100 CHECK (alert_threshold >= 0 AND alert_threshold <= 500),
    notify_daily_summary BOOLEAN DEFAULT TRUE,
    notify_on_high_pollution BOOLEAN DEFAULT TRUE,
    notify_on_forecast BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_district UNIQUE (user_id, district_id)
);

CREATE INDEX idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_subscriptions_district ON user_subscriptions(district_id);

-- ================================================
-- 5. Таблиця сповіщень
-- ================================================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    district_id INTEGER REFERENCES districts(id) ON DELETE SET NULL,
    
    type VARCHAR(50) NOT NULL CHECK (type IN ('alert', 'daily_summary', 'forecast', 'system')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
    
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    
    sent_via_email BOOLEAN DEFAULT FALSE,
    sent_via_push BOOLEAN DEFAULT FALSE,
    sent_via_telegram BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- ================================================
-- Тригери для автоматичного оновлення updated_at
-- ================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_districts_updated_at
    BEFORE UPDATE ON districts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Початкові дані: Райони Львова
-- ================================================

INSERT INTO districts (name, name_en, latitude, longitude, population, tree_coverage_percent, traffic_level, description) VALUES
('Галицький', 'Halytskyi', 49.8403, 24.0323, 115000, 40, 82, 'Історичний центр міста з високою туристичною активністю'),
('Франківський', 'Frankivskyi', 49.8176, 23.9888, 142000, 35, 88, 'Промисловий район з високим рівнем транспортного навантаження'),
('Залізничний', 'Zaliznychnyi', 49.8356, 23.9305, 108000, 25, 95, 'Транспортний вузол міста з залізничним вокзалом'),
('Шевченківський', 'Shevchenkivskyi', 49.8662, 24.0348, 98000, 20, 98, 'Район з інтенсивним дорожнім рухом'),
('Личаківський', 'Lychakivskyi', 49.8193, 24.0684, 135000, 45, 85, 'Зелений район з парками та лісопарками'),
('Сихівський', 'Sykhivskyi', 49.8107, 24.0457, 125000, 55, 70, 'Найбільш екологічно чистий спальний район');

-- ================================================
-- Початкові дані: Тестовий адміністратор
-- ================================================
-- Пароль: Admin123!

INSERT INTO users (email, password_hash, full_name, role, is_verified) VALUES
('admin@ecolv.ua', '$2a$10$rXZ9YhGvJN7xhTYXfPtQW.Hf5vB0Rd8OqfFhYQaJWWvNK3RXpRfWe', 'Адміністратор EcoLviv', 'admin', TRUE);

-- ================================================
-- VIEW для швидкого доступу до даних
-- ================================================

CREATE OR REPLACE VIEW current_air_quality AS
SELECT DISTINCT ON (d.id)
    d.id as district_id,
    d.name as district_name,
    d.name_en as district_name_en,
    d.latitude,
    d.longitude,
    aqh.aqi,
    aqh.aqi_status,
    aqh.pm25,
    aqh.pm10,
    aqh.no2,
    aqh.temperature,
    aqh.humidity,
    aqh.measured_at
FROM districts d
LEFT JOIN air_quality_history aqh ON d.id = aqh.district_id
WHERE aqh.is_forecast = FALSE
ORDER BY d.id, aqh.measured_at DESC;

CREATE OR REPLACE VIEW district_subscription_stats AS
SELECT 
    d.id as district_id,
    d.name as district_name,
    COUNT(us.id) as total_subscribers,
    COUNT(CASE WHEN us.notify_on_high_pollution THEN 1 END) as high_alert_subscribers,
    AVG(us.alert_threshold) as avg_alert_threshold
FROM districts d
LEFT JOIN user_subscriptions us ON d.id = us.district_id
GROUP BY d.id, d.name;

-- ================================================
-- Функція для очищення старих записів
-- ================================================

CREATE OR REPLACE FUNCTION cleanup_old_air_quality_data()
RETURNS void AS $$
BEGIN
    DELETE FROM air_quality_history
    WHERE measured_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
    AND is_forecast = FALSE;
    
    DELETE FROM air_quality_history
    WHERE measured_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
    AND is_forecast = TRUE;
    
    DELETE FROM notifications
    WHERE read_at IS NOT NULL
    AND read_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;