# ml-service/routes/research.py

from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
from datetime import datetime
import os
import traceback
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
from tensorflow import keras
from tensorflow.keras import layers
import json
import matplotlib
matplotlib.use('Agg')  # Для серверного використання
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64

research_bp = Blueprint('research', __name__)

def validate_dataset(df):
    """Перевірка обов'язкових колонок"""
    required_columns = [
        'timestamp', 'pm25', 'pm10', 'no2', 'so2', 'co', 'o3',
        'temperature', 'humidity', 'pressure'
    ]
    
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise ValueError(f"Відсутні обов'язкові колонки: {', '.join(missing)}")
    
    return True

def create_features(df, lag_hours=12, rolling_window=6):
    """Створення lag та rolling features"""
    feature_df = df.copy()
    
    pollutants = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']
    
    # Lag features
    for pollutant in pollutants:
        for lag in [1, 2, 3, 6, 12, 24]:
            if lag <= lag_hours:
                feature_df[f'{pollutant}_lag_{lag}'] = feature_df[pollutant].shift(lag)
    
    # Rolling features
    for pollutant in pollutants:
        for window in [3, 6, 12, 24]:
            if window <= rolling_window * 2:
                feature_df[f'{pollutant}_rolling_{window}'] = (
                    feature_df[pollutant].rolling(window=window).mean()
                )
    
    # Часові features
    feature_df['hour'] = pd.to_datetime(feature_df['timestamp']).dt.hour
    feature_df['day_of_week'] = pd.to_datetime(feature_df['timestamp']).dt.dayofweek
    feature_df['month'] = pd.to_datetime(feature_df['timestamp']).dt.month
    
    # Видаляємо рядки з NaN (через lag і rolling)
    feature_df = feature_df.dropna()
    
    return feature_df

def train_xgboost_model(X_train, y_train, X_test, y_test, config):
    """Тренування XGBoost моделі"""
    print("🚀 Тренування XGBoost...")
    
    model = xgb.XGBRegressor(
        n_estimators=config.get('epochs', 100),
        learning_rate=config.get('learningRate', 0.001),
        max_depth=6,
        random_state=42
    )
    
    model.fit(X_train, y_train)
    
    predictions = model.predict(X_test)
    
    return model, predictions

def train_random_forest_model(X_train, y_train, X_test, y_test, config):
    """Тренування Random Forest моделі"""
    print("🚀 Тренування Random Forest...")
    
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.multioutput import MultiOutputRegressor
    
    # Базова модель
    base_model = RandomForestRegressor(
        n_estimators=config.get('epochs', 200),  # epochs = кількість дерев
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,  # Використовувати всі CPU
        verbose=0
    )
    
    # MultiOutput для багатьох параметрів
    model = MultiOutputRegressor(base_model)
    
    model.fit(X_train, y_train)
    
    predictions = model.predict(X_test)
    
    return model, predictions

def train_lstm_model(X_train, y_train, X_test, y_test, config):
    """Тренування LSTM моделі"""
    print("🚀 Тренування LSTM...")
    
    # Решейпимо для LSTM (samples, timesteps, features)
    X_train_reshaped = X_train.reshape((X_train.shape[0], 1, X_train.shape[1]))
    X_test_reshaped = X_test.reshape((X_test.shape[0], 1, X_test.shape[1]))
    
    # Будуємо модель
    model = keras.Sequential()
    
    neurons = config.get('neurons', [128, 64, 32])
    hidden_layers = config.get('hiddenLayers', 3)
    dropout = config.get('dropoutRate', 0.2)
    
    # Перший LSTM шар
    model.add(layers.LSTM(
        neurons[0] if len(neurons) > 0 else 128,
        return_sequences=(hidden_layers > 1),
        input_shape=(1, X_train.shape[1])
    ))
    model.add(layers.Dropout(dropout))
    
    # Додаткові шари
    for i in range(1, min(hidden_layers, len(neurons))):
        model.add(layers.LSTM(
            neurons[i],
            return_sequences=(i < hidden_layers - 1)
        ))
        model.add(layers.Dropout(dropout))
    
    # Dense шари
    model.add(layers.Dense(64, activation='relu'))
    model.add(layers.Dropout(dropout))
    model.add(layers.Dense(y_train.shape[1]))  # Вихідний шар
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=config.get('learningRate', 0.001)),
        loss='mse',
        metrics=['mae']
    )
    
    # Тренування
    history = model.fit(
        X_train_reshaped, y_train,
        epochs=config.get('epochs', 100),
        batch_size=config.get('batchSize', 32),
        validation_split=0.2,
        verbose=0
    )
    
    predictions = model.predict(X_test_reshaped, verbose=0)
    
    return model, predictions, history.history

def calculate_metrics(y_true, y_pred, pollutants):
    """Обчислення метрик для кожного параметру"""
    metrics = {}
    
    for i, pollutant in enumerate(pollutants):
        y_true_param = y_true[:, i]
        y_pred_param = y_pred[:, i]
        
        mae = mean_absolute_error(y_true_param, y_pred_param)
        rmse = np.sqrt(mean_squared_error(y_true_param, y_pred_param))
        r2 = r2_score(y_true_param, y_pred_param)
        
        metrics[pollutant] = {
            'mae': round(float(mae), 2),
            'rmse': round(float(rmse), 2),
            'r2': round(float(r2), 3)
        }
    
    return metrics

def generate_plots(y_test, predictions, pollutants, training_history=None):
    """Генерація графіків як base64"""
    plots = {}
    
    try:
        # 1. Actual vs Predicted для кожного параметру
        fig, axes = plt.subplots(2, 3, figsize=(15, 10))
        fig.suptitle('Actual vs Predicted Values', fontsize=16, fontweight='bold')
        
        for idx, param in enumerate(pollutants):
            ax = axes[idx // 3, idx % 3]
            
            y_true = y_test[:, idx]
            y_pred = predictions[:, idx]
            
            ax.plot(y_true, label='Actual', linewidth=2, alpha=0.7)
            ax.plot(y_pred, label='Predicted', linewidth=2, alpha=0.7)
            ax.set_title(f'{param.upper()}', fontweight='bold')
            ax.set_xlabel('Sample')
            ax.set_ylabel('Value')
            ax.legend()
            ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        # Конвертація в base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        plots['actual_vs_predicted'] = base64.b64encode(buffer.read()).decode()
        plt.close()
        
        # 2. Scatter plots (кореляція)
        fig, axes = plt.subplots(2, 3, figsize=(15, 10))
        fig.suptitle('Correlation: Actual vs Predicted', fontsize=16, fontweight='bold')
        
        for idx, param in enumerate(pollutants):
            ax = axes[idx // 3, idx % 3]
            
            y_true = y_test[:, idx]
            y_pred = predictions[:, idx]
            
            ax.scatter(y_true, y_pred, alpha=0.5, s=30)
            
            # Лінія ідеальної кореляції
            min_val = min(y_true.min(), y_pred.min())
            max_val = max(y_true.max(), y_pred.max())
            ax.plot([min_val, max_val], [min_val, max_val], 'r--', linewidth=2, label='Perfect correlation')
            
            ax.set_title(f'{param.upper()}', fontweight='bold')
            ax.set_xlabel('Actual')
            ax.set_ylabel('Predicted')
            ax.legend()
            ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        plots['scatter_plots'] = base64.b64encode(buffer.read()).decode()
        plt.close()
        
        # 3. Loss curve (якщо є історія тренування)
        if training_history and 'loss' in training_history:
            fig, ax = plt.subplots(figsize=(10, 6))
            
            ax.plot(training_history['loss'], label='Training Loss', linewidth=2)
            if 'val_loss' in training_history:
                ax.plot(training_history['val_loss'], label='Validation Loss', linewidth=2)
            
            ax.set_title('Training History', fontsize=14, fontweight='bold')
            ax.set_xlabel('Epoch')
            ax.set_ylabel('Loss')
            ax.legend()
            ax.grid(True, alpha=0.3)
            
            plt.tight_layout()
            
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
            buffer.seek(0)
            plots['loss_curve'] = base64.b64encode(buffer.read()).decode()
            plt.close()
        
        # 4. Residuals (помилки)
        fig, axes = plt.subplots(2, 3, figsize=(15, 10))
        fig.suptitle('Prediction Residuals', fontsize=16, fontweight='bold')
        
        for idx, param in enumerate(pollutants):
            ax = axes[idx // 3, idx % 3]
            
            y_true = y_test[:, idx]
            y_pred = predictions[:, idx]
            residuals = y_true - y_pred
            
            ax.hist(residuals, bins=20, edgecolor='black', alpha=0.7)
            ax.axvline(0, color='red', linestyle='--', linewidth=2)
            ax.set_title(f'{param.upper()}', fontweight='bold')
            ax.set_xlabel('Residual (Actual - Predicted)')
            ax.set_ylabel('Frequency')
            ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        plots['residuals'] = base64.b64encode(buffer.read()).decode()
        plt.close()
        
    except Exception as e:
        print(f"⚠️ Помилка генерації графіків: {str(e)}")
    
    return plots

@research_bp.route('/train-custom', methods=['POST'])
def train_custom_model():
    """Тренування custom моделі на user's датасеті"""
    try:
        print("\n" + "="*70)
        print("🔬 CUSTOM MODEL TRAINING STARTED")
        print("="*70)
        
        # Отримуємо файл і конфігурацію
        if 'dataset' not in request.files:
            return jsonify({'success': False, 'error': 'Файл не завантажено'}), 400
        
        file = request.files['dataset']
        config = json.loads(request.form.get('config', '{}'))
        
        print(f"📁 Файл: {file.filename}")
        print(f"⚙️ Конфігурація: {json.dumps(config, indent=2)}")
        
        # Читаємо CSV
        df = pd.read_csv(file)
        print(f"✅ Датасет завантажено: {len(df)} рядків, {len(df.columns)} колонок")
        print(f"📊 Колонки: {list(df.columns)}")
        
        # Валідація
        validate_dataset(df)
        print("✅ Валідація пройдена")

        # Перевірка мінімальної кількості даних
        if len(df) < 50:
            return jsonify({
                'success': False,
                'error': f'Недостатньо даних: {len(df)} рядків. Потрібно мінімум 50 рядків для тренування моделі.'
            }), 400

        print(f"✅ Достатньо даних для тренування")
        
        # Feature engineering
        print("\n🔧 Feature Engineering...")
        df_features = create_features(
            df,
            lag_hours=config.get('lagHours', 12),
            rolling_window=config.get('rollingWindow', 6)
        )
        print(f"✅ Features створено: {len(df_features)} рядків, {len(df_features.columns)} колонок")

        if len(df_features) < 30:
            return jsonify({
                'success': False,
                'error': f'Після feature engineering залишилось {len(df_features)} рядків (потрібно мінімум 30). '
                        f'Спробуйте: 1) Завантажити більше даних (100+ рядків), '
                        f'2) Зменшити lag_hours та rolling_window у налаштуваннях.'
            }), 40
        
        # Підготовка даних
        pollutants = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']
        
        # X - всі фічі крім target і timestamp
        feature_cols = [col for col in df_features.columns 
                       if col not in pollutants + ['timestamp']]
        X = df_features[feature_cols].values
        y = df_features[pollutants].values
        
        print(f"📐 X shape: {X.shape}, y shape: {y.shape}")
        
        # Train/Test split
        train_split = config.get('trainSplit', 80) / 100
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, train_size=train_split, shuffle=False
        )
        
        print(f"✅ Train/Test split: {len(X_train)}/{len(X_test)}")
        
        # Нормалізація
        scaler = StandardScaler()
        X_train = scaler.fit_transform(X_train)
        X_test = scaler.transform(X_test)
        
        print("✅ Дані нормалізовано")
        
        # Тренування моделі
        start_time = datetime.now()
        algorithm = config.get('algorithm', 'xgboost')

        if algorithm == 'xgboost':
            model, predictions = train_xgboost_model(X_train, y_train, X_test, y_test, config)
            training_history = None
        elif algorithm == 'lstm':
            model, predictions, training_history = train_lstm_model(X_train, y_train, X_test, y_test, config)
        elif algorithm == 'random_forest':  # 🆕 ДОДАЙ ЦЕ
            model, predictions = train_random_forest_model(X_train, y_train, X_test, y_test, config)
            training_history = None
        else:
            return jsonify({'success': False, 'error': f'Невідомий алгоритм: {algorithm}'}), 400
        
        training_time = (datetime.now() - start_time).total_seconds()
        print(f"✅ Модель натренована за {training_time:.1f} секунд")
        
        # Обчислення метрик
        metrics = calculate_metrics(y_test, predictions, pollutants)
        
        print("\n📊 МЕТРИКИ:")
        for param, m in metrics.items():
            print(f"   {param.upper()}: MAE={m['mae']}, RMSE={m['rmse']}, R²={m['r2']}")
        
        # Генерація графіків
        print("\n📈 Генерація візуалізацій...")
        plots = generate_plots(y_test, predictions, pollutants, training_history)
        print(f"✅ Створено {len(plots)} графіків")
        
        # Формуємо відповідь
        response = {
            'success': True,
            'metrics': metrics,
            'trainingTime': f"{int(training_time // 60)} хв {int(training_time % 60)} сек",
            'finalLoss': round(float(np.mean([m['mae'] for m in metrics.values()])), 2),
            'finalValLoss': round(float(np.mean([m['rmse'] for m in metrics.values()])), 2),
            'plots': plots,  # 🆕 ДОДАЙ ЦЕ
            'datasetInfo': {
                'totalRows': len(df),
                'trainRows': len(X_train),
                'testRows': len(X_test),
                'features': len(feature_cols)
            },
            'config': config
        }
        
        print("\n✅ TRAINING COMPLETED SUCCESSFULLY")
        print("="*70 + "\n")
        
        return jsonify(response)
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500