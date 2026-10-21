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

test("white and brown rice group together while retaining independently priced IDs", async () => {
  const { groupMenuItems } = await import("../src/lib.mjs");
  const variants = [
    { ...items[0], group_id: "california", display_name: "California Roll", rice: "white" },
    { ...items[0], id: "california-brown", group_id: "california", display_name: "California Roll", name: "California Roll · Brown rice", rice: "brown", price_cents: 849 }
  ];
  const groups = groupMenuItems(variants);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].name, "California Roll");
  assert.deepEqual(groups[0].variants.map(item => item.id), ["california", "california-brown"]);
  assert.equal(localQuote(variants, { california: 1, "california-brown": 2 }).subtotal_cents, 2497);
  assert.deepEqual(updatePlan({ california: 1, "california-brown": 2 }, "california-brown", 0), { california: 1 });
});
test("unpriced originals cannot silently become free pickup items", () => {
  assert.throws(() => localQuote([{ ...items[0], price_cents: null }], { california: 1 }), /Invalid pickup item/);
});
test("full catalogue groups cover every category and support ingredient and dietary filtering", async () => {
  const { readFile } = await import("node:fs/promises");
  const { groupMenuItems } = await import("../src/lib.mjs");
  const catalogue = JSON.parse(await readFile(new URL("../../data/menu.json", import.meta.url), "utf8"));
  const groups = groupMenuItems(catalogue.items);
  assert.equal(groups.length, 109);
  assert.equal(catalogue.categories.length, 12);
  assert.ok(catalogue.categories.every(category => groups.some(group => group.category === category.id)));
  assert.equal(groups.filter(item => item.category === "party-trays").length, 6);
  assert.ok(filterItems(groups, { category: "party-trays", query: "yellowtail" }).length > 0);
  const vegetarian = filterItems(groups, { diet: "vegetarian" });
  assert.ok(vegetarian.length > 0);
  assert.ok(vegetarian.every(item => item.diet === "vegetarian"));
});
