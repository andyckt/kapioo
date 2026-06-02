import { normalizeCustomerNameForMatch } from "@/lib/agents/delivery/customer-identity/normalize-customer-name-for-match";
import { getLast4PhoneDigits } from "@/lib/agents/delivery/customer-identity/normalize-phone-digits";
import type {
  FormatRouteOptimizerCustomerNameResult,
  KapiooCustomerIdentityInput,
} from "@/lib/agents/delivery/customer-identity/types";

function readString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function resolveSourceName(input: KapiooCustomerIdentityInput): string {
  const customerName = readString(input.customerName).trim();
  if (customerName) {
    return customerName;
  }

  return readString(input.name).trim();
}

function resolvePhone(input: KapiooCustomerIdentityInput): string {
  const phone = readString(input.phone).trim();
  if (phone) {
    return phone;
  }

  return readString(input.customerPhone).trim();
}

function collapseDisplayName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

export function formatRouteOptimizerCustomerName(
  input: KapiooCustomerIdentityInput
): FormatRouteOptimizerCustomerNameResult {
  const sourceName = resolveSourceName(input);
  const displayName = collapseDisplayName(sourceName);
  const phone = resolvePhone(input);
  const last4PhoneDigits = getLast4PhoneDigits(phone);
  const hasUsablePhoneLast4 = last4PhoneDigits.length === 4;

  let formattedName = "";

  if (displayName && hasUsablePhoneLast4) {
    formattedName = `${displayName}-${last4PhoneDigits}`;
  } else if (displayName) {
    formattedName = displayName;
  } else if (hasUsablePhoneLast4) {
    formattedName = `unknown-${last4PhoneDigits}`;
  }

  return {
    formattedName,
    normalizedFormattedName: normalizeCustomerNameForMatch(formattedName),
    sourceName: displayName,
    last4PhoneDigits,
    hasUsablePhoneLast4,
  };
}
