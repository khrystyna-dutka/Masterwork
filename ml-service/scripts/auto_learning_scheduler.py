# ml-service/scripts/auto_learning_scheduler.py
"""
Автоматичний scheduler для онлайн-навчання
Запускає collect_feedback кожну годину
Запускає incremental_training раз на день
"""
import schedule
import time
from datetime import datetime
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.collect_feedback import collect_feedback_all
from scripts.incremental_training import incremental_train_all

def job_collect_feedback():
    """Запуск збору feedback"""
    print("\n" + "🔄" * 35)
    print(f"⏰ Автоматичний збір feedback - {datetime.now()}")
    print("🔄" * 35)
    
    try:
        collect_feedback_all()
    except Exception as e:
        print(f"❌ Помилка збору feedback: {e}")

def job_incremental_training():
    """Запуск інкрементального навчання"""
    print("\n" + "🧠" * 35)
    print(f"⏰ Автоматичне дотренування - {datetime.now()}")
    print("🧠" * 35)
    
    try:
        incremental_train_all(min_samples=50, epochs=5)
    except Exception as e:
        print(f"❌ Помилка навчання: {e}")

def run_scheduler():
    """Запустити scheduler"""
    
    print("=" * 70)
    print("🤖 АВТОМАТИЧНЕ ОНЛАЙН-НАВЧАННЯ")
    print("=" * 70)
    print(f"🕐 Запущено: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n📅 Розклад:")
    print("   • Збір feedback: кожну годину")
    print("   • Дотренування моделі: щодня о 03:00")
    print("\n💡 Для зупинки: Ctrl+C")
    print("=" * 70)
    
    # Налаштувати розклад
    schedule.every().hour.do(job_collect_feedback)  # Кожну годину
    schedule.every().day.at("03:00").do(job_incremental_training)  # Щодня о 3 ночі
    
    # Запустити одразу (для тесту)
    print("\n🚀 Перший запуск збору feedback...")
    job_collect_feedback()
    
    # Основний цикл
    while True:
        schedule.run_pending()
        time.sleep(60)  # Перевірка кожну хвилину

if __name__ == "__main__":
    try:
        run_scheduler()
    except KeyboardInterrupt:
        print("\n\n⏹️ Scheduler зупинено!")
        print("👋 До побачення!")