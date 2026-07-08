type AddressVerificationUser = {
  role?: string;
  addressVerified?: boolean;
  addressVerifiedAt?: string | Date | null;
  address?: {
    streetAddress?: string;
    postalCode?: string;
    province?: string;
  } | null;
  addressGeo?: {
    source?: "google" | "manual" | string;
    placeId?: string;
    lat?: number;
    lng?: number;
  } | null;
} | null | undefined;

function hasCompleteLegacyAddress(user: AddressVerificationUser) {
  return Boolean(
    user?.address?.streetAddress?.trim() &&
      user.address.postalCode?.trim() &&
      user.address.province?.trim()
  );
}

/**
 * Returns true only for Google-sourced geo with valid coordinates.
 * Manual-source records are only grandfathered if the user was verified
 * before the Google-only policy (addressVerifiedAt set before July 2026).
 * New manual saves are not accepted for customers.
 */
function hasValidGeo(user: AddressVerificationUser) {
  const geo = user?.addressGeo;
  if (!geo) return false;

  if (geo.source === "manual") {
    // Grandfather: accept manual geo only if the record was verified before
    // Google-only enforcement. New manual verifications are not issued.
    const verifiedAt = user?.addressVerifiedAt
      ? new Date(user.addressVerifiedAt as string)
      : null;
    const cutoff = new Date("2026-07-01T00:00:00Z");
    return verifiedAt !== null && verifiedAt < cutoff;
  }

  return Boolean(
    geo.placeId &&
      typeof geo.lat === "number" &&
      Number.isFinite(geo.lat) &&
      typeof geo.lng === "number" &&
      Number.isFinite(geo.lng)
  );
}

export function isAddressVerified(user: AddressVerificationUser) {
  if (user?.role === "admin") {
    return true;
  }

  return Boolean(user?.addressVerified && hasCompleteLegacyAddress(user) && hasValidGeo(user));
}

export function needsAddressVerification(user: AddressVerificationUser) {
  return !isAddressVerified(user);
}
