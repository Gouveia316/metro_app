# Lisbon Metro App

Mobile-first MVP foundation for a Lisbon metro app.

The product will eventually show metro lines, stations, next train arrivals, service status, alerts, and favorite stations. This initial version uses mocked/static data and avoids authentication, databases, payments, push notifications, NFC, and external API integrations.

## Stack

- Mobile: React Native, Expo, TypeScript, Expo Router
- Backend: Python, FastAPI
- Docs: product scope and roadmap in `/docs`

## Repository Structure

```text
.
├── backend
│   ├── main.py
│   └── requirements.txt
├── docs
│   ├── MVP_SCOPE.md
│   └── ROADMAP.md
└── mobile
    ├── app
    ├── src
    ├── app.json
    ├── babel.config.js
    ├── package.json
    └── tsconfig.json
```

## Run The Backend

From the repository root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

On Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend will be available at `http://127.0.0.1:8000`.

Useful endpoints:

- `GET /health`
- `GET /lines`
- `GET /stations`
- `GET /stations/{station_id}/arrivals`
- `GET /alerts`

## Run The Mobile App

Expo SDK 54 requires Node.js 20.19 or newer.

From the repository root:

```bash
cd mobile
npm install
npm run start
```

Then open the app in Expo Go, an emulator, or a simulator.

## Current Data Model

The backend and mobile app both use static mocked data for now. Real service status, arrivals, alerts, and station metadata should be connected later through official or approved data sources.
