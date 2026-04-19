import type { CachedToken, Credentials } from "@/types/sentinel";
import { CDSE_TOKEN_URL } from "./endpoints";

const CRED_KEY = "sentipede:credentials";
const TOKEN_KEY = "sentipede:token";
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export function loadCredentials(): Credentials | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(CRED_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Credentials;
    if (!parsed.clientId || !parsed.clientSecret) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCredentials(c: Credentials): void {
  localStorage.setItem(CRED_KEY, JSON.stringify(c));
}

export function clearCredentials(): void {
  localStorage.removeItem(CRED_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

function loadCachedToken(): CachedToken | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedToken;
    if (parsed.expiresAt - Date.now() < REFRESH_MARGIN_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToken(token: CachedToken): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

export async function getAccessToken(creds: Credentials): Promise<string> {
  const cached = loadCachedToken();
  if (cached) return cached.accessToken;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });

  const res = await fetch(CDSE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OAuth failed: ${res.status} ${res.statusText} ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  const token: CachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  saveToken(token);
  return token.accessToken;
}
