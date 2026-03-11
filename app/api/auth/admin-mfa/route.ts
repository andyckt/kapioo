import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { ADMIN_MFA_COOKIE_NAME } from "@/lib/auth/session";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import { generateVerificationCode, sendAdminMfaCodeEmail } from "@/lib/services/email";
import { logAuditEvent } from "@/lib/security/audit";
import { createSignedAdminMfaCookie } from "@/lib/security/signed-cookie";
import { requireAdmin } from "@/lib/auth/guards";

const ADMIN_MFA_CODE_TTL_MS = 10 * 60 * 1000;
/** MFA cookie lasts 7 days - same device/browser won't need to re-verify for a week */
const ADMIN_MFA_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ADMIN_MFA_SEND_COOLDOWN_MS = 60 * 1000;
function hashAdminMfaCode(code: string, userSalt: string) {
  return crypto.createHash("sha256").update(`${code}:${userSalt}`).digest("hex");
}

export async function GET(request: NextRequest) {
  const { actor, response } = await requireAdmin();
  if (!actor || response) {
    return response;
  }

  const adminMfaEmail = process.env.ADMIN_EMAIL || "kapioomeal@gmail.com";
  return NextResponse.json({
    success: true,
    requiresCode: true,
    email: adminMfaEmail,
  });
}

export async function POST(request: NextRequest) {
  const { actor, response } = await requireAdmin();
  if (!actor || response) {
    return response;
  }

  try {
    await connectToDatabase();

    const body = await request.json();
    const action = String(body?.action || "send");

    if (action === "send") {
      const now = new Date();
      const cooldownCutoff = new Date(Date.now() - ADMIN_MFA_SEND_COOLDOWN_MS);
      const existingCodeExpiresAt = actor.user.adminMfaCodeExpires
        ? new Date(actor.user.adminMfaCodeExpires).getTime()
        : 0;
      const existingCodeSentAt = actor.user.adminMfaCodeSentAt
        ? new Date(actor.user.adminMfaCodeSentAt).getTime()
        : 0;
      const hasReusableRecentCode =
        Boolean(actor.user.adminMfaCodeHash) &&
        existingCodeExpiresAt > Date.now() &&
        existingCodeSentAt >= cooldownCutoff.getTime();

      if (hasReusableRecentCode) {
        return NextResponse.json({
          success: true,
          message: "Admin MFA code already sent recently",
        });
      }

      const code = generateVerificationCode();

      const updated = await User.findOneAndUpdate(
        {
          _id: actor.user._id,
          $or: [
            { adminMfaCodeSentAt: { $exists: false } },
            { adminMfaCodeSentAt: { $lt: cooldownCutoff } },
          ],
        },
        {
          $set: {
            adminMfaCodeSentAt: now,
            adminMfaCodeHash: hashAdminMfaCode(code, actor.user.salt),
            adminMfaCodeExpires: new Date(Date.now() + ADMIN_MFA_CODE_TTL_MS),
          },
        },
        { new: true }
      );

      if (!updated) {
        return NextResponse.json(
          {
            success: false,
            error: "Please wait before requesting another code",
          },
          { status: 429 }
        );
      }

      const adminMfaEmail = process.env.ADMIN_EMAIL || "kapioomeal@gmail.com";
      await sendAdminMfaCodeEmail(
        adminMfaEmail,
        code,
        actor.user.name || actor.user.userID || "Admin",
        actor.user.languagePreference || "zh"
      );

      await logAuditEvent({
        actor,
        action: "admin-mfa.challenge-sent",
        targetType: "admin-session",
        targetId: String(actor.user._id),
        request,
      });

      return NextResponse.json({
        success: true,
        message: "Admin MFA code sent successfully",
      });
    }

    if (action === "verify") {
      const code = String(body?.code || "").trim();
      if (!code) {
        return NextResponse.json(
          { success: false, error: "Verification code is required" },
          { status: 400 }
        );
      }

      const codeExpiresAt = actor.user.adminMfaCodeExpires
        ? new Date(actor.user.adminMfaCodeExpires).getTime()
        : 0;

      if (!actor.user.adminMfaCodeHash || !codeExpiresAt || codeExpiresAt < Date.now()) {
        return NextResponse.json(
          { success: false, error: "Verification code has expired" },
          { status: 400 }
        );
      }

      const hashedInput = hashAdminMfaCode(code, actor.user.salt);
      if (hashedInput !== actor.user.adminMfaCodeHash) {
        return NextResponse.json(
          { success: false, error: "Invalid verification code" },
          { status: 400 }
        );
      }

      actor.user.adminMfaCodeHash = undefined;
      actor.user.adminMfaCodeExpires = undefined;
      await actor.user.save();

      const cookieValue = await createSignedAdminMfaCookie({
        userId: String(actor.user._id),
        sessionVersion: actor.sessionVersion,
        exp: Date.now() + ADMIN_MFA_SESSION_TTL_MS,
      });

      const apiResponse = NextResponse.json({
        success: true,
        message: "Admin MFA verified successfully",
      });

      apiResponse.cookies.set(ADMIN_MFA_COOKIE_NAME, cookieValue, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: ADMIN_MFA_SESSION_TTL_MS / 1000,
      });

      await logAuditEvent({
        actor,
        action: "admin-mfa.verified",
        targetType: "admin-session",
        targetId: String(actor.user._id),
        request,
      });

      return apiResponse;
    }

    return NextResponse.json(
      { success: false, error: "Unsupported admin MFA action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error handling admin MFA:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process admin MFA request" },
      { status: 500 }
    );
  }
}

// DELETE clears the admin MFA cookie. No auth required: the operation only
// sets a response cookie with maxAge=0. Non-admins never have this cookie,
// so it is a harmless no-op for them. Requiring admin would cause 403 for
// regular users during logout (performClientLogout runs for all users).
export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: "Admin MFA cleared",
  });

  response.cookies.set(ADMIN_MFA_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}

