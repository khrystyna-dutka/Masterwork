# ml-service/models/air_quality_model.py
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
from config import Config

class AirQualityModel:
    """Покращена ML модель для прогнозування"""
    
    def __init__(self, district_id, model_type='xgboost'):
        self.district_id = district_id
        self.model_type = model_type
        self.model = None
        self.model_path = os.path.join(
            Config.MODEL_PATH,
            f'model_district_{district_id}_{model_type}.pkl'
        )
    
    def build_model(self):
        """Створити ПОКРАЩЕНУ модель"""
        if self.model_type == 'xgboost':
            # ⬇️ ПОКРАЩЕНО: більше дерев, більша глибина
            base_model = xgb.XGBRegressor(
                n_estimators=100,      # ⬅️ ЗБІЛЬШИЛИ з 10 до 100
                max_depth=6,           # ⬅️ ЗБІЛЬШИЛИ з 3 до 6
                learning_rate=0.05,    # ⬅️ ЗМЕНШИЛИ для кращого навчання
                subsample=0.8,
                colsample_bytree=0.8,
                min_child_weight=3,
                gamma=0.1,
                random_state=42,
                n_jobs=-1
            )
        else:
            # Random Forest
            base_model = RandomForestRegressor(
                n_estimators=100,      # ⬅️ ЗБІЛЬШИЛИ
                max_depth=10,          # ⬅️ ЗБІЛЬШИЛИ
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            )
        
        self.model = MultiOutputRegressor(base_model)
        
        print(f"✅ Модель створено: {self.model_type} (покращена)")
    
    def train(self, X_train, y_train, X_val, y_val):
        """Навчити модель"""
        print(f"\n🎓 Навчання моделі для району {self.district_id}...")
        print(f"   Train samples: {len(X_train)}")
        
        # Створити модель
        self.build_model()
        
        # Навчити
        self.model.fit(X_train, y_train)
        
        # Оцінити
        train_score = self.model.score(X_train, y_train)
        val_score = self.model.score(X_val, y_val)
        
        print(f"   📊 Train R² score: {train_score:.4f}")
        print(f"   📊 Validation R² score: {val_score:.4f}")
        
        # Зберегти
        self.save_model()
        
        return train_score, val_score
    
    def predict(self, X):
        """Зробити прогноз"""
        if self.model is None:
            raise ValueError("Модель не навчена! Спочатку завантажте модель.")
        
        return self.model.predict(X)
    
    def evaluate(self, X, y):
        """Оцінити модель"""
        y_pred = self.predict(X)
        
        metrics = {}
        param_names = Config.TARGET_FEATURES
        
        for i, param in enumerate(param_names):
            mae = mean_absolute_error(y[:, i], y_pred[:, i])
            rmse = np.sqrt(mean_squared_error(y[:, i], y_pred[:, i]))
            r2 = r2_score(y[:, i], y_pred[:, i])
            
            metrics[param] = {
                'mae': mae,
                'rmse': rmse,
                'r2': r2
            }
        
        return metrics
    
    def save_model(self):
        """Зберегти модель"""
        os.makedirs(Config.MODEL_PATH, exist_ok=True)
        joblib.dump(self.model, self.model_path)
        print(f"   💾 Модель збережено: {self.model_path}")
    
    def load_model(self):
        """Завантажити модель"""
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)
            print(f"✅ Модель завантажено: {self.model_path}")
            return True
        return False