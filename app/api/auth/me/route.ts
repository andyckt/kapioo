import { NextRequest, NextResponse } from "next/server";

import { ADMIN_MFA_COOKIE_NAME } from "@/lib/auth/session";
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

    const adminMfaCookie = request.cookies.get(ADMIN_MFA_COOKIE_NAME)?.value;
    const verifiedMfa = await verifySignedAdminMfaCookie(adminMfaCookie);
    const requiresAdminMfa =
      actor.role === "admin" &&
      (!verifiedMfa ||
        verifiedMfa.userId !== String(actor.user._id) ||
        verifiedMfa.sessionVersion !== actor.sessionVersion);

    const u = actor.user;
    const address = u.address
      ? {
          unitNumber: u.address.unitNumber || "",
          streetAddress: u.address.streetAddress || "",
          province: u.address.province || "",
          postalCode: u.address.postalCode || "",
          country: u.address.country || "Canada",
          buzzCode: u.address.buzzCode || "",
        }
      : undefined;

    const adminMfaEmail = process.env.ADMIN_EMAIL || "kapioomeal@gmail.com";
    return NextResponse.json({
      success: true,
      authenticated: true,
      requiresAdminMfa,
      adminMfaEmail: actor.role === "admin" ? adminMfaEmail : undefined,
      user: {
        _id: String(u._id),
        userID: u.userID,
        name: u.name,
        email: u.email,
        phone: u.phone || "",
        credits: u.credits ?? 0,
        twoDishVoucher: u.twoDishVoucher ?? 0,
        threeDishVoucher: u.threeDishVoucher ?? 0,
        weeklySIXmeals: u.weeklySIXmeals ?? 0,
        weeklyEIGHTmeals: u.weeklyEIGHTmeals ?? 0,
        weeklyTENmeals: u.weeklyTENmeals ?? 0,
        weeklyTWELVEmeals: u.weeklyTWELVEmeals ?? 0,
        weeklySIXTEENmeals: u.weeklySIXTEENmeals ?? 0,
        role: actor.role,
        languagePreference: u.languagePreference || "zh",
        isVerified: Boolean(u.isVerified),
        address,
        area: u.area || address?.province || "",
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

