const SESSION_KEY = "totem_device_token";
const SESSION_TOTEM_KEY = "totem_device_info";

export function getTotemSessionToken() {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem(SESSION_KEY) || "").trim();
}

export function setTotemSession(token, totemInfo = null) {
  localStorage.setItem(SESSION_KEY, token);
  if (totemInfo) {
    localStorage.setItem(SESSION_TOTEM_KEY, JSON.stringify(totemInfo));
  }
}

export function getTotemSessionInfo() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_TOTEM_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearTotemSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_TOTEM_KEY);
}
