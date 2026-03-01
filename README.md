# Data Quality Checker

A full-stack data quality checker application with React (Vite) frontend and Django backend. Upload CSV or Excel files, view quality scores, unlock full reports with authentication, and enhance data with AI-powered corrections.

## Features

- **Landing Page**: Upload your data or use a sample template
- **Quality Score**: View completeness, uniqueness, and type consistency metrics
- **Unlock Full Report**: Sign in/sign up to access detailed reports
- **Dashboard**: KPIs, gauge, bar charts, donut chart, error breakdown (correct, warnings, errors, fatal)
- **Enhance with AI**: Fix missing values, remove duplicates, improve data quality
- **Download**: Export the corrected dataset

## Tech Stack

- **Frontend**: React 18, Vite, React Router, Recharts, Axios
- **Backend**: Django 5, Django REST Framework, Pandas, OpenPyXL

## Setup

### Backend (Django)

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# or: source venv/bin/activate   # Linux/Mac
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The API runs at `http://127.0.0.1:8000`.

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173` and proxies API requests to the backend.

## Usage

1. Open `http://localhost:5173`
2. Upload a CSV or Excel file, or choose a sample template
3. View your data quality score and category breakdown
4. Click **Unlock Full Report** to sign in or create an account
5. After authentication, access the dashboard and use **Enhance with AI** to fix issues
6. Download the corrected file

## Project Structure

```
data-quality-saas-pro/
├── backend/
│   ├── dqchecker/          # Django project settings
│   ├── quality/            # Data quality app (models, views, utils)
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api.js          # API client
│   │   ├── context/        # Auth context
│   │   ├── pages/          # Landing, Results, SignIn, SignUp, Dashboard
│   │   └── App.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Creating a Zip

To create a zip of the project (excluding `node_modules`, `venv`, `__pycache__`, `.git`):

**Windows (PowerShell):**
```powershell
Compress-Archive -Path backend, frontend, README.md -DestinationPath data-quality-checker.zip
```

**Or manually:** Exclude `node_modules`, `venv`, `__pycache__`, and `.git` before zipping.
