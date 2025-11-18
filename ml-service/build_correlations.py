import os
import psycopg2
import pandas as pd
from dotenv import load_dotenv
import matplotlib.pyplot as plt
import seaborn as sns

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "database": os.getenv("DB_NAME", "ecolviv"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "root"),
}

TABLE_NAME = "air_quality_history"
DISTRICT_COLUMN = "district_id"

# забруднення
POLLUTION_COLS = ["aqi", "pm25", "pm10", "no2", "so2", "co", "o3"]

# погода
METEO_COLS = ["temperature", "humidity", "pressure", "wind_speed"]

# все разом
COLUMNS_FOR_CORR = POLLUTION_COLS + METEO_COLS


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


def load_data():
    query = f"""
        SELECT {DISTRICT_COLUMN}, {', '.join(COLUMNS_FOR_CORR)}
        FROM {TABLE_NAME}
        WHERE (is_forecast = FALSE OR is_forecast IS NULL)
    """
    conn = get_connection()
    df = pd.read_sql(query, conn)
    conn.close()
    return df


# ------------------------- PNG ФУНКЦІЯ -------------------------

def save_heatmap(corr: pd.DataFrame, filename: str, title: str):
    """Зберігає PNG heatmap."""
    plt.figure(figsize=(10, 7))
    sns.heatmap(
        corr,
        cmap="coolwarm",
        annot=True,
        fmt=".2f",
        linewidths=0.5,
        vmin=-1, vmax=1,
        cbar=True
    )
    plt.title(title, fontsize=14)
    plt.tight_layout()
    plt.savefig(filename, dpi=300)
    plt.close()
    print(f"PNG збережено: {filename}")


# ------------------------- РОЗРАХУНКИ -------------------------

def build_global_correlation(df: pd.DataFrame):
    df_clean = df.dropna(subset=COLUMNS_FOR_CORR)

    corr_full = df_clean[COLUMNS_FOR_CORR].corr()
    corr_full.to_csv("correlation_full.csv")
    save_heatmap(corr_full, "correlation_full.png", "Кореляційна матриця (всі показники)")

    corr_cross = corr_full.loc[POLLUTION_COLS, METEO_COLS]
    corr_cross.to_csv("correlation_pollution_vs_meteo.csv")
    save_heatmap(corr_cross, "correlation_pollution_vs_meteo.png",
                 "Кореляція: забруднення vs метеопоказники")


def build_correlation_by_district(df: pd.DataFrame, min_rows=50):
    districts = df[DISTRICT_COLUMN].dropna().unique()

    for d in sorted(districts):
        sub = df[df[DISTRICT_COLUMN] == d].dropna(subset=COLUMNS_FOR_CORR)
        if len(sub) < min_rows:
            print(f"Район {d}: замало даних ({len(sub)}), PNG не будується.")
            continue

        corr = sub[COLUMNS_FOR_CORR].corr()
        fname_csv = f"correlation_district_{d}.csv"
        fname_png = f"correlation_district_{d}.png"

        corr.to_csv(fname_csv)
        save_heatmap(corr, fname_png, f"Кореляційна матриця району {d}")


def main():
    df = load_data()
    print(f"Завантажено {len(df)} рядків.")

    build_global_correlation(df)
    build_correlation_by_district(df)


if __name__ == "__main__":
    main()
