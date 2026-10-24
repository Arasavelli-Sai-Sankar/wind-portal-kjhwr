
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.analysis import (
    get_available_publications,
    get_forecast_comparison,
    get_metrics,
    load_actuals,
    load_forecasts,
)

app = FastAPI(
    title="Wind Forecast Intelligence Portal",
    version="1.0.0",
    description="API for wind generation forecasts, actuals, and forecast accuracy.",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Health endpoint
# --------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "healthy"}


# --------------------------------------------------
# Summary endpoint
# --------------------------------------------------
@app.get("/api/summary")
def summary():
    try:
        actuals = load_actuals()
        forecasts = load_forecasts()
        comparison = get_forecast_comparison()

        return {
            "actual_records": len(actuals),
            "forecast_records": len(forecasts),
            "matched_comparisons": len(comparison),
            "metrics": get_metrics(comparison),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# --------------------------------------------------
# Actual generation data
# --------------------------------------------------
@app.get("/api/actuals")
def actuals(
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
):
    try:
        df = load_actuals()

        if start_date:
            start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            df = df[df["startTime"] >= start]

        if end_date:
            end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            df = df[df["startTime"] <= end]

        df["startTime"] = df["startTime"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        return {
            "count": len(df),
            "data": df.to_dict(orient="records"),
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid date: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# --------------------------------------------------
# Forecast data
# --------------------------------------------------
@app.get("/api/forecasts")
def forecasts(
    publish_time: str | None = Query(default=None),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
):
    try:
        df = load_forecasts()

        if publish_time:
            publication = datetime.fromisoformat(
                publish_time.replace("Z", "+00:00")
            )
            df = df[df["publishTime"] == publication]

        if start_date:
            start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            df = df[df["startTime"] >= start]

        if end_date:
            end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            df = df[df["startTime"] <= end]

        df["publishTime"] = df["publishTime"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        df["startTime"] = df["startTime"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        return {
            "count": len(df),
            "data": df.to_dict(orient="records"),
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid date: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# --------------------------------------------------
# Available forecast publications
# --------------------------------------------------
@app.get("/api/publications")
def publications():
    try:
        return {"data": get_available_publications()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# --------------------------------------------------
# Forecast accuracy metrics
# --------------------------------------------------
@app.get("/api/metrics")
def metrics(
    publish_time: str | None = Query(default=None),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
):
    try:
        comparison = get_forecast_comparison(
            start_date=start_date,
            end_date=end_date,
            publish_time=publish_time,
        )

        return {
            "metrics": get_metrics(comparison),
            "count": len(comparison),
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid date: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# --------------------------------------------------
# Forecast versus actual comparison
# --------------------------------------------------
@app.get("/api/comparison")
def comparison(
    publish_time: str | None = Query(default=None),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
):
    try:
        df = get_forecast_comparison(
            start_date=start_date,
            end_date=end_date,
            publish_time=publish_time,
        )

        df["publishTime"] = df["publishTime"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        df["startTime"] = df["startTime"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        return {
            "count": len(df),
            "data": df.to_dict(orient="records"),
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid date: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# --------------------------------------------------
# Serve the React frontend
# --------------------------------------------------
# main.py is located at backend/app/main.py.
# parents[0] = backend/app
# parents[1] = backend
# parents[2] = project root (/app in Docker)
PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

if FRONTEND_DIST.is_dir():
    # Mount the built React app at the root.
    # Keep this AFTER all /api routes.
    app.mount(
        "/",
        StaticFiles(directory=str(FRONTEND_DIST), html=True),
        name="frontend",
    )
else:
    # Fallback for environments where the frontend hasn't been built.
    @app.get("/")
    def home():
        return {
            "message": "Wind Forecast Intelligence Portal",
            "docs": "/docs",
            "health": "/api/health",
            "frontend_status": "Frontend build not found",
        }
