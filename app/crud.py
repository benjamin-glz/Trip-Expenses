from sqlmodel import Session, select
from app.models import Trip, Expense
from typing import List, Optional, Dict, Any


# ── Trips ──────────────────────────────────────────────────────────────────────

def create_trip(session: Session, name: str, daily_budget: float) -> Trip:
    trip = Trip(name=name, daily_budget=daily_budget)
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return trip


def list_trips(session: Session) -> List[Trip]:
    return session.exec(select(Trip)).all()


def get_trip(session: Session, trip_id: int) -> Optional[Trip]:
    return session.get(Trip, trip_id)


def delete_trip(session: Session, trip_id: int) -> bool:
    trip = session.get(Trip, trip_id)
    if not trip:
        return False
    # Delete expenses first
    expenses = session.exec(select(Expense).where(Expense.trip_id == trip_id)).all()
    for e in expenses:
        session.delete(e)
    session.delete(trip)
    session.commit()
    return True


# ── Expenses ───────────────────────────────────────────────────────────────────

def bulk_create_expenses(session: Session, trip_id: int, rows: List[Dict[str, Any]]) -> int:
    for row in rows:
        expense = Expense(trip_id=trip_id, **row)
        session.add(expense)
    session.commit()
    return len(rows)


def get_expenses(session: Session, trip_id: int) -> List[Expense]:
    return session.exec(select(Expense).where(Expense.trip_id == trip_id)).all()


# ── Analytics ──────────────────────────────────────────────────────────────────

def compute_analytics(expenses: List[Expense], daily_budget: float) -> Dict[str, Any]:
    """
    Returns:
      - daily_chart: {labels, actual, planned}   (actual € per day vs flat planned budget)
      - category_chart: {labels, amounts}         (spending % per category, pie)
      - summary: misc KPIs
    """
    from collections import defaultdict
    from datetime import datetime

    daily: Dict[str, float] = defaultdict(float)
    category_totals: Dict[str, float] = defaultdict(float)
    category_appearance: Dict[str, int] = defaultdict(int)
    averages: Dict[str, float] = defaultdict(float)
    percentages: Dict[str, float] = defaultdict(float)

    total_home = 0.0

    for exp in expenses:
        if exp.exclude_from_avg:
            continue

        home_amount = exp.amount_in_home_currency or 0.0

        # Daily breakdown
        date_str = exp.date_paid
        if date_str:
            # Normalise date to YYYY-MM-DD
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"):
                try:
                    dt = datetime.strptime(date_str[:10], fmt)
                    date_str = dt.strftime("%Y-%m-%d")
                    break
                except ValueError:
                    pass
            daily[date_str] += home_amount

        # Category: hébergements → divide by number_of_days
        category = (exp.category or "Autre").strip()
        #if category.lower() in ("hébergements", "hebergements", "accommodation"):
        #    nights = exp.number_of_days or 1
        #    category_totals[category] += home_amount / nights
        #else:
        #    category_totals[category] += home_amount
        category_totals[category] += home_amount
        category_appearance[category] += 1

        total_home += home_amount

    # Sort days
    sorted_days = sorted(daily.keys())
    actual_per_day = [round(daily[d], 2) for d in sorted_days]
    planned_per_day = [round(daily_budget, 2)] * len(sorted_days)

    # Category pie
    sorted_cats = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
    cat_labels = [c[0] for c in sorted_cats]
    cat_amounts = [round(c[1], 2) for c in sorted_cats]

    # Summary
    num_days = len(sorted_days) or 1
    avg_daily = round(total_home / num_days, 2)

    # To get the price per night, and not the total price I paid each time I booked a few nights
    category_appearance["Hébergements"] = num_days

    for key in category_totals:
      averages[key] = round(category_totals[key] / category_appearance[key], 2)

    for key in category_totals:
        percentages[key] = round(category_totals[key] / total_home * 100, 2)
    percentages = {key: value for key, value in sorted(percentages.items(), key=lambda item: item[1], reverse=True)}

    return {
        "daily_chart": {
            "labels": sorted_days,
            "actual": actual_per_day,
            "planned": planned_per_day,
        },
        "sum_pie": {
            "labels": cat_labels,
            "amounts": cat_amounts,
        },
        "percentage_pie": {
            "labels": [key for key in percentages.keys()],
            "amounts": [val for val in percentages.values()]
        },
        "average_chart": {
          "labels": [key for key in category_appearance.keys()],
          "averages": averages
        },
        "percentage_chart": {
            "labels": list(category_appearance.keys()),
            "percentages": percentages
        },
        "summary": {
            "total": round(total_home, 2),
            "num_days": num_days,
            "avg_daily": avg_daily,
            "planned_daily": daily_budget,
            "over_budget_days": sum(
                1 for a in actual_per_day if a > daily_budget
            ),
        },
    }