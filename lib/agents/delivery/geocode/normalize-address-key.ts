import { createHash } from "crypto";

import { formatExportDeliveryAddress } from "@/lib/orders/export-address";
import type { RoutingStop } from "@/lib/agents/delivery/types";

export function buildNormalizedAddressKey(stop: Pick<RoutingStop, "formattedAddress" | "area" | "deliveryAddress">): string {
  const formatted = formatExportDeliveryAddress(
    {
      unitNumber: stop.deliveryAddress.unitNumber,
      streetAddress: stop.deliveryAddress.streetAddress,
      city: stop.deliveryAddress.city,
      province: stop.deliveryAddress.province,
      postalCode: stop.deliveryAddress.postalCode,
      country: stop.deliveryAddress.country,
      buzzCode: stop.deliveryAddress.buzzCode,
    },
    stop.area
  );

  const normalized = formatted.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized).digest("hex");
}

export function buildGeocodeIdempotencyKey(deliveryDate: string, orderIds: string[]): string {
  const sorted = [...orderIds].sort().join(",");
  const hash = createHash("sha256").update(sorted).digest("hex").slice(0, 16);
  return `kapioo-geocode:${deliveryDate}:${hash}`;
}
