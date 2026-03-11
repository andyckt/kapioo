const PUBLIC_SETTINGS_KEYS = new Set(["cutoffTime"]);
const PUBLIC_GET_API_PATHS = new Set(["/api/weekly-subscription/user"]);

export function isPublicSettingsKey(key: string | null): boolean {
  return Boolean(key && PUBLIC_SETTINGS_KEYS.has(key));
}

export function isPublicSettingsReadRequest(request: { method: string; url: string }): boolean {
  if (request.method !== "GET") {
    return false;
  }

  const url = new URL(request.url);
  return url.pathname === "/api/settings" && isPublicSettingsKey(url.searchParams.get("key"));
}

export function isPublicApiReadRequest(request: { method: string; url: string }): boolean {
  if (request.method !== "GET") {
    return false;
  }

  const url = new URL(request.url);
  return (
    isPublicSettingsReadRequest(request) ||
    PUBLIC_GET_API_PATHS.has(url.pathname)
  );
}
