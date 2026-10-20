from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
import json
CATALOGUE = json.loads((Path(__file__).resolve().parents[2] / "data" / "menu.json").read_text())
ITEMS = {item["id"]: item for item in CATALOGUE["items"]}
SOURCE = {
    "name": "Sushi Sei Express", "location": "Ardmore Farmers Market",
    "address": "120 Coulter Avenue, Ardmore, PA 19003", "phone": "610.649.3193",
    "telephone": "+16106493193", "hours": {"monday_saturday": "9 am – 6 pm", "sunday": "9 am – 4 pm"},
    "source_url": "http://www.sushiseiexpress.com/home.html", "verified_on": "2026-10-20"
}
def business_status(now=None):
    now = now or datetime.now(ZoneInfo("America/New_York"))
    if now.tzinfo is None:
        raise ValueError("use a timezone-aware date")
    local = now.astimezone(ZoneInfo("America/New_York"))
    close_hour = 16 if local.weekday() == 6 else 18
    opened = 9 * 60 <= local.hour * 60 + local.minute < close_hour * 60
    return {"open": opened, "closes": f"{close_hour-12} pm",
            "label": f"Open until {close_hour-12} pm" if opened else "See you at 9 am",
            "timezone": "America/New_York", "hours_source": SOURCE["source_url"]}
def menu_search(query="", category="all", diet="all"):
    words = query.casefold().split()
    return [item for item in CATALOGUE["items"]
            if (category == "all" or item["category"] == category)
            and (diet == "all" or item["diet"] == diet)
            and all(word in (item["name"] + " " + item["description"]).casefold() for word in words)]
def quote_lines(lines):
    quantities = {}
    for line in lines:
        item_id, quantity = line["item_id"], line["quantity"]
        if item_id not in ITEMS:
            raise ValueError("Unknown menu item: " + item_id)
        quantities[item_id] = quantities.get(item_id, 0) + quantity
        if quantities[item_id] > 20:
            raise ValueError("A pickup plan supports at most 20 of one item")
    result = [{"item_id": item_id, "name": ITEMS[item_id]["name"], "quantity": quantity,
               "unit_price_cents": ITEMS[item_id]["price_cents"],
               "line_total_cents": ITEMS[item_id]["price_cents"] * quantity}
              for item_id, quantity in quantities.items()]
    return {"lines": result, "subtotal_cents": sum(line["line_total_cents"] for line in result),
            "currency": "USD", "order_placed": False,
            "notice": "An estimate before tax. Call the restaurant to confirm prices, availability and your pickup."}
def recommend(query="", diet="all", budget_cents=None):
    candidates = menu_search(query, diet=diet)
    if budget_cents is not None:
        candidates = [item for item in candidates if item["price_cents"] <= budget_cents]
    return {"items": candidates[:3], "trace": ["read_catalogue", "filter_preferences", "rank_catalogue_order"],
            "method": "deterministic_catalogue_match",
            "notice": "Ingredient preferences do not establish allergy safety. Ask the team about allergens and preparation."}
