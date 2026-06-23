from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlmodel import Session
from typing import List

from app.database import create_db, get_session
from app.models import Trip, Expense
from app import crud, csv_parser

app = FastAPI(title="Trip Expenses")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


@app.on_event("startup")
def on_startup():
    create_db()


# ── UI ──────────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


# ── Trips API ───────────────────────────────────────────────────────────────────

@app.get("/api/trips")
def api_list_trips(session: Session = Depends(get_session)):
    trips = crud.list_trips(session)
    return [{"id": t.id, "name": t.name, "daily_budget": t.daily_budget} for t in trips]


@app.post("/api/trips")
async def api_create_trip(
    name: str = Form(...),
    daily_budget: float = Form(...),
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    trip = crud.create_trip(session, name=name, daily_budget=daily_budget)
    content = await file.read()
    rows = csv_parser.parse_csv(content)
    count = crud.bulk_create_expenses(session, trip.id, rows)
    return {"id": trip.id, "name": trip.name, "daily_budget": trip.daily_budget, "expenses_imported": count}


@app.delete("/api/trips/{trip_id}")
def api_delete_trip(trip_id: int, session: Session = Depends(get_session)):
    ok = crud.delete_trip(session, trip_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {"deleted": trip_id}


# ── Analytics API ───────────────────────────────────────────────────────────────

@app.get("/api/trips/{trip_id}/analytics")
def api_analytics(trip_id: int, session: Session = Depends(get_session)):
    trip = crud.get_trip(session, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    expenses = crud.get_expenses(session, trip_id)
    analytics = crud.compute_analytics(expenses, trip.daily_budget)
    analytics["trip"] = {"id": trip.id, "name": trip.name, "daily_budget": trip.daily_budget}
    return analytics


@app.get("/api/trips/{trip_id}/expenses")
def api_expenses(trip_id: int, session: Session = Depends(get_session)):
    expenses = crud.get_expenses(session, trip_id)
    return [
        {
            "date": e.date_paid,
            "category": e.category,
            "amount": e.amount_in_home_currency,
            "place": e.place,
            "country": e.country,
            "notes": e.notes,
            "payment_method": e.payment_method,
        }
        for e in expenses
    ]