import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthenticatedActor } from "@/lib/api/types";
import connectToDatabase from "@/lib/db";
import { errorJson } from "@/lib/api/response";
import {
  ADMIN_MFA_COOKIE_NAME,
  resolveUserRole,
} from "@/lib/auth/session";
import { verifySignedAdminMfaCookie } from "@/lib/security/signed-cookie";
import User from "@/models/User";

type CookieCapableRequest = Request & {
  cookies?: {
    get(name: string): { value: string } | undefined;
  };
};

export function unauthorizedResponse(message: string = "Unauthorized") {
  return errorJson(message, 401);
}

export function forbiddenResponse(message: string = "Forbidden") {
  return errorJson(message, 403);
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

  const role = resolveUserRole(user);
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

function getRequestCookieValue(request: CookieCapableRequest, cookieName: string) {
  return request.cookies?.get(cookieName)?.value ?? null;
}

export async function requireAdminMfa(request: CookieCapableRequest) {
  const { actor, response } = await requireAdmin();
  if (!actor || response) {
    return { response, actor: null };
  }

  const mfaCookie = getRequestCookieValue(request, ADMIN_MFA_COOKIE_NAME);
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

