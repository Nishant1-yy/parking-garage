import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Enum
)
from sqlalchemy.orm import relationship

from .database import Base


class SpotType(str, enum.Enum):
    compact = "compact"
    standard = "standard"
    ev = "ev"


class SpotStatus(str, enum.Enum):
    available = "available"
    occupied = "occupied"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Spot(Base):
    __tablename__ = "spots"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, unique=True, nullable=False)  # e.g. "L2-C-014"
    level = Column(Integer, nullable=False, default=1)
    spot_type = Column(Enum(SpotType), nullable=False, index=True)
    has_charger = Column(Boolean, default=False)
    status = Column(Enum(SpotStatus), nullable=False, default=SpotStatus.available, index=True)

    sessions = relationship("ParkingSession", back_populates="spot")


class ParkingSession(Base):
    """One check-in/check-out cycle for a single vehicle."""
    __tablename__ = "parking_sessions"

    id = Column(Integer, primary_key=True, index=True)
    plate = Column(String, index=True, nullable=False)
    spot_id = Column(Integer, ForeignKey("spots.id"), nullable=False)
    check_in = Column(DateTime, nullable=False, default=datetime.utcnow)
    check_out = Column(DateTime, nullable=True)
    fee = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True, index=True)

    spot = relationship("Spot", back_populates="sessions")
