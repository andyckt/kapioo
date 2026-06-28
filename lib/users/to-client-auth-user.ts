import type { AuthenticatedRole } from "@/lib/auth/session";
import { resolveUserRole } from "@/lib/auth/session";
import type { IUser } from "@/models/User";

/** Shape used by `/api/auth/me` and client `mergeStoredUser` after signup. */
export function toClientAuthUser(user: IUser, role: AuthenticatedRole = resolveUserRole(user)) {
  const address = user.address
    ? {
        unitNumber: user.address.unitNumber || "",
        streetAddress: user.address.streetAddress || "",
        province: user.address.province || "",
        postalCode: user.address.postalCode || "",
        country: user.address.country || "Canada",
        buzzCode: user.address.buzzCode || "",
      }
    : undefined;

  const legacyAddress = user.legacyAddress
    ? {
        unitNumber: user.legacyAddress.unitNumber || "",
        streetAddress: user.legacyAddress.streetAddress || "",
        province: user.legacyAddress.province || "",
        postalCode: user.legacyAddress.postalCode || "",
        country: user.legacyAddress.country || "Canada",
        buzzCode: user.legacyAddress.buzzCode || "",
      }
    : undefined;

  return {
    _id: String(user._id),
    userID: user.userID,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    credits: user.credits ?? 0,
    twoDishVoucher: user.twoDishVoucher ?? 0,
    threeDishVoucher: user.threeDishVoucher ?? 0,
    weeklySIXmeals: user.weeklySIXmeals ?? 0,
    weeklyEIGHTmeals: user.weeklyEIGHTmeals ?? 0,
    weeklyTENmeals: user.weeklyTENmeals ?? 0,
    weeklyTWELVEmeals: user.weeklyTWELVEmeals ?? 0,
    weeklySIXTEENmeals: user.weeklySIXTEENmeals ?? 0,
    role,
    languagePreference: user.languagePreference || "zh",
    isVerified: Boolean(user.isVerified),
    address,
    addressGeo: user.addressGeo,
    deliveryNotes: user.deliveryNotes || "",
    addressVerified: Boolean(user.addressVerified),
    addressVerifiedAt: user.addressVerifiedAt?.toISOString?.(),
    legacyAddress,
    area: address?.province || "",
  };
}
