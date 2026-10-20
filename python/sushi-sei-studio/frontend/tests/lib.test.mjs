import test from "node:test";
import assert from "node:assert/strict";
import { filterItems, updatePlan, localQuote, marketStatus, readPlan, formatMoney } from "../src/lib.mjs";
const items = [{ id: "california", name: "California Roll", description: "A cooked classic", category: "cooked", price_cents: 799 },
  { id: "avocado", name: "Avocado", description: "A simple vegetable roll", category: "vegetarian", price_cents: 499 }];
test("menu filters combine category and search", () => {
  assert.equal(filterItems(items, { query: "classic", category: "cooked" }).length, 1);
  assert.equal(filterItems(items, { query: "missing" }).length, 0);
});
test("pickup changes are immutable and zero removes an item", () => {
  const plan = { california: 1 };
  assert.deepEqual(updatePlan(plan, "california", 0), {});
  assert.deepEqual(plan, { california: 1 });
  assert.throws(() => updatePlan(plan, "california", 21));
});
test("quotes use catalogue cents and quantity", () => {
  assert.equal(localQuote(items, { california: 2 }).subtotal_cents, 1598);
  assert.equal(formatMoney(1598), "$15.98");
  assert.throws(() => localQuote(items, { missing: 1 }));
});
test("hours are evaluated in New York", () => {
  assert.equal(marketStatus(new Date("2026-10-20T15:00:00Z")).open, true);
  assert.equal(marketStatus(new Date("2026-10-25T21:00:00Z")).open, false);
});
test("malformed saved state is discarded", () => {
  assert.deepEqual(readPlan({ getItem: () => "invalid" }), {});
  assert.deepEqual(readPlan({ getItem: () => '{"california":2,"avocado":99}' }), { california: 2 });
});
