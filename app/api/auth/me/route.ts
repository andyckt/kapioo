import { NextRequest, NextResponse } from "next/server";

import { verifySignedAdminMfaCookie } from "@/lib/security/signed-cookie";
import { getAuthenticatedActor } from "@/lib/auth/guards";

export async function GET(request: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();

    if (!actor) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        user: null,
      });
    }

    const adminMfaCookie = request.cookies.get("kapioo_admin_mfa")?.value;
    const verifiedMfa = await verifySignedAdminMfaCookie(adminMfaCookie);
    const requiresAdminMfa =
      actor.role === "admin" &&
      (!verifiedMfa ||
        verifiedMfa.userId !== String(actor.user._id) ||
        verifiedMfa.sessionVersion !== actor.sessionVersion);

    return NextResponse.json({
      success: true,
      authenticated: true,
      requiresAdminMfa,
      user: {
        _id: String(actor.user._id),
        userID: actor.user.userID,
        name: actor.user.name,
        email: actor.user.email,
        role: actor.role,
        languagePreference: actor.user.languagePreference || "zh",
        isVerified: Boolean(actor.user.isVerified),
      },
    });
  } catch (error) {
    console.error("Error fetching current auth user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch auth state" },
      { status: 500 }
    );
  }
}

