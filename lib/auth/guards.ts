import { NextResponse } from "next/server";

import { auth } from "@/auth";
import connectToDatabase from "@/lib/db";
import { verifySignedAdminMfaCookie } from "@/lib/security/signed-cookie";
import User from "@/models/User";

export type AuthenticatedRole = "user" | "admin";

export interface AuthenticatedActor {
  user: any;
  role: AuthenticatedRole;
  sessionVersion: number;
}

function resolveRole(user: { role?: string; userID?: string }): AuthenticatedRole {
  if (user.role === "admin" || user.userID === "admin") {
    return "admin";
  }

  return "user";
}

export function unauthorizedResponse(message: string = "Unauthorized") {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function forbiddenResponse(message: string = "Forbidden") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

export async function getAuthenticatedActor(): Promise<AuthenticatedActor | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id);
  if (!user) {
    return null;
  }

  const currentSessionVersion = Number(user.sessionVersion || 1);
  if (currentSessionVersion !== Number(session.user.sessionVersion || 1)) {
    return null;
  }

  const role = resolveRole(user);
  if (user.role !== role) {
    user.role = role;
    await user.save();
  }

  return {
    user,
    role,
    sessionVersion: currentSessionVersion,
  };
}

export async function requireUser() {
  const actor = await getAuthenticatedActor();
  if (!actor) {
    return { response: unauthorizedResponse() as NextResponse, actor: null };
  }

  return { response: null, actor };
}

export async function requireAdmin() {
  const { actor, response } = await requireUser();
  if (!actor || response) {
    return { response, actor: null };
  }

  if (actor.role !== "admin") {
    return {
      response: forbiddenResponse("Admin access required") as NextResponse,
      actor: null,
    };
  }

  return { response: null, actor };
}

function extractCookieValue(request: Request, cookieName: string) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(cookieName.length + 1));
}

export async function requireAdminMfa(request: Request) {
  const { actor, response } = await requireAdmin();
  if (!actor || response) {
    return { response, actor: null };
  }

  const mfaCookie = extractCookieValue(request, "kapioo_admin_mfa");
  const mfaPayload = await verifySignedAdminMfaCookie(mfaCookie);
  if (
    !mfaPayload ||
    mfaPayload.userId !== String(actor.user._id) ||
    Number(mfaPayload.sessionVersion) !== Number(actor.sessionVersion)
  ) {
    return {
      response: forbiddenResponse("Admin MFA verification required") as NextResponse,
      actor: null,
    };
  }

  return { response: null, actor };
}

export async function requireSelfOrAdmin(targetId: string) {
  const { actor, response } = await requireUser();
  if (!actor || response) {
    return { response, actor: null };
  }

  const isSelf =
    String(actor.user._id) === String(targetId) ||
    String(actor.user.userID) === String(targetId);

  if (!isSelf && actor.role !== "admin") {
    return {
      response: forbiddenResponse("You do not have access to this resource") as NextResponse,
      actor: null,
    };
  }

  return { response: null, actor };
}

