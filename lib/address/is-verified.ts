type AddressVerificationUser = {
  role?: string;
  addressVerified?: boolean;
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

function hasValidGeo(user: AddressVerificationUser) {
  const geo = user?.addressGeo;
  if (!geo) return false;
  if (geo.source === "manual") return true;
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
