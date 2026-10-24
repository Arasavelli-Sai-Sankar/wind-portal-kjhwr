
import io
import time
from pathlib import Path

import pandas as pd
import requests

API_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH"

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "backend" / "data"
OUTPUT_FILE = DATA_DIR / "actuals.csv"

DATA_DIR.mkdir(parents=True, exist_ok=True)

# Requested delivery period.
START_DATE = pd.Timestamp("2026-01-02")
END_DATE = pd.Timestamp("2026-02-01")

# Elexon allows a maximum of 7 days inclusive per request.
BATCH_DAYS = 7

session = requests.Session()
all_data = []

current_date = START_DATE

print("Downloading actual wind generation from Elexon...")
print(f"Requested period: {START_DATE.date()} to {END_DATE.date()}")

while current_date <= END_DATE:
    batch_end = min(
        current_date + pd.Timedelta(days=BATCH_DAYS - 1),
        END_DATE,
    )

    params = {
        "settlementDateFrom": current_date.strftime("%Y-%m-%d"),
        "settlementDateTo": batch_end.strftime("%Y-%m-%d"),
        "fuelType": "WIND",
        "format": "json",
    }

    print(f"\nDownloading {current_date.date()} to {batch_end.date()}")

    try:
        response = session.get(
            API_URL,
            params=params,
            timeout=60,
        )

        print("HTTP status:", response.status_code)
        response.raise_for_status()

        payload = response.json()

        if isinstance(payload, dict):
            records = payload.get("data", [])
        elif isinstance(payload, list):
            records = payload
        else:
            records = []

        print("Records received:", len(records))
        all_data.extend(records)

    except (requests.RequestException, ValueError) as error:
        raise SystemExit(
            f"Download failed for {current_date.date()} "
            f"to {batch_end.date()}: {error}"
        )

    current_date = batch_end + pd.Timedelta(days=1)
    time.sleep(0.3)

if not all_data:
    raise SystemExit(
        "No records were returned. Check the API response and requested dates."
    )

df = pd.DataFrame(all_data)

# Verify that the API returned the expected columns.
required_columns = {
    "settlementDate",
    "settlementPeriod",
    "fuelType",
    "generation",
}

missing_columns = required_columns - set(df.columns)

if missing_columns:
    raise SystemExit(
        f"Unexpected API response. Missing columns: {missing_columns}\n"
        f"Available columns: {list(df.columns)}"
    )

# Keep wind records and remove duplicate settlement observations.
df = df[df["fuelType"].astype(str).str.upper() == "WIND"].copy()

df["settlementDate"] = pd.to_datetime(
    df["settlementDate"],
    errors="coerce",
)

df["generation"] = pd.to_numeric(
    df["generation"],
    errors="coerce",
)

df = df.dropna(
    subset=["settlementDate", "settlementPeriod", "generation"]
)

df = df.drop_duplicates(
    subset=["settlementDate", "settlementPeriod", "fuelType"]
)

df = df.sort_values(
    ["settlementDate", "settlementPeriod"]
)

df.to_csv(OUTPUT_FILE, index=False)

print("\nDOWNLOAD COMPLETED")
print("Saved to:", OUTPUT_FILE)
print("Total records:", len(df))
print("Date range:", df["settlementDate"].min(), "to", df["settlementDate"].max())
print("\nColumns:", list(df.columns))
print("\nFirst five records:")
print(df.head().to_string(index=False))
