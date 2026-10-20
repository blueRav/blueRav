import { chromium } from "@playwright/test";
import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { setTimeout as pause } from "node:timers/promises";
const backend = fileURLToPath(new URL("../../backend/", import.meta.url));
const artifacts = fileURLToPath(new URL("../artifacts/", import.meta.url));
const state = await mkdtemp(tmpdir() + "/sushi-qa-");
const origin = "http://127.0.0.1:8164";
const server = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8164"], {
  cwd: backend, env: { ...process.env, SUSHI_DATABASE: state + "/qa.db" }, stdio: ["ignore", "pipe", "pipe"]
});
let logs = "";
server.stdout.on("data", chunk => { logs += chunk; });
server.stderr.on("data", chunk => { logs += chunk; });
let browser;
const report = { checks: [], viewports: [], seriousAccessibilityIssues: [] };
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try { const response = await fetch(origin + "/api/health"); if (response.ok) { ready = true; break; } } catch {}
    await pause(200);
  }
  if (!ready) throw Error("Python API did not start:\n" + logs);
  await mkdir(artifacts, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const page = await desktop.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("A little market.");
  await expect(page.locator(".hero-image img")).toHaveJSProperty("complete", true);
  if (!(await page.locator(".hero-image img").evaluate(img => img.naturalWidth > 0))) throw Error("Hero photograph is missing");
  await page.getByRole("button", { name: "Cooked favorites", exact: true }).click();
  await expect(page.locator(".menu-item")).toHaveCount(4);
  await page.getByLabel("Search the menu", { exact: true }).fill("unfindablezz");
  await expect(page.getByText("No rolls found this time.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show all favorites", exact: true }).click();
  await expect(page.locator(".menu-item")).toHaveCount(12);
  report.checks.push("menu category filtering, search, and empty-state recovery");
  await page.getByRole("button", { name: "Add California Roll to pickup plan", exact: true }).click();
  await page.getByRole("button", { name: "Open pickup plan, 1 items", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const quoteResponse = page.waitForResponse(response => response.url().endsWith("/api/quote") && response.request().method() === "POST" && JSON.parse(response.request().postData()).lines.some(line => line.quantity === 2));
  await dialog.getByRole("button", { name: "Add one California Roll", exact: true }).click();
  const checkedQuote = await (await quoteResponse).json();
  if (checkedQuote.subtotal_cents !== 1598) throw Error("The frontend did not receive the Python-priced quote");
  await expect(dialog.locator(".pickup-summary")).toContainText("$15.98");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Open pickup plan, 2 items", exact: true })).toBeFocused();
  report.checks.push("pickup quantity changes, Python quote integration, Escape close, and restored keyboard focus");
  await page.getByRole("button", { name: "Decrease California Roll quantity", exact: true }).click();
  await page.getByRole("button", { name: "Open pickup plan, 1 items", exact: true }).click();
  await dialog.getByRole("button", { name: "Remove one California Roll", exact: true }).click();
  await expect(dialog.getByText("Your next favorite is waiting.", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  report.checks.push("menu decrease and drawer removal at zero");

  await page.getByRole("button", { name: "Try the catering planner", exact: true }).click();
  await page.getByLabel("Your name", { exact: true }).fill("QA Guest");
  await page.getByLabel("Email address", { exact: true }).fill("qa@example.com");
  await page.getByLabel("Event date", { exact: true }).fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  await page.getByLabel("Number of guests", { exact: true }).fill("12");
  const cateringResponse = page.waitForResponse(response => response.url().endsWith("/api/catering") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Save demo inquiry", exact: true }).click();
  const inquiry = await (await cateringResponse).json();
  if (!inquiry.id || inquiry.sent_to_restaurant !== false) throw Error("Catering demo did not reach the Python API safely");
  await expect(page.getByText("Saved in this portfolio demo only.", { exact: false })).toBeVisible();
  report.checks.push("catering form validation, SQLite persistence, and explicit demo-only response");
  await page.getByRole("button", { name: "Close the demo planner", exact: true }).click();
  for (const [name, context, target] of [
    ["desktop", desktop, page],
    ["mobile", await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", isMobile: true, hasTouch: true }), null]
  ]) {
    const current = target || await context.newPage();
    if (!target) {
      await current.goto(origin, { waitUntil: "networkidle" });
      await current.evaluate(() => document.fonts.ready);
      await current.getByRole("button", { name: "Open navigation", exact: true }).click();
      await expect(current.getByRole("button", { name: "Close navigation", exact: true })).toHaveAttribute("aria-expanded", "true");
      await current.getByRole("link", { name: "Our menu", exact: true }).click();
      await expect(current.getByRole("button", { name: "Open navigation", exact: true })).toHaveAttribute("aria-expanded", "false");
      report.checks.push("mobile navigation opens, closes, and reaches the menu");
    }
    const overflow = await current.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (overflow) throw Error(name + " has horizontal overflow");
    const audit = await new AxeBuilder({ page: current }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const serious = audit.violations.filter(issue => ["serious", "critical"].includes(issue.impact));
    report.seriousAccessibilityIssues.push(...serious.map(issue => ({ viewport: name, id: issue.id, description: issue.description })));
    await current.evaluate(() => scrollTo(0, 0));
    await current.screenshot({ path: artifacts + name + ".png", fullPage: true });
    report.viewports.push(name);
    if (!target) await context.close();
  }
  if (errors.length) throw Error("Browser errors: " + errors.join("; "));
  if (report.seriousAccessibilityIssues.length) throw Error("Accessibility issues: " + JSON.stringify(report.seriousAccessibilityIssues));
  report.checks.push("desktop and mobile have no horizontal overflow and no serious or critical axe violations");
  report.status = "passed";
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = "failed";
  report.error = error.message;
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await mkdir(artifacts, { recursive: true });
  await writeFile(artifacts + "qa-report.json", JSON.stringify(report, null, 2));
  if (browser) await browser.close();
  server.kill("SIGTERM");
  await pause(300);
  await rm(state, { recursive: true, force: true });
}
