from datetime import date, datetime, timedelta, timezone
from pathlib import Path
import tempfile
import unittest
from fastapi.testclient import TestClient
from app.main import create_app
from app.catalogue import business_status, ITEMS, CATALOGUE

class ApiTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.client = TestClient(create_app(str(Path(self.folder.name) / "demo.db"), admin_token="test-only-token"))
        self.client.__enter__()
    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.folder.cleanup()
    def inquiry(self):
        return {"name": "Demo Guest", "email": "demo@example.com", "guests": 12,
                "event_date": str(date.today() + timedelta(days=7)), "notes": "A synthetic test inquiry."}
    def test_health_and_real_restaurant_details(self):
        self.assertTrue(self.client.get("/api/health").json()["python_backend"])
        info = self.client.get("/api/restaurant").json()
        self.assertEqual(info["phone"], "610.649.3193")
        self.assertIn("120 Coulter", info["address"])
    def test_menu_filter_search_and_empty_state(self):
        self.assertEqual(len(self.client.get("/api/menu").json()["items"]), len(ITEMS))
        self.assertGreaterEqual(len({item["group_id"] for item in ITEMS.values()}), 109)
        veggie = self.client.get("/api/menu?diet=vegetarian").json()["items"]
        self.assertTrue(all(item["diet"] == "vegetarian" for item in veggie))
        self.assertEqual(self.client.get("/api/menu?q=unfindablezz").json()["items"], [])
    def test_quote_uses_server_prices(self):
        result = self.client.post("/api/quote", json={"lines": [{"item_id": "california", "quantity": 2}]}).json()
        self.assertEqual(result["subtotal_cents"], 1598)
        self.assertFalse(result["order_placed"])
    def test_rice_variants_are_priced_separately(self):
        result = self.client.post("/api/quote", json={"lines": [{"item_id": "california", "quantity": 1}, {"item_id": "california-brown", "quantity": 2}]}).json()
        self.assertEqual(result["subtotal_cents"], 799 + 2 * 849)
        self.assertEqual(len(result["lines"]), 2)
    def test_all_source_categories_are_accessible(self):
        for category in CATALOGUE["categories"]:
            response = self.client.get("/api/menu", params={"category": category["id"]})
            self.assertEqual(response.status_code, 200)
            rows = response.json()["items"]
            self.assertTrue(rows)
            self.assertTrue(all(row["category"] == category["id"] for row in rows))
        self.assertEqual(self.client.get("/api/menu?category=made-up").status_code, 422)
    def test_catalogue_integrity_and_tray_choices(self):
        self.assertEqual(len(ITEMS), len(CATALOGUE["items"]))
        self.assertTrue(all(isinstance(item["price_cents"], int) and item["price_cents"] > 0 for item in ITEMS.values()))
        trays = [item for item in ITEMS.values() if item["category"] == "party-trays"]
        self.assertEqual(len({item["group_id"] for item in trays}), 6)
        self.assertTrue(all(item["advance_hours"] == 24 and item["contents"] for item in trays))
    def test_client_prices_and_unknown_items_are_rejected(self):
        self.assertEqual(self.client.post("/api/quote", json={"lines": [{"item_id": "california", "quantity": 1, "price": 1}]}).status_code, 422)
        self.assertEqual(self.client.post("/api/quote", json={"lines": [{"item_id": "missing", "quantity": 1}]}).status_code, 422)
    def test_quantities_are_strict_and_bounded(self):
        for quantity in [0, -1, True, 21, 1.5]:
            self.assertEqual(self.client.post("/api/quote", json={"lines": [{"item_id": "california", "quantity": quantity}]}).status_code, 422)
    def test_duplicate_lines_are_combined(self):
        result = self.client.post("/api/quote", json={"lines": [{"item_id": "california", "quantity": 1}, {"item_id": "california", "quantity": 2}]}).json()
        self.assertEqual(result["lines"][0]["quantity"], 3)
    def test_catering_is_persistent_and_idempotent(self):
        first = self.client.post("/api/catering", json=self.inquiry(), headers={"Idempotency-Key": "demo-1"}).json()
        second = self.client.post("/api/catering", json=self.inquiry(), headers={"Idempotency-Key": "demo-1"}).json()
        self.assertEqual(first["id"], second["id"])
        self.assertFalse(first["sent_to_restaurant"])
        self.assertFalse(second["created"])
        inbox = self.client.get("/api/catering", headers={"Authorization": "Bearer test-only-token"}).json()
        self.assertEqual(len(inbox["items"]), 1)
    def test_idempotency_conflict_is_reported(self):
        payload = self.inquiry()
        self.client.post("/api/catering", json=payload, headers={"Idempotency-Key": "same"})
        payload["guests"] = 20
        self.assertEqual(self.client.post("/api/catering", json=payload, headers={"Idempotency-Key": "same"}).status_code, 409)
    def test_admin_inbox_is_not_public(self):
        self.assertEqual(self.client.get("/api/catering").status_code, 401)
    def test_past_dates_and_invalid_email_are_rejected(self):
        payload = self.inquiry()
        payload["event_date"] = str(date.today() - timedelta(days=1))
        self.assertEqual(self.client.post("/api/catering", json=payload).status_code, 422)
        payload = self.inquiry()
        payload["email"] = "invalid"
        self.assertEqual(self.client.post("/api/catering", json=payload).status_code, 422)
    def test_blank_and_non_string_names_are_rejected(self):
        for name in ["  ", " A ", 123, None]:
            payload = self.inquiry()
            payload["name"] = name
            self.assertEqual(self.client.post("/api/catering", json=payload).status_code, 422)
    def test_recommendations_obey_preferences_and_budget(self):
        result = self.client.post("/api/recommend", json={"diet": "vegetarian", "budget_cents": 600}).json()
        self.assertTrue(all(item["price_cents"] <= 600 and item["diet"] == "vegetarian" for item in result["items"]))
        self.assertIn("read_catalogue", result["trace"])
    def test_business_hours_use_new_york_time(self):
        self.assertTrue(business_status(datetime(2026, 10, 20, 15, tzinfo=timezone.utc))["open"])
        self.assertFalse(business_status(datetime(2026, 10, 20, 23, tzinfo=timezone.utc))["open"])
        self.assertFalse(business_status(datetime(2026, 10, 25, 21, tzinfo=timezone.utc))["open"])
        with self.assertRaises(ValueError):
            business_status(datetime(2026, 10, 20, 12))
if __name__ == "__main__":
    unittest.main()
