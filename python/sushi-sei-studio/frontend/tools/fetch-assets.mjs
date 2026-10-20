import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const directory = fileURLToPath(new URL("../public/images/", import.meta.url));
const url = "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?fm=jpg&fit=crop&w=1600&q=85";
await mkdir(directory, { recursive: true });
let bytes;
try { bytes = await readFile(directory + "hero.jpg"); } catch {}
if (!bytes || bytes.length < 10000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw Error("The source photograph could not be downloaded.");
  bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 10000 || bytes.length > 5000000 || bytes[0] !== 255 || bytes[1] !== 216) throw Error("Unexpected photograph format or size.");
  await writeFile(directory + "hero.jpg", bytes);
}
await writeFile(directory + "provenance.json", JSON.stringify({
  origin: url, provider: "Unsplash", use: "Illustrative food photography; not a photograph of Sushi Sei Express",
  sha256: createHash("sha256").update(bytes).digest("hex")
}, null, 2));
console.log("Prepared the verified illustrative food photograph.");
