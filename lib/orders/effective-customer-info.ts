type NullableString = string | null | undefined;

export interface DeliveryAddress {
  unitNumber?: string;
  streetAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  buzzCode?: string;
}

export interface OrderCustomerOverride {
  name?: string;
  phoneNumber?: string;
  area?: string;
  deliveryAddress?: DeliveryAddress;
  specialInstructions?: string;
  updatedAt?: Date | string;
  updatedBy?: string;
}

export interface EffectiveCustomerInfo {
  name: string;
  email: string;
  phoneNumber: string;
  area: string;
  deliveryAddress: DeliveryAddress;
  specialInstructions: string;
}

interface ResolveOrderInput {
  phoneNumber?: NullableString;
  area?: NullableString;
  deliveryAddress?: DeliveryAddress | null;
  specialInstructions?: NullableString;
  orderCustomerOverride?: OrderCustomerOverride | null;
}

interface ResolveUserInput {
  name?: NullableString;
  email?: NullableString;
}

export function normalizeOptionalText(value: NullableString): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizePhoneNumber(value: NullableString): string | undefined {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return undefined;
  return normalized.replace(/\s+/g, ' ');
}

function normalizeSpecialInstructions(value: NullableString): string | undefined {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return undefined;

  const lineNormalized = normalized.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  if (/^[=+\-@]/.test(lineNormalized)) {
    return `'${lineNormalized}`;
  }
  return lineNormalized;
}

function normalizeAddress(address?: DeliveryAddress | null): DeliveryAddress {
  if (!address) return {};
  return {
    unitNumber: normalizeOptionalText(address.unitNumber),
    streetAddress: normalizeOptionalText(address.streetAddress),
    city: normalizeOptionalText(address.city),
    province: normalizeOptionalText(address.province),
    postalCode: normalizeOptionalText(address.postalCode),
    country: normalizeOptionalText(address.country),
    buzzCode: normalizeOptionalText(address.buzzCode),
  };
}

function hasAnyAddressValue(address?: DeliveryAddress | null): boolean {
  if (!address) return false;
  return Object.values(address).some((value) => Boolean(normalizeOptionalText(value)));
}

export function hasOrderCustomerOverride(order: ResolveOrderInput): boolean {
  const override = order.orderCustomerOverride;
  if (!override) return false;

  return Boolean(
    normalizeOptionalText(override.name) ||
      normalizePhoneNumber(override.phoneNumber) ||
      normalizeOptionalText(override.area) ||
      normalizeSpecialInstructions(override.specialInstructions) ||
      hasAnyAddressValue(override.deliveryAddress)
  );
}

export function getOrderOnlyOverrideMeta(order: ResolveOrderInput): { updatedAt?: Date | string; updatedBy?: string } {
  if (!order.orderCustomerOverride) return {};
  const updatedBy = normalizeOptionalText(order.orderCustomerOverride.updatedBy);
  return {
    updatedAt: order.orderCustomerOverride.updatedAt,
    updatedBy,
  };
}

export function resolveEffectiveOrderCustomerInfo(order: ResolveOrderInput, user?: ResolveUserInput | null): EffectiveCustomerInfo {
  const override = order.orderCustomerOverride || {};
  const orderAddress = normalizeAddress(order.deliveryAddress);
  const overrideAddress = normalizeAddress(override.deliveryAddress);

  const effectiveAddress: DeliveryAddress = {
    unitNumber: overrideAddress.unitNumber ?? orderAddress.unitNumber ?? '',
    streetAddress: overrideAddress.streetAddress ?? orderAddress.streetAddress ?? '',
    city: overrideAddress.city ?? orderAddress.city ?? '',
    province: overrideAddress.province ?? orderAddress.province ?? '',
    postalCode: overrideAddress.postalCode ?? orderAddress.postalCode ?? '',
    country: overrideAddress.country ?? orderAddress.country ?? '',
    buzzCode: overrideAddress.buzzCode ?? orderAddress.buzzCode ?? '',
  };

  return {
    name: normalizeOptionalText(override.name) ?? normalizeOptionalText(user?.name) ?? '',
    email: normalizeOptionalText(user?.email) ?? '',
    phoneNumber: normalizePhoneNumber(override.phoneNumber) ?? normalizePhoneNumber(order.phoneNumber) ?? '',
    area: normalizeOptionalText(override.area) ?? normalizeOptionalText(order.area) ?? '',
    deliveryAddress: effectiveAddress,
    specialInstructions:
      normalizeSpecialInstructions(override.specialInstructions) ??
      normalizeSpecialInstructions(order.specialInstructions) ??
      '',
  };
}

