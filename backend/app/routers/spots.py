from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/spots", tags=["spots"])

SORTABLE_FIELDS = {
    "label": models.Spot.label,
    "level": models.Spot.level,
    "spot_type": models.Spot.spot_type,
    "status": models.Spot.status,
}


@router.get("", response_model=schemas.SpotPage)
def list_spots(
    search: Optional[str] = Query(None, description="Search by spot label, e.g. 'L2-C'"),
    spot_type: Optional[models.SpotType] = None,
    status: Optional[models.SpotStatus] = None,
    sort_by: str = Query("label", description="label | level | spot_type | status"),
    order: str = Query("asc", description="asc | desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Every car in the garage occupies one of these; this is the
    attendant's live floor view. Filterable by type/status, searchable
    by label, sortable, and paginated for a large garage."""
    q = db.query(models.Spot)
    if search:
        q = q.filter(models.Spot.label.ilike(f"%{search}%"))
    if spot_type:
        q = q.filter(models.Spot.spot_type == spot_type)
    if status:
        q = q.filter(models.Spot.status == status)

    total = q.count()

    sort_col = SORTABLE_FIELDS.get(sort_by, models.Spot.label)
    q = q.order_by(desc(sort_col) if order == "desc" else asc(sort_col))

    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/availability", response_model=List[schemas.AvailabilityOut])
def availability(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Answers 'is an EV spot free right now?' at a glance, per type."""
    results = []
    for spot_type in models.SpotType:
        total = db.query(models.Spot).filter(models.Spot.spot_type == spot_type).count()
        free = (
            db.query(models.Spot)
            .filter(models.Spot.spot_type == spot_type, models.Spot.status == models.SpotStatus.available)
            .count()
        )
        results.append({"spot_type": spot_type, "available": free, "total": total})
    return results
