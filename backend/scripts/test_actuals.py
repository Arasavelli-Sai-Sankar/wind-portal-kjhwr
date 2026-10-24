
import requests

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH"

params = {
    "settlementDateFrom": "2026-01-02",
    "settlementDateTo": "2026-01-03",
    "fuelType": "WIND",
    "format": "json",
}

try:
    response = requests.get(BASE_URL, params=params, timeout=30)

    print("Request URL:", response.url)
    print("Status code:", response.status_code)

    response.raise_for_status()
    result = response.json()

    if isinstance(result, dict):
        records = result.get("data", [])
    elif isinstance(result, list):
        records = result
    else:
        records = []

    print("Records returned:", len(records))

    if records:
        print("Available fields:", list(records[0].keys()))
        print("First record:", records[0])
    else:
        print("No records returned. Check the API response.")

except requests.RequestException as error:
    print("API request failed:", error)

except ValueError as error:
    print("Could not parse the API response:", error)
