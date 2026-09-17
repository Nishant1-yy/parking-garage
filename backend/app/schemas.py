from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

from .models import SpotType, SpotStatus


# ---------- Auth ----------
class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=128)


class UserOut(BaseModel):
    id: int
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Spots ----------
class SpotOut(BaseModel):
    id: int
    label: str
    level: int
    spot_type: SpotType
    has_charger: bool
    status: SpotStatus

    class Config:
        from_attributes = True


class SpotPage(BaseModel):
    items: List[SpotOut]
    total: int
    page: int
    page_size: int


class AvailabilityOut(BaseModel):
    spot_type: SpotType
    available: int
    total: int


# ---------- Sessions ----------
class CheckInRequest(BaseModel):
    plate: str = Field(min_length=1, max_length=20)
    spot_type: SpotType


class CheckOutRequest(BaseModel):
    plate: str = Field(min_length=1, max_length=20)


class SessionOut(BaseModel):
    id: int
    plate: str
    spot_id: int
    spot_label: str
    spot_type: SpotType
    check_in: datetime
    check_out: Optional[datetime]
    fee: Optional[float]
    is_active: bool

    class Config:
        from_attributes = True


class SessionPage(BaseModel):
    items: List[SessionOut]
    total: int
    page: int
    page_size: int


class RatesOut(BaseModel):
    first_hour_rate: float
    extra_hour_rate: float
    daily_cap: float
    currency: str
