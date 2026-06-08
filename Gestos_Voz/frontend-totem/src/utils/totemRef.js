const STORAGE_KEY = "totem_display_ref";

function cleanRef(value) {
  return String(value || "").trim();
}

/** Lee el ID del tótem desde la URL, variables de entorno o almacenamiento local. */
export function resolveTotemRef() {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = cleanRef(params.get("totem") || params.get("t"));
    if (fromQuery) {
      localStorage.setItem(STORAGE_KEY, fromQuery);
      return fromQuery;
    }

    const pathMatch = window.location.pathname.match(/^\/(?:totem|t)\/([^/]+)\/?$/i);
    if (pathMatch?.[1]) {
      const fromPath = cleanRef(decodeURIComponent(pathMatch[1]));
      if (fromPath) {
        localStorage.setItem(STORAGE_KEY, fromPath);
        return fromPath;
      }
    }
  }

  const fromEnv = cleanRef(import.meta.env.VITE_TOTEM_ID);
  if (fromEnv && fromEnv !== "demo-totem") {
    return fromEnv;
  }

  if (typeof window !== "undefined") {
    const stored = cleanRef(localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  }

  return "";
}

/** Guarda el tótem elegido y recarga con ?totem= en la URL. */
export function openTotemRef(ref) {
  const cleaned = cleanRef(ref);
  if (!cleaned) return;

  localStorage.setItem(STORAGE_KEY, cleaned);

  const url = new URL(window.location.href);
  url.searchParams.set("totem", cleaned);
  url.pathname = "/";
  window.location.href = url.toString();
}

export function buildTotemUrl(ref, baseUrl = window.location.origin) {
  const cleaned = cleanRef(ref);
  if (!cleaned) return baseUrl;
  return `${baseUrl.replace(/\/$/, "")}/?totem=${encodeURIComponent(cleaned)}`;
}
