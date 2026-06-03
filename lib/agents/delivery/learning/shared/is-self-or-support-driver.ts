export function isSelfOrSupportDriverName(driverName: string | null | undefined): boolean {
  const normalized = driverName?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (normalized === "self") {
    return true;
  }

  return normalized.includes("donald");
}
