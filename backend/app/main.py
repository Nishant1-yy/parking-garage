from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import models, schemas, services
from .database import engine, get_db, Base
from .seed import seed_spots
from .routers import auth as auth_router
from .routers import spots as spots_router
from .routers import sessions as sessions_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Parking Garage API",
    description="Check-in / check-out, tiered fees, spot types & live availability for a busy multi-level garage.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo-friendly; tighten to the frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(spots_router.router)
app.include_router(sessions_router.router)


@app.on_event("startup")
def on_startup():
    db = next(get_db())
    seed_spots(db)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/rates", response_model=schemas.RatesOut)
def rates():
    return {
        "first_hour_rate": services.FIRST_HOUR_RATE,
        "extra_hour_rate": services.EXTRA_HOUR_RATE,
        "daily_cap": services.DAILY_CAP,
        "currency": services.CURRENCY,
    }
