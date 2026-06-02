export function normalizePhoneDigits(phone: unknown): string {
  if (phone === null || phone === undefined) {
    return "";
  }

  return String(phone).replace(/\D/g, "");
}

export function getLast4PhoneDigits(phone: unknown): string {
  const digits = normalizePhoneDigits(phone);

  if (digits.length < 4) {
    return "";
  }

  return digits.slice(-4);
}
