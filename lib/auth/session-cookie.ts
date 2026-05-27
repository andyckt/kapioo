import { encode } from "next-auth/jwt";
import type { NextResponse } from "next/server";

import { AUTH_SESSION_MAX_AGE_SECONDS } from "@/lib/auth/constants";
import type { AuthSessionUser } from "@/lib/auth/session-user";
import { getAuthSessionCookieName } from "@/lib/auth/session";
import { AUTH_SECRET } from "@/lib/env";

function isSecureRequest(request: Request): boolean {
  if (request.url.startsWith("https:")) {
    return true;
  }

  return process.env.NODE_ENV === "production";
}

export async function encodeAuthSessionToken(sessionUser: AuthSessionUser, request: Request) {
  const secureCookie = isSecureRequest(request);
  const cookieName = getAuthSessionCookieName(secureCookie);

  const token = await encode({
    token: {
      sub: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
      role: sessionUser.role,
      sessionVersion: sessionUser.sessionVersion,
      languagePreference: sessionUser.languagePreference,
      isVerified: sessionUser.isVerified,
    },
    secret: AUTH_SECRET,
    salt: cookieName,
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
  });

  return { cookieName, token, secureCookie };
}

export async function attachAuthSessionCookie(
  response: NextResponse,
  sessionUser: AuthSessionUser,
  request: Request
) {
  const { cookieName, token, secureCookie } = await encodeAuthSessionToken(sessionUser, request);

  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: secureCookie,
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
