
from pathlib import Path

import numpy as np
import pandas as pd


# Locate the data directory relative to this file.
DATA_DIR = Path(__file__).resolve().parents[1] / "data"

ACTUALS_FILE = DATA_DIR / "actuals.csv"
FORECASTS_FILE = DATA_DIR / "forecasts.csv"


def load_actuals() -> pd.DataFrame:
    """Load actual wind generation and normalize its timestamps."""
    if not ACTUALS_FILE.exists():
        raise FileNotFoundError(f"Actuals file not found: {ACTUALS_FILE}")

    df = pd.read_csv(ACTUALS_FILE)

    required = {"startTime", "generation"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Actuals CSV is missing columns: {sorted(missing)}")

    if "fuelType" in df.columns:
        df = df[df["fuelType"].astype(str).str.upper() == "WIND"].copy()

    df["startTime"] = pd.to_datetime(df["startTime"], utc=True, errors="coerce")
    df["generation"] = pd.to_numeric(df["generation"], errors="coerce")

    df = df.dropna(subset=["startTime", "generation"])
    df = df.groupby("startTime", as_index=False)["generation"].mean()
    df = df.sort_values("startTime").reset_index(drop=True)

    return df.rename(columns={"generation": "actual"})


def load_forecasts() -> pd.DataFrame:
    """Load forecast records while preserving publication versions."""
    if not FORECASTS_FILE.exists():
        raise FileNotFoundError(f"Forecasts file not found: {FORECASTS_FILE}")

    df = pd.read_csv(FORECASTS_FILE)

    required = {"publishTime", "startTime", "generation"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Forecasts CSV is missing columns: {sorted(missing)}")

    df["publishTime"] = pd.to_datetime(
        df["publishTime"], utc=True, errors="coerce"
    )
    df["startTime"] = pd.to_datetime(
        df["startTime"], utc=True, errors="coerce"
    )
    df["generation"] = pd.to_numeric(df["generation"], errors="coerce")

    df = df.dropna(subset=["publishTime", "startTime", "generation"])
    df = df.sort_values(["publishTime", "startTime"]).reset_index(drop=True)

    return df.rename(columns={"generation": "forecast"})


def get_forecast_comparison(
    start_date: str | None = None,
    end_date: str | None = None,
    publish_time: str | None = None,
) -> pd.DataFrame:
    """Compare forecasts with actual generation for matching target times."""
    actuals = load_actuals()
    forecasts = load_forecasts()

    if start_date:
        start = pd.to_datetime(start_date, utc=True, errors="raise")
        actuals = actuals[actuals["startTime"] >= start]
        forecasts = forecasts[forecasts["startTime"] >= start]

    if end_date:
        end = pd.to_datetime(end_date, utc=True, errors="raise")
        actuals = actuals[actuals["startTime"] <= end]
        forecasts = forecasts[forecasts["startTime"] <= end]

    if publish_time:
        publication = pd.to_datetime(publish_time, utc=True, errors="raise")
        forecasts = forecasts[forecasts["publishTime"] == publication]

    comparison = forecasts.merge(actuals, on="startTime", how="inner")

    if comparison.empty:
        return comparison

    comparison["error"] = comparison["forecast"] - comparison["actual"]
    comparison["absoluteError"] = comparison["error"].abs()
    comparison["squaredError"] = comparison["error"] ** 2

    comparison["absolutePercentageError"] = np.where(
        comparison["actual"].abs() > 0,
        comparison["absoluteError"] / comparison["actual"].abs() * 100,
        np.nan,
    )

    return comparison.sort_values(
        ["startTime", "publishTime"]
    ).reset_index(drop=True)


def get_metrics(comparison: pd.DataFrame) -> dict:
    """Calculate standard forecast accuracy metrics."""
    if comparison.empty:
        return {
            "count": 0,
            "mae": None,
            "rmse": None,
            "mape": None,
            "bias": None,
        }

    errors = comparison["error"].dropna()

    if errors.empty:
        return {
            "count": 0,
            "mae": None,
            "rmse": None,
            "mape": None,
            "bias": None,
        }

    percentage_errors = comparison["absolutePercentageError"].dropna()

    return {
        "count": int(len(errors)),
        "mae": round(float(errors.abs().mean()), 2),
        "rmse": round(float(np.sqrt((errors ** 2).mean())), 2),
        "mape": (
            round(float(percentage_errors.mean()), 2)
            if not percentage_errors.empty
            else None
        ),
        "bias": round(float(errors.mean()), 2),
    }


def get_available_publications() -> list[str]:
    """Return the unique forecast publication timestamps."""
    forecasts = load_forecasts()
    return [
        timestamp.isoformat()
        for timestamp in forecasts["publishTime"].drop_duplicates().sort_values()
    ]
