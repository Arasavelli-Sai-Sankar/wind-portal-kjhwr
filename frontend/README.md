# Wind Forecast Intelligence Portal

A full-stack renewable energy analytics application for analyzing wind generation, comparing forecasts against actual generation, and evaluating forecast accuracy.

## Live Application

**Dashboard:** https://wind-portal-kjhwr.onrender.com/

**API Documentation:** https://wind-portal-kjhwr.onrender.com/docs

**Health Check:** https://wind-portal-kjhwr.onrender.com/api/health

## Features

- Interactive wind generation analytics dashboard.
- Actual versus forecast generation comparison.
- Forecast publication selection.
- Date-based filtering.
- Forecast accuracy metrics, including MAE, RMSE, MAPE, and bias.
- Historical data exploration.
- REST API built with FastAPI.
- Interactive charts and visualizations using React.

## Technology Stack

### Frontend
- React
- Vite
- JavaScript
- Recharts
- HTML and CSS

### Backend
- Python
- FastAPI
- Pandas
- NumPy

### Deployment
- Docker
- Render
- GitHub

## Project Structure

```text
wind-portal-kjhwr/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   └── analysis.py
│   ├── data/
│   │   ├── actuals.csv
│   │   └── forecasts.csv
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
├── Dockerfile
├── .gitignore
└── README.md
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `/api/health` | Health check |
| `/api/summary` | Summary statistics |
| `/api/actuals` | Actual generation data |
| `/api/forecasts` | Forecast generation data |
| `/api/publications` | Available forecast publications |
| `/api/metrics` | Forecast accuracy metrics |
| `/api/comparison` | Forecast versus actual comparison |
| `/docs` | Interactive API documentation |

## Running Locally

### Prerequisites
- Python 3.11 or compatible version
- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Arasavelli-Sai-Sankar/wind-portal-kjhwr.git
cd wind-portal-kjhwr
```

### 2. Start the backend

Create and activate a virtual environment, then install the Python dependencies.

On Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

### 3. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local frontend URL printed by Vite in your terminal.

## Forecast Accuracy Metrics

The application evaluates forecast performance using:

- **MAE:** Mean Absolute Error.
- **RMSE:** Root Mean Squared Error.
- **MAPE:** Mean Absolute Percentage Error.
- **Bias:** Average signed forecast error.

These metrics help users understand forecast deviations and whether forecasts tend to overestimate or underestimate actual generation.

## Deployment

The application is containerized with Docker and deployed on Render.

Live URL: https://wind-portal-kjhwr.onrender.com/

## AI Tools Disclosure

AI tools were used to assist with code development, debugging, implementation guidance, and documentation. The resulting application was tested during development.

## Author

Developed as a full-stack software engineering challenge project.