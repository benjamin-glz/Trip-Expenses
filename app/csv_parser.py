import pandas as pd
from typing import List, Dict, Any
import io


def parse_csv(content: bytes) -> List[Dict[str, Any]]:
    """Parse the semicolon-delimited expense CSV and return list of row dicts."""
    df = pd.read_csv(io.BytesIO(content), sep=";", dtype=str, on_bad_lines="skip")

    # Normalize column names
    df.columns = [c.strip() for c in df.columns]

    column_map = {
        "amount": "amount",
        "amountInHomeCurrency": "amount_in_home_currency",
        "category": "category",
        "conversionRate": "conversion_rate",
        "country": "country",
        "countryCode": "country_code",
        "datePaid": "date_paid",
        "homeCurrency": "home_currency",
        "localCurrency": "local_currency",
        "notes": "notes",
        "paidBy": "paid_by",
        "paidFor": "paid_for",
        "paymentMethod": "payment_method",
        "place": "place",
        "latitude": "latitude",
        "longitude": "longitude",
        "type": "type",
        "numberOfDays": "number_of_days",
        "excludeFromAvg": "exclude_from_avg",
        "addToBudget": "add_to_budget",
        "categoryIcon": "category_icon",
        "categoryColor": "category_color",
        "paymentMethodIcon": "payment_method_icon",
        "paymentMethodColor": "payment_method_color",
    }

    rows = []
    for _, row in df.iterrows():
        record: Dict[str, Any] = {}
        for csv_col, model_field in column_map.items():
            val = row.get(csv_col, None)
            if pd.isna(val) if val is not None else True:
                record[model_field] = None
                continue

            val = str(val).strip()

            if model_field in ("amount", "amount_in_home_currency", "conversion_rate",
                               "latitude", "longitude", "number_of_days"):
                try:
                    record[model_field] = float(val.replace(",", "."))
                except (ValueError, AttributeError):
                    record[model_field] = None
            elif model_field in ("exclude_from_avg", "add_to_budget"):
                record[model_field] = val.lower() in ("true", "1", "yes", "oui")
            else:
                record[model_field] = val if val != "" else None

        rows.append(record)

    return rows