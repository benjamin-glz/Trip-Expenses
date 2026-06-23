from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import date


class Trip(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    daily_budget: float  # in EUR
    currency: str = "EUR"


class Expense(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: int = Field(foreign_key="trip.id")

    amount: Optional[float] = None
    amount_in_home_currency: Optional[float] = None
    category: Optional[str] = None
    conversion_rate: Optional[float] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    date_paid: Optional[str] = None
    home_currency: Optional[str] = None
    local_currency: Optional[str] = None
    notes: Optional[str] = None
    paid_by: Optional[str] = None
    paid_for: Optional[str] = None
    payment_method: Optional[str] = None
    place: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    type: Optional[str] = None
    number_of_days: Optional[float] = None
    exclude_from_avg: Optional[bool] = None
    add_to_budget: Optional[bool] = None
    category_icon: Optional[str] = None
    category_color: Optional[str] = None
    payment_method_icon: Optional[str] = None
    payment_method_color: Optional[str] = None