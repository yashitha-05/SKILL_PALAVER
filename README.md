# Data Quality Checker

A full-stack data quality checker application with React (Vite) frontend and Django backend. The project lets you upload CSV or Excel files, computes data quality metrics (completeness, uniqueness, type consistency), and provides an authenticated dashboard with charts, filters and an AI‑powered enhancement feature. Users can download corrected versions of their data and view a detailed report for each file.

## Features

- **Landing Page** – drag‑and‑drop or browse for a CSV/Excel file, or download a sample template.
- **Quality Score** – get an overall score and a breakdown of your checks (correct, warnings, errors, fatal).
- **Unlock Full Report** – authentication gives you access to a full report page for each dataset.
- **Dashboard** – after unlocking, the dashboard displays KPI cards, a gauge, charts and a dataset area. Select a dataset from the left column to see its details on the right; the report section lives next to the dataset list so you can always choose a file and immediately click “View report page”. Column‑level filters let you drill into specific values and regenerate the charts accordingly.
- **Enhance with AI** – optionally correct issues and missing values with a single click.
- **Download** – get the enhanced dataset as a CSV file.

## Tech Stack

- **Frontend**: React 18, Vite, React Router, Recharts, Axios
- **Backend**: Django 5, Django REST Framework, Pandas, OpenPyXL

## Setup

### Prerequisites

You need Python (3.11+ recommended) and Node.js (16+). Git is helpful for cloning the repo.

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

The API runs at `http://127.0.0.1:8000` by default. You can change the address/port with `python manage.py runserver <addr:port>` if necessary.

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173` (or the next available port if 5173 is in use) and proxies API requests to the backend. The exact port is printed to the terminal when you start `npm run dev`.

## Usage

1. Start the backend, then the frontend (see Setup above).
2. Open the URL shown by the Vite server in your browser (e.g. `http://localhost:5173`).
3. On the landing page upload a CSV/Excel file; the app will automatically compute a score.
4. To see the full report and dashboard, click **Unlock Full Report** and register or sign in. After logging in you'll be taken to the dashboard.
5. The dashboard header shows overall scores and offers filters; charts appear in the main area. Use the **Your datasets** panel at the bottom (or side on wide screens) to pick a file—its details and a **View report page** button will appear beside the list. Column filters let you drill down into subsets of the data with updated charts.
6. Optionally click **Enhance with AI** to generate a cleaned version of the dataset, then download it using the button that replaces the enhancement link.
7. You can revisit reports from the dashboard or via links in the results page.

> **Tip:** if the frontend server reports “port X is in use” it will increment and try the next port automatically; simply refresh the browser when it starts.

## Project Structure

The following tree shows the key folders and files. You don’t need to understand every file to run the project, but the organization may help you navigate the code.

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
