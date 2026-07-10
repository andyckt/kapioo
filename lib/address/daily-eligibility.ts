import { getWeeklyPlanBalanceRows } from "@/lib/plans/balances";
import { canDeliverDaily, resolveServiceability } from "@/lib/zones/service-areas";

export type UserAddressSnapshot = {
  address?: {
    province?: string;
    postalCode?: string;
  } | null;
  addressGeo?: {
    lat?: number;
    lng?: number;
  } | null;
};

/** Daily eligibility for a saved user profile (polygon when coords exist). */
export function getUserDailyEligibility(user: UserAddressSnapshot | null | undefined) {
  const areaLabel = user?.address?.province ?? "";
  const coords = user?.addressGeo
    ? { lat: user.addressGeo.lat, lng: user.addressGeo.lng }
    : undefined;

  const serviceability = resolveServiceability({
    areaLabel,
    postalCode: user?.address?.postalCode,
    lat: user?.addressGeo?.lat,
    lng: user?.addressGeo?.lng,
  });

  return {
    areaLabel,
    canDaily: canDeliverDaily(coords, areaLabel),
    canWeekly: serviceability.canWeekly,
    isServed: serviceability.isServed,
  };
}

type UserBalance = Record<string, unknown>;

/** True when user still has at least one unused daily voucher. */
export function hasDailyBalance(user: UserBalance): boolean {
  return (Number(user.twoDishVoucher) || 0) > 0 || (Number(user.threeDishVoucher) || 0) > 0;
}

/** True when user still has at least one unused weekly meal voucher. */
export function hasWeeklyBalance(user: UserBalance): boolean {
  return getWeeklyPlanBalanceRows(user).some((r) => r.balance > 0);
}

/**
 * True when submitted address matches the user's existing saved address.
 * Matches by placeId when both present; falls back to normalized street + postal.
 * Used to grandfather a user's own (now out-of-area) address in verify-address.
 */
export function isSameSavedAddress(
  submitted: { placeId?: string | null; streetAddress?: string; postalCode?: string },
  saved: { placeId?: string | null; streetAddress?: string; postalCode?: string } | null | undefined
): boolean {
  if (!saved) return false;
  if (submitted.placeId && saved.placeId) return submitted.placeId === saved.placeId;
  const norm = (s?: string) => (s || "").trim().toLowerCase();
  return norm(submitted.streetAddress) === norm(saved.streetAddress) &&
    norm(submitted.postalCode) === norm(saved.postalCode);
}

/** Daily eligibility for an in-form address selection. */
export function isAddressDailyEligible(input: {
  province?: string;
  postalCode?: string;
  addressGeo?: { lat?: number; lng?: number };
}) {
  return canDeliverDaily(
    input.addressGeo
      ? { lat: input.addressGeo.lat, lng: input.addressGeo.lng }
      : undefined,
    input.province
  );
}
