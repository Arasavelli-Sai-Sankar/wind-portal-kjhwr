
import time
from pathlib import Path

import pandas as pd
import requests

API_URL = (
    "https://data.elexon.co.uk/bmrs/api/v1/"
    "forecast/generation/wind/history"
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "backend" / "data"
OUTPUT_FILE = DATA_DIR / "forecasts.csv"

DATA_DIR.mkdir(parents=True, exist_ok=True)

START_DATE = pd.Timestamp("2026-01-02")
END_DATE = pd.Timestamp("2026-02-01")

PUBLICATION_TIMES = [
    (3, 30),
    (5, 30),
    (8, 30),
    (10, 30),
    (12, 30),
    (16, 30),
    (19, 30),
    (23, 30),
]

all_records = []
session = requests.Session()

print("Downloading historical wind forecasts...")
print(f"Date range: {START_DATE.date()} to {END_DATE.date()}")

current_date = START_DATE

while current_date <= END_DATE:
    for hour, minute in PUBLICATION_TIMES:
        # The API parameter is a UTC timestamp.
        publish_time = (
            current_date
            + pd.Timedelta(hours=hour, minutes=minute)
        )

        timestamp = publish_time.strftime("%Y-%m-%dT%H:%M:%SZ")

        params = {
            "publishTime": timestamp,
            "format": "json",
        }

        try:
            response = session.get(
                API_URL,
                params=params,
                timeout=60,
            )

            if response.status_code == 200:
                payload = response.json()

                if isinstance(payload, dict):
                    records = payload.get("data", [])
                elif isinstance(payload, list):
                    records = payload
                else:
                    records = []

                all_records.extend(records)

                print(
                    f"{timestamp}: {len(records)} records"
                )

            else:
                print(
                    f"{timestamp}: HTTP {response.status_code}"
                )
                print(response.text[:300])

        except (requests.RequestException, ValueError) as error:
            print(f"Request failed for {timestamp}: {error}")

        time.sleep(0.2)

    current_date += pd.Timedelta(days=1)

if not all_records:
    raise SystemExit(
        "No forecast records were returned. "
        "Check the API responses and requested timestamps."
    )

df = pd.DataFrame(all_records)

# Keep the original publication and delivery timestamps.
expected_columns = [
    "publishTime",
    "startTime",
    "settlementDate",
    "settlementPeriod",
    "generation",
]

available_columns = [
    column for column in expected_columns
    if column in df.columns
]

if "publishTime" not in df.columns:
    raise SystemExit(
        f"Unexpected API response. Available columns: {list(df.columns)}"
    )

# Remove duplicate rows without collapsing different forecast publications.
df = df.drop_duplicates()

# Sort records by publication time and delivery time.
sort_columns = [
    column for column in ["publishTime", "startTime"]
    if column in df.columns
]

df = df.sort_values(sort_columns)

df.to_csv(OUTPUT_FILE, index=False)

print("\nFORECAST DOWNLOAD COMPLETED")
print("Saved to:", OUTPUT_FILE)
print("Total records:", len(df))
print("Columns:", list(df.columns))
print("\nFirst five rows:")
print(df.head().to_string(index=False))
