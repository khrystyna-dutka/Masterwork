# ml-service/utils/aqi_calculator.py

class AQICalculator:
    """Розрахунок AQI за EPA стандартом"""
    
    @staticmethod
    def calculate_aqi(concentration, breakpoints):
        """Базова функція розрахунку AQI"""
        # Знайти відповідний діапазон
        bp = breakpoints[0]
        for breakpoint in breakpoints:
            if breakpoint['c_low'] <= concentration <= breakpoint['c_high']:
                bp = breakpoint
                break
        
        # Якщо вище максимуму
        if concentration > breakpoints[-1]['c_high']:
            return 500
        
        # EPA формула
        aqi = round(
            ((bp['i_high'] - bp['i_low']) / (bp['c_high'] - bp['c_low'])) 
            * (concentration - bp['c_low']) + bp['i_low']
        )
        
        return aqi
    
    @staticmethod
    def calculate_pm25_aqi(pm25):
        """AQI для PM2.5"""
        breakpoints = [
            {'c_low': 0.0, 'c_high': 12.0, 'i_low': 0, 'i_high': 50},
            {'c_low': 12.1, 'c_high': 35.4, 'i_low': 51, 'i_high': 100},
            {'c_low': 35.5, 'c_high': 55.4, 'i_low': 101, 'i_high': 150},
            {'c_low': 55.5, 'c_high': 150.4, 'i_low': 151, 'i_high': 200},
            {'c_low': 150.5, 'c_high': 250.4, 'i_low': 201, 'i_high': 300},
            {'c_low': 250.5, 'c_high': 500.4, 'i_low': 301, 'i_high': 500}
        ]
        return AQICalculator.calculate_aqi(pm25, breakpoints)
    
    @staticmethod
    def calculate_pm10_aqi(pm10):
        """AQI для PM10"""
        breakpoints = [
            {'c_low': 0, 'c_high': 54, 'i_low': 0, 'i_high': 50},
            {'c_low': 55, 'c_high': 154, 'i_low': 51, 'i_high': 100},
            {'c_low': 155, 'c_high': 254, 'i_low': 101, 'i_high': 150},
            {'c_low': 255, 'c_high': 354, 'i_low': 151, 'i_high': 200},
            {'c_low': 355, 'c_high': 424, 'i_low': 201, 'i_high': 300},
            {'c_low': 425, 'c_high': 604, 'i_low': 301, 'i_high': 500}
        ]
        return AQICalculator.calculate_aqi(pm10, breakpoints)
    
    @staticmethod
    def calculate_no2_aqi(no2):
        """AQI для NO2 (μg/m³ -> ppb)"""
        no2_ppb = no2 / 1.88
        breakpoints = [
            {'c_low': 0, 'c_high': 53, 'i_low': 0, 'i_high': 50},
            {'c_low': 54, 'c_high': 100, 'i_low': 51, 'i_high': 100},
            {'c_low': 101, 'c_high': 360, 'i_low': 101, 'i_high': 150},
            {'c_low': 361, 'c_high': 649, 'i_low': 151, 'i_high': 200},
            {'c_low': 650, 'c_high': 1249, 'i_low': 201, 'i_high': 300},
            {'c_low': 1250, 'c_high': 2049, 'i_low': 301, 'i_high': 500}
        ]
        return AQICalculator.calculate_aqi(no2_ppb, breakpoints)
    
    @staticmethod
    def calculate_so2_aqi(so2):
        """AQI для SO2 (μg/m³ -> ppb)"""
        so2_ppb = so2 / 2.62
        breakpoints = [
            {'c_low': 0, 'c_high': 35, 'i_low': 0, 'i_high': 50},
            {'c_low': 36, 'c_high': 75, 'i_low': 51, 'i_high': 100},
            {'c_low': 76, 'c_high': 185, 'i_low': 101, 'i_high': 150},
            {'c_low': 186, 'c_high': 304, 'i_low': 151, 'i_high': 200},
            {'c_low': 305, 'c_high': 604, 'i_low': 201, 'i_high': 300},
            {'c_low': 605, 'c_high': 1004, 'i_low': 301, 'i_high': 500}
        ]
        return AQICalculator.calculate_aqi(so2_ppb, breakpoints)
    
    @staticmethod
    def calculate_co_aqi(co):
        """AQI для CO (μg/m³ -> ppm)"""
        co_ppm = co / 1145
        breakpoints = [
            {'c_low': 0.0, 'c_high': 4.4, 'i_low': 0, 'i_high': 50},
            {'c_low': 4.5, 'c_high': 9.4, 'i_low': 51, 'i_high': 100},
            {'c_low': 9.5, 'c_high': 12.4, 'i_low': 101, 'i_high': 150},
            {'c_low': 12.5, 'c_high': 15.4, 'i_low': 151, 'i_high': 200},
            {'c_low': 15.5, 'c_high': 30.4, 'i_low': 201, 'i_high': 300},
            {'c_low': 30.5, 'c_high': 50.4, 'i_low': 301, 'i_high': 500}
        ]
        return AQICalculator.calculate_aqi(co_ppm, breakpoints)
    
    @staticmethod
    def calculate_o3_aqi(o3):
        """AQI для O3 (μg/m³ -> ppb)"""
        o3_ppb = o3 / 2.00
        breakpoints = [
            {'c_low': 0, 'c_high': 54, 'i_low': 0, 'i_high': 50},
            {'c_low': 55, 'c_high': 70, 'i_low': 51, 'i_high': 100},
            {'c_low': 71, 'c_high': 85, 'i_low': 101, 'i_high': 150},
            {'c_low': 86, 'c_high': 105, 'i_low': 151, 'i_high': 200},
            {'c_low': 106, 'c_high': 200, 'i_low': 201, 'i_high': 300},
            {'c_low': 201, 'c_high': 604, 'i_low': 301, 'i_high': 500}
        ]
        return AQICalculator.calculate_aqi(o3_ppb, breakpoints)
    
    @staticmethod
    def calculate_full_aqi(pm25, pm10, no2, so2, co, o3):
        """Розрахувати повний AQI з усіх параметрів"""
        aqis = {
            'pm25': AQICalculator.calculate_pm25_aqi(pm25) if pm25 > 0 else 0,
            'pm10': AQICalculator.calculate_pm10_aqi(pm10) if pm10 > 0 else 0,
            'no2': AQICalculator.calculate_no2_aqi(no2) if no2 > 0 else 0,
            'so2': AQICalculator.calculate_so2_aqi(so2) if so2 > 0 else 0,
            'co': AQICalculator.calculate_co_aqi(co) if co > 0 else 0,
            'o3': AQICalculator.calculate_o3_aqi(o3) if o3 > 0 else 0
        }
        
        max_aqi = max(aqis.values())
        dominant = max(aqis, key=aqis.get)
        
        return {
            'aqi': int(max_aqi),
            'dominant': dominant,
            'breakdown': aqis
        }
    
    @staticmethod
    def get_aqi_status(aqi):
        """Отримати статус якості повітря"""
        if aqi <= 50:
            return 'Good'
        elif aqi <= 100:
            return 'Moderate'
        elif aqi <= 150:
            return 'Unhealthy for Sensitive'
        elif aqi <= 200:
            return 'Unhealthy'
        elif aqi <= 300:
            return 'Very Unhealthy'
        else:
            return 'Hazardous'