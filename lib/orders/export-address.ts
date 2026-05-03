export interface ExportDeliveryAddress {
  unitNumber?: unknown;
  streetAddress?: unknown;
  city?: unknown;
  province?: unknown;
  postalCode?: unknown;
  country?: unknown;
  buzzCode?: unknown;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function joinNonEmpty(parts: string[], separator: string): string {
  return parts.filter(Boolean).join(separator);
}

/**
 * CSV exports show delivery area as the locality segment. Order-only overrides
 * can change area without changing hidden city/province fields, so area must
 * win over stale address locality data.
 */
export function formatExportDeliveryAddress(
  address?: ExportDeliveryAddress | null,
  area?: unknown
): string {
  if (!address) return "No address provided";

  const unitNumber = normalizeText(address.unitNumber);
  const streetAddress = normalizeText(address.streetAddress);
  const effectiveArea = normalizeText(area);
  const postalCode = normalizeText(address.postalCode);
  const country = normalizeText(address.country);
  const buzzCode = normalizeText(address.buzzCode);

  const legacyLocality = joinNonEmpty(
    [normalizeText(address.city), normalizeText(address.province)],
    " "
  );
  const locality = effectiveArea || legacyLocality;

  const streetLine = joinNonEmpty(
    [unitNumber ? `Unit ${unitNumber}` : "", streetAddress],
    ", "
  );
  const localityLine = joinNonEmpty([locality, postalCode], " ");
  const formattedAddress = joinNonEmpty([streetLine, localityLine, country], ", ");

  if (!formattedAddress) return "No address provided";
  return buzzCode ? `${formattedAddress} (Buzz code: ${buzzCode})` : formattedAddress;
}
