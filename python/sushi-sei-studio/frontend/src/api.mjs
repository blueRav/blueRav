const base = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
export const staticPreview = import.meta.env.VITE_STATIC_PREVIEW === "true";
export async function api(path, { method = "GET", body, key } = {}) {
  if (staticPreview) throw Error("The hosted menu preview runs locally in your browser.");
  const response = await fetch(base + "/api/" + path, {
    method, headers: { "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) {
    let message = "Please try again in a moment.";
    try {
      const error = await response.json();
      if (typeof error.detail === "string") message = error.detail;
      else if (Array.isArray(error.detail)) message = error.detail.map(item => item.msg).join(". ");
    } catch {}
    throw Error(message);
  }
  return response.json();
}
