export const formatMoney = cents => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export function filterItems(items, { query = "", category = "all", diet = "all" } = {}) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.filter(item => (category === "all" || item.category === category)
    && (diet === "all" || item.diet === diet)
    && terms.every(term => (item.name + " " + (item.description || "") + " " + (item.contents || []).join(" ")).toLowerCase().includes(term)));
}
export function groupMenuItems(items) {
  const groups = new Map();
  for (const item of items) {
    const key = item.group_id || item.id;
    if (!groups.has(key)) groups.set(key, { ...item, id: key, name: item.display_name || item.name, variants: [] });
    groups.get(key).variants.push(item);
  }
  return [...groups.values()];
}
export function updatePlan(plan, id, quantity) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 20) throw Error("Choose a quantity from 0 to 20.");
  const next = { ...plan };
  if (quantity === 0) delete next[id]; else next[id] = quantity;
  return next;
}
export function localQuote(items, plan) {
  const lines = Object.entries(plan).map(([id, quantity]) => {
    const item = items.find(item => item.id === id);
    if (!item || !Number.isInteger(item.price_cents) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw Error("Invalid pickup item.");
    return { item_id: id, name: item.name, quantity, unit_price_cents: item.price_cents, line_total_cents: item.price_cents * quantity };
  });
  return { lines, subtotal_cents: lines.reduce((total, line) => total + line.line_total_cents, 0), currency: "USD", order_placed: false };
}
export function marketStatus(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(now).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  const close = parts.weekday === "Sun" ? 16 : 18, hour = Number(parts.hour);
  return { open: hour >= 9 && hour < close, label: hour >= 9 && hour < close ? "Open until " + (close - 12) + " pm" : "See you at 9 am" };
}
export function readPlan(storage) {
  try {
    const value = JSON.parse(storage.getItem("sushi-sei-pickup") || "{}");
    if (!value || Array.isArray(value) || typeof value !== "object") return {};
    return Object.fromEntries(Object.entries(value).filter(([id, quantity]) => /^[a-z0-9-]+$/.test(id) && Number.isInteger(quantity) && quantity >= 1 && quantity <= 20));
  } catch { return {}; }
}
