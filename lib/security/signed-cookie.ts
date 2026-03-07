import { getAdminMfaCookieSecret } from "@/lib/env";

const encoder = new TextEncoder();

function toBase64Url(input: Uint8Array) {
  const base64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(input).toString("base64")
      : btoa(String.fromCharCode(...input));

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);

  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }

  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function importSecret(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signPayload(payload: string, secret: string) {
  const key = await importSecret(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

export interface AdminMfaCookiePayload {
  userId: string;
  sessionVersion: number;
  exp: number;
}

function getSigningSecret() {
  return getAdminMfaCookieSecret();
}

export async function createSignedAdminMfaCookie(payload: AdminMfaCookiePayload) {
  const secret = getSigningSecret();
  if (!secret) {
    throw new Error("Missing ADMIN_MFA_COOKIE_SECRET or AUTH_SECRET");
  }

  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function verifySignedAdminMfaCookie(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  const secret = getSigningSecret();
  if (!secret) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await signPayload(encodedPayload, secret);
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encodedPayload))
    ) as AdminMfaCookiePayload;

    if (!payload.userId || !payload.sessionVersion || !payload.exp) {
      return null;
    }

    if (payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

