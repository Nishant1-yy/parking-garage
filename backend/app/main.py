from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import models, schemas, services
from .database import engine, get_db, Base
from .seed import seed_spots, seed_rates
from . import auth
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
    seed_rates(db)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/rates")
def rates(db: Session = Depends(get_db)):
    cards = db.query(models.RateCard).order_by(models.RateCard.spot_type).all()
    if not cards:
        cards = [
            models.RateCard(
                spot_type=spot_type,
                first_hour_rate=services.FIRST_HOUR_RATE,
                extra_hour_rate=services.EXTRA_HOUR_RATE,
                daily_cap=services.DAILY_CAP,
            )
            for spot_type in models.SpotType
        ]
    return {
        "first_hour_rate": cards[0].first_hour_rate,
        "extra_hour_rate": cards[0].extra_hour_rate,
        "daily_cap": cards[0].daily_cap,
        "currency": services.CURRENCY,
        "rates": [schemas.RateCardOut.model_validate(card) for card in cards],
    }


@app.post("/api/rates/import")
def import_rates(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Import the valid rate rows from a rate card and ignore junk lines."""
    import re

    text = file.file.read().decode("utf-8", errors="replace")
    parsed = {}
    for line in text.splitlines():
        lowered = line.lower()
        spot_type = next((value for value in models.SpotType if value.value in lowered), None)
        numbers = [float(value.replace("$", "")) for value in re.findall(r"(?<![a-z])\$?\d+(?:\.\d+)?", lowered)]
        if spot_type and len(numbers) >= 3:
            parsed[spot_type] = numbers[-3:]
    if not parsed:
        raise HTTPException(status_code=422, detail="No valid rate rows found in the uploaded card")

    for spot_type, values in parsed.items():
        card = db.query(models.RateCard).filter(models.RateCard.spot_type == spot_type).first()
        if not card:
            card = models.RateCard(spot_type=spot_type)
            db.add(card)
        card.first_hour_rate, card.extra_hour_rate, card.daily_cap = values
    db.commit()
    return {"imported": len(parsed), "rates": [schemas.RateCardOut.model_validate(card) for card in db.query(models.RateCard).all()]}


@app.post("/api/clock")
def clock(
    payload: schemas.ClockRequest = schemas.ClockRequest(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    closed = services.auto_close_overdue_sessions(db, payload.now or datetime.utcnow())
    db.commit()
    return {"closed": len(closed), "sessions": [sessions_router._to_session_out(session) for session in closed]}
