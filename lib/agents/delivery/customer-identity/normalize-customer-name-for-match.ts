function readString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

export function normalizeCustomerNameForMatch(name: unknown): string {
  const trimmed = readString(name).trim();

  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/\s+/g, " ").toLowerCase();
}
