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
 * Returns true only when the address geo record contains valid coordinates.
 *
 * Coordinates are required for polygon-based delivery zone validation.
 * The manual-source grandfather (pre-July 2026) has been removed — all users
 * must now have lat/lng captured via Google autocomplete. The address
 * verification gate (address-verification-gate.tsx) routes any user without
 * valid coordinates to /address/verify where they re-enter via autocomplete.
 */
function hasValidGeo(user: AddressVerificationUser) {
  const geo = user?.addressGeo;
  if (!geo) return false;

  return Boolean(
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
