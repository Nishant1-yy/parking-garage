"""Populate the garage with spots across 3 levels if the table is empty.
Runs automatically on startup (see main.py) so a fresh clone is usable
immediately — no manual seeding step for the attendant."""
from sqlalchemy.orm import Session

from . import models

LEVELS = 3
COMPACT_PER_LEVEL = 8
STANDARD_PER_LEVEL = 10
EV_PER_LEVEL = 3


def seed_spots(db: Session) -> None:
    if db.query(models.Spot).first():
        return  # already seeded

    spots = []
    for level in range(1, LEVELS + 1):
        for i in range(1, COMPACT_PER_LEVEL + 1):
            spots.append(models.Spot(
                label=f"L{level}-C-{i:02d}", level=level,
                spot_type=models.SpotType.compact, has_charger=False,
            ))
        for i in range(1, STANDARD_PER_LEVEL + 1):
            spots.append(models.Spot(
                label=f"L{level}-S-{i:02d}", level=level,
                spot_type=models.SpotType.standard, has_charger=False,
            ))
        for i in range(1, EV_PER_LEVEL + 1):
            spots.append(models.Spot(
                label=f"L{level}-E-{i:02d}", level=level,
                spot_type=models.SpotType.ev, has_charger=True,
            ))

    db.add_all(spots)
    db.commit()


def seed_rates(db: Session) -> None:
    if db.query(models.RateCard).first():
        return
    db.add_all([
        models.RateCard(
            spot_type=spot_type,
            first_hour_rate=5.0,
            extra_hour_rate=3.0,
            daily_cap=25.0,
        )
        for spot_type in models.SpotType
    ])
    db.commit()
