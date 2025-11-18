# ml-service/models/air_quality_model.py
import numpy as np
import xgboost as xgb
from sklearn.ensemble import RandomForestRegressor
from sklearn.multioutput import MultiOutputRegressor
import joblib
import os
from config import Config
import json

class AirQualityModel:  
    def __init__(self, district_id, model_type='xgboost'):
        self.district_id = district_id
        self.model_type = model_type
        self.model = None
        self.model_path = os.path.join(
            Config.MODEL_PATH,
            f'{model_type}_district_{district_id}.pkl'
        )
        self.metrics_path = os.path.join(
            Config.MODEL_PATH,
            f'metrics_district_{district_id}.json'
        )
    
    def create_model(self):
        if self.model_type == 'xgboost':
            base_model = xgb.XGBRegressor(
                n_estimators=50,          
                max_depth=4,              
                learning_rate=0.1,        
                min_child_weight=5,       
                subsample=0.7,            
                colsample_bytree=0.7,     
                colsample_bylevel=0.7,    
                reg_alpha=1.0,
                reg_lambda=1.0,
                gamma=0.5,                  
                random_state=42,
                n_jobs=-1
            )
        elif self.model_type == 'random_forest':
            base_model = RandomForestRegressor(
                n_estimators=50,
                max_depth=10,
                min_samples_split=10,
                min_samples_leaf=5,
                max_features='sqrt',
                random_state=42,
                n_jobs=-1
            )
        else:
            raise ValueError(f"Unknown model type: {self.model_type}")
        
        self.model = MultiOutputRegressor(base_model)
        return self.model
    
    def train(self, X_train, y_train, X_val=None, y_val=None):
        print(f"\n🎯 Навчання {self.model_type} моделі (з anti-overfitting)...")

        self.create_model()
        self.model.fit(X_train, y_train)
        train_score = self.model.score(X_train, y_train)
        
        val_score = None
        if X_val is not None and y_val is not None:
            val_score = self.model.score(X_val, y_val)
        
        print(f"✅ Train R²: {train_score:.4f}")
        if val_score is not None:
            print(f"✅ Val R²: {val_score:.4f}")
            diff = abs(train_score - val_score)
            print(f"   Різниця: {diff:.4f}")
            if diff < 0.15:
                print(f"   ✅ Добре! Немає overfitting!")
            elif diff < 0.25:
                print(f"   ⚠️ Невелика різниця")
            else:
                print(f"   ❌ Можливий overfitting")

        self.save_model()
        metrics = {
            'train_r2': float(train_score),
            'val_r2': float(val_score) if val_score else None,
            'model_type': self.model_type
        }
        
        os.makedirs(Config.MODEL_PATH, exist_ok=True)
        with open(self.metrics_path, 'w') as f:
            json.dump(metrics, f, indent=2)
        
        return train_score, val_score
    
    def predict(self, X):
        if self.model is None:
            raise ValueError("Model not trained or loaded")
        return self.model.predict(X)
    
    def save_model(self):
        os.makedirs(Config.MODEL_PATH, exist_ok=True)
        joblib.dump(self.model, self.model_path)
        print(f"✅ Модель збережена: {self.model_path}")
    
    def load_model(self):
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)
            print(f"✅ Модель завантажена: {self.model_path}")
            return True
        else:
            print(f"⚠️ Модель не знайдена: {self.model_path}")
            return False