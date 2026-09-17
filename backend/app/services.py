"""
Core garage business rules, kept independent of FastAPI/SQLAlchemy
plumbing so they're easy to read and unit-test in isolation.
"""
import math
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from . import models

# ---- Rate configuration -------------------------------------------------
# Tiered by design: the first hour costs more than each additional hour,
# and a daily cap means a long stay is never charged past a fixed ceiling.
FIRST_HOUR_RATE = 5.0
EXTRA_HOUR_RATE = 3.0
DAILY_CAP = 25.0
CURRENCY = "USD"


def calculate_fee(
    check_in: datetime,
    check_out: datetime,
    first_hour_rate: float = FIRST_HOUR_RATE,
    extra_hour_rate: float = EXTRA_HOUR_RATE,
    daily_cap: float = DAILY_CAP,
) -> float:
    """
    Tiered, capped fee for a completed stay.

    - Any part of an hour counts as a full hour (round up).
    - The first hour of *each* 24h day is priced at FIRST_HOUR_RATE,
      each additional hour in that day at EXTRA_HOUR_RATE.
    - No single 24h day is ever charged more than DAILY_CAP, so a
      long stay is protected from runaway charges.
    """
    if check_out <= check_in:
        raise ValueError("check_out must be after check_in")

    total_seconds = (check_out - check_in).total_seconds()
    total_hours = max(1, math.ceil(total_seconds / 3600))  # part-hours round up

    fee = 0.0
    hours_left = total_hours
    while hours_left > 0:
        chunk = min(hours_left, 24)  # one "day" of billing at a time
        day_fee = first_hour_rate + max(0, chunk - 1) * extra_hour_rate
        day_fee = min(day_fee, daily_cap)
        fee += day_fee
        hours_left -= chunk

    return round(fee, 2)


def find_available_spot(db: Session, spot_type: models.SpotType) -> models.Spot | None:
    """First free spot of the exact requested type (EV plates must land on
    an EV spot — we never substitute a different type)."""
    return (
        db.query(models.Spot)
        .filter(models.Spot.spot_type == spot_type, models.Spot.status == models.SpotStatus.available)
        .order_by(models.Spot.id)
        .first()
    )


def active_session_for_plate(db: Session, plate: str) -> models.ParkingSession | None:
    return (
        db.query(models.ParkingSession)
        .filter(models.ParkingSession.plate == plate.upper(), models.ParkingSession.is_active == True)  # noqa: E712
        .first()
    )


def rate_for_spot_type(db: Session, spot_type: models.SpotType) -> models.RateCard:
    rate = db.query(models.RateCard).filter(models.RateCard.spot_type == spot_type).first()
    if rate:
        return rate
    return models.RateCard(
        spot_type=spot_type,
        first_hour_rate=FIRST_HOUR_RATE,
        extra_hour_rate=EXTRA_HOUR_RATE,
        daily_cap=DAILY_CAP,
    )


def close_session(session: models.ParkingSession, at: datetime, rate: models.RateCard) -> None:
    session.check_out = at
    session.fee = calculate_fee(
        session.check_in,
        at,
        rate.first_hour_rate,
        rate.extra_hour_rate,
        rate.daily_cap,
    )
    session.is_active = False
    session.spot.status = models.SpotStatus.available


def auto_close_overdue_sessions(db: Session, at: datetime) -> list[models.ParkingSession]:
    cutoff = at - timedelta(hours=24)
    sessions = (
        db.query(models.ParkingSession)
        .filter(
            models.ParkingSession.is_active == True,  # noqa: E712
            models.ParkingSession.check_in < cutoff,
        )
        .all()
    )
    for session in sessions:
        close_session(session, at, rate_for_spot_type(db, session.spot.spot_type))
    return sessions
