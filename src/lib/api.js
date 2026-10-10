export async function readApiJson(response) {
  const contentType = response.headers.get("content-type") || "";
  const endpoint = response.url ? new URL(response.url).pathname : "the requested endpoint";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(
      `Synera API ${endpoint} returned HTTP ${response.status}, not JSON. Refresh the page; if this continues, restart the Synera server.`
    );
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`Synera API ${endpoint} returned invalid JSON (HTTP ${response.status}).`);
  }
}