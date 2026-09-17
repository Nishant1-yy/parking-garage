from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session

from .. import models, schemas, auth, services
from ..database import get_db

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def _to_session_out(s: models.ParkingSession) -> dict:
    return {
        "id": s.id,
        "plate": s.plate,
        "spot_id": s.spot_id,
        "spot_label": s.spot.label,
        "spot_type": s.spot.spot_type,
        "check_in": s.check_in,
        "check_out": s.check_out,
        "fee": s.fee,
        "is_active": s.is_active,
    }


@router.post("/check-in", response_model=schemas.SessionOut, status_code=201)
def check_in(
    payload: schemas.CheckInRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    plate = payload.plate.strip().upper()

    if services.active_session_for_plate(db, plate):
        raise HTTPException(status_code=400, detail=f"{plate} is already checked in")

    spot = services.find_available_spot(db, payload.spot_type)
    if not spot:
        raise HTTPException(
            status_code=409,
            detail=f"No available {payload.spot_type.value} spot — the garage is full for that type",
        )

    spot.status = models.SpotStatus.occupied
    session = models.ParkingSession(plate=plate, spot_id=spot.id, check_in=datetime.utcnow())
    db.add(session)
    db.commit()
    db.refresh(session)
    return _to_session_out(session)


@router.post("/check-out", response_model=schemas.SessionOut)
def check_out(
    payload: schemas.CheckOutRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    plate = payload.plate.strip().upper()
    session = services.active_session_for_plate(db, plate)
    if not session:
        raise HTTPException(status_code=404, detail=f"No active session found for plate {plate}")

    session.check_out = datetime.utcnow()
    services.close_session(session, session.check_out, services.rate_for_spot_type(db, session.spot.spot_type))

    db.commit()
    db.refresh(session)
    return _to_session_out(session)


@router.post("/transfer", response_model=schemas.SessionOut)
def transfer(
    payload: schemas.TransferRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    old_plate = payload.plate.strip().upper()
    new_plate = payload.new_plate.strip().upper()
    session = services.active_session_for_plate(db, old_plate)
    if not session:
        raise HTTPException(status_code=404, detail=f"No active session found for plate {old_plate}")
    if old_plate == new_plate:
        raise HTTPException(status_code=400, detail="The new plate must be different")
    if services.active_session_for_plate(db, new_plate):
        raise HTTPException(status_code=400, detail=f"{new_plate} is already checked in")
    session.plate = new_plate
    db.commit()
    db.refresh(session)
    return _to_session_out(session)


@router.get("", response_model=schemas.SessionPage)
def list_sessions(
    search: Optional[str] = Query(None, description="Search by plate, e.g. 'KA01'"),
    active_only: Optional[bool] = Query(None),
    sort_by: str = Query("check_in", description="check_in | check_out | fee | plate"),
    order: str = Query("desc", description="asc | desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """The end-of-day log — how the attendant hunts down a car by its
    plate, and how a shift's activity gets reviewed, sorted, and paged."""
    q = db.query(models.ParkingSession)
    if search:
        q = q.filter(models.ParkingSession.plate.ilike(f"%{search.strip().upper()}%"))
    if active_only is not None:
        q = q.filter(models.ParkingSession.is_active == active_only)

    total = q.count()

    sort_map = {
        "check_in": models.ParkingSession.check_in,
        "check_out": models.ParkingSession.check_out,
        "fee": models.ParkingSession.fee,
        "plate": models.ParkingSession.plate,
    }
    sort_col = sort_map.get(sort_by, models.ParkingSession.check_in)
    q = q.order_by(desc(sort_col) if order == "desc" else asc(sort_col))

    rows = q.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [_to_session_out(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{session_id}", response_model=schemas.SessionOut)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    session = db.query(models.ParkingSession).filter(models.ParkingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return _to_session_out(session)
