# Gantry — Parking Garage Control

A full-stack tool for the attendant of a busy multi-level city-centre garage:
check a car in, check it out with the fee worked out automatically, see which
spot types are free right now, and find any car by its plate.

- **Backend:** Python, FastAPI, SQLAlchemy, SQLite, JWT auth
- **Frontend:** React (Vite), react-router-dom, plain CSS (no UI framework)

## Project layout

```
backend/
  app/
    main.py        FastAPI app, CORS, startup seeding
    models.py       SQLAlchemy models: User, Spot, ParkingSession
    schemas.py      Pydantic request/response models, including twist payloads
    services.py     Fee calculation + spot-assignment business logic
    auth.py         Password hashing + JWT
    seed.py         Seeds the garage with spots on first run
    routers/
      auth.py       /api/auth/*
      spots.py      /api/spots*
      sessions.py   /api/sessions*
  requirements.txt
frontend/
  src/
    pages/          Landing, Login, Register, Dashboard, Sessions
    components/      Navbar, ProtectedRoute
    context/        AuthContext (token + current user)
    api.js          fetch wrapper for the backend
  package.json
```

## Setup & run (GitHub Codespaces)

This repo includes a `.devcontainer/devcontainer.json`, so opening it in a
Codespace installs Python + Node automatically and runs
`pip install -r backend/requirements.txt` and `npm install` for you.

Then, in two terminals:

```bash
# Terminal 1 — backend (http://localhost:8000)
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev
```

Codespaces will prompt you to open the forwarded port 5173 in the browser —
that's the app. The Vite dev server proxies `/api/*` calls straight through
to the backend on port 8000 (see `frontend/vite.config.js`), so no CORS
configuration is needed in dev.

On first backend startup, the garage is auto-seeded with 3 levels of
compact/standard/EV spots (see `backend/app/seed.py`) so there's data to
work with immediately — no manual seeding step.

### Setup & run (local machine, without Codespaces)

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend, in a second terminal
cd frontend
npm install
npm run dev
```

Interactive API docs are available at `http://localhost:8000/docs` once the
backend is running (FastAPI's built-in Swagger UI) — useful for exercising
endpoints directly while debugging.

## Debugging notes

- Backend errors show a stack trace in the `uvicorn` terminal and a JSON
  `{"detail": "..."}` body in the response; the frontend surfaces that
  `detail` message directly in its red error banners.
- If the frontend can't reach the API, first check the backend terminal is
  still running on port 8000 and that `vite.config.js`'s proxy target
  matches it.
- The SQLite file lives at `backend/garage.db`. Delete it and restart the
  backend to reset the garage to a freshly-seeded state.
- `GET /api/health` is a plain liveness check for the backend.

## API endpoints

All endpoints except register/login/health require a `Bearer <token>`
header, obtained from `/api/auth/login`.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an attendant account (`username`, `password`) |
| POST | `/api/auth/login` | Log in (OAuth2 password form) → JWT access token |
| GET | `/api/auth/me` | Current logged-in user |
| GET | `/api/rates` | Current fee configuration, including rates by spot type |
| POST | `/api/rates/import` | Upload a messy text/CSV rate card; valid spot-type rows are cleaned and stored |
| GET | `/api/spots` | Paginated, searchable, sortable, filterable list of spots (`search`, `spot_type`, `status`, `sort_by`, `order`, `page`, `page_size`) |
| GET | `/api/spots/availability` | Free/total spot counts per spot type |
| POST | `/api/sessions/check-in` | Check a car in (`plate`, `spot_type`) — assigns the first free matching spot |
| POST | `/api/sessions/check-out` | Check a car out by `plate` — computes and returns the fee, frees the spot |
| POST | `/api/sessions/transfer` | Transfer an open session from `plate` to `new_plate`, preserving spot and entry time |
| POST | `/api/clock` | Auto-close and bill active sessions parked for more than 24 hours |
| GET | `/api/sessions` | Paginated, searchable (by plate), sortable session log (`search`, `active_only`, `sort_by`, `order`, `page`, `page_size`) |
| GET | `/api/sessions/{id}` | A single session by id |

### Twist workflows

The dashboard exposes all three workflows. They can also be exercised from
the API docs at `http://localhost:8000/docs` after logging in.

#### Level 1 — messy rate-card import

Upload a text or CSV file to `/api/rates/import` using the `file` form field.
Rows containing `compact`, `standard`, or `ev` and three numeric values are
accepted as first-hour rate, extra-hour rate, and daily cap. Other junk rows
are ignored. For example:

```text
compact,5,3,25
standard first hour $6 extra $4 cap $30
ev | 8 | 5 | 40
this footer is ignored
```

Check-out pricing uses the imported rates for the session's spot type.

#### Level 2 — nightly automation

Call `POST /api/clock` to close every active session whose entry time is more
than 24 hours before the clock time. It returns the number of sessions closed
and their completed billing records. For deterministic testing, an optional
ISO timestamp can be supplied:

```json
{"now": "2026-09-17T23:00:00"}
```

#### Level 3 — plate transfer

Call `POST /api/sessions/transfer` with the old and new plates:

```json
{"plate": "RJ14 AB1234", "new_plate": "RJ14 XY5678"}
```

Only the plate changes. The open session keeps its spot and original entry
time, and the new plate cannot already have an active session.

## Fee rules

- First hour: $5. Each additional hour: $3. Any part of an hour rounds up
  to a full hour.
- No single 24-hour day is ever charged more than a $25 daily cap.
- Multi-day stays are billed day-by-day using the rule above, so a week-long
  stay is never punitive — see `backend/app/services.py::calculate_fee`.

## Spot types

Every spot is `compact`, `standard`, or `ev` (EV spots include a charger).
Check-in always assigns a spot of the exact type requested, so an EV is
never routed to a spot without a charger, and never "borrows" a standard
spot even if one is free.
