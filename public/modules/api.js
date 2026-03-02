// ============================================================================
// API HELPER
// Thin wrapper around fetch that handles JSON parsing and error propagation.
// All network requests to the Manghu backend go through this function.
// ============================================================================

/**
 * Send a request to the Manghu backend API.
 *
 * @param {string} path - Absolute path, e.g. "/api/state"
 * @param {RequestInit} [opts] - Optional fetch options (method, body, …)
 * @returns {Promise<any>} Parsed JSON response
 * @throws {Error} When the server returns a non-2xx status
 */
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}
