-- backend/migrations/add_forecast_analysis.sql
-- Міграція для системи аналізу прогнозів

-- 1. Додати колонку для зберігання ID партії прогнозів
ALTER TABLE air_quality_history 
ADD COLUMN IF NOT EXISTS forecast_batch_id VARCHAR(36);

-- 2. Додати індекси для швидкого порівняння
CREATE INDEX IF NOT EXISTS idx_aqi_district_time_forecast 
ON air_quality_history(district_id, measured_at, is_forecast);

CREATE INDEX IF NOT EXISTS idx_aqi_forecast_batch 
ON air_quality_history(forecast_batch_id);

-- 3. Додати коментарі для документації
COMMENT ON COLUMN air_quality_history.forecast_batch_id IS 
'UUID для групування прогнозів з однієї партії';

-- 4. Перевірка успішності
SELECT 
    'Migration completed successfully!' as status,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE is_forecast = true) as forecast_records,
    COUNT(*) FILTER (WHERE is_forecast = false) as actual_records
FROM air_quality_history;