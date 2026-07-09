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
