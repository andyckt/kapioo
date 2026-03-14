import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { ALL_WEEKLY_AREAS } from '@/lib/constants/areas';
import WeeklyOrder from '@/models/WeeklyOrder';
import {
  getOrderOnlyOverrideMeta,
  hasOrderCustomerOverride,
  normalizeOptionalText,
  normalizePhoneNumber,
  resolveEffectiveOrderCustomerInfo,
  type DeliveryAddress,
  type OrderCustomerOverride,
} from '@/lib/orders/effective-customer-info';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

function hasOwn<T extends object>(obj: T, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function hasAddressValue(address?: DeliveryAddress): boolean {
  if (!address) return false;
  return Object.values(address).some((value) => Boolean(normalizeOptionalText(value)));
}

function sanitizeAddressPatch(value: unknown): DeliveryAddress | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Record<string, unknown>;
  return {
    unitNumber: normalizeOptionalText(input.unitNumber as string),
    streetAddress: normalizeOptionalText(input.streetAddress as string),
    postalCode: normalizeOptionalText(input.postalCode as string),
    country: normalizeOptionalText(input.country as string),
    buzzCode: normalizeOptionalText(input.buzzCode as string),
  };
}

function toComparable(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function displayValue(value: unknown): string {
  const normalized = toComparable(value);
  return normalized || '(empty)';
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();

    const body = await request.json();

    const order = await WeeklyOrder.findOne({ orderId: id }).lean();
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const user = order?.userId ? await User.findById(order.userId).select('name email').lean() : null;
    const effectiveBefore = resolveEffectiveOrderCustomerInfo(order as any, user as any);

    const currentOverride: OrderCustomerOverride = order.orderCustomerOverride || {};
    const nextOverride: OrderCustomerOverride = {
      ...currentOverride,
      deliveryAddress: { ...(currentOverride.deliveryAddress || {}) },
    };

    let hasPatchField = false;

    const changedFields: string[] = [];
    const changedDetails: Array<{ field: string; from: string; to: string }> = [];

    if (hasOwn(body, 'name')) {
      hasPatchField = true;
      const previous = normalizeOptionalText(effectiveBefore.name);
      nextOverride.name = normalizeOptionalText(body.name as string);
      if (toComparable(previous) !== toComparable(nextOverride.name)) {
        changedFields.push('name');
        changedDetails.push({
          field: 'name',
          from: displayValue(previous),
          to: displayValue(nextOverride.name)
        });
      }
    }

    if (hasOwn(body, 'phoneNumber')) {
      hasPatchField = true;
      const previous = normalizePhoneNumber(effectiveBefore.phoneNumber);
      nextOverride.phoneNumber = normalizePhoneNumber(body.phoneNumber as string);
      if (toComparable(previous) !== toComparable(nextOverride.phoneNumber)) {
        changedFields.push('phone number');
        changedDetails.push({
          field: 'phone number',
          from: displayValue(previous),
          to: displayValue(nextOverride.phoneNumber)
        });
      }
    }

    if (hasOwn(body, 'area')) {
      hasPatchField = true;
      const previous = normalizeOptionalText(effectiveBefore.area);
      const normalizedArea = normalizeOptionalText(body.area as string);
      if (normalizedArea && !ALL_WEEKLY_AREAS.includes(normalizedArea as any)) {
        return NextResponse.json({ success: false, error: 'Invalid area value' }, { status: 400 });
      }
      nextOverride.area = normalizedArea;
      if (toComparable(previous) !== toComparable(nextOverride.area)) {
        changedFields.push('area');
        changedDetails.push({
          field: 'area',
          from: displayValue(previous),
          to: displayValue(nextOverride.area)
        });
      }
    }

    if (hasOwn(body, 'specialInstructions')) {
      hasPatchField = true;
      const previous = normalizeOptionalText(effectiveBefore.specialInstructions);
      nextOverride.specialInstructions = normalizeOptionalText(body.specialInstructions as string);
      if (toComparable(previous) !== toComparable(nextOverride.specialInstructions)) {
        changedFields.push('special request');
        changedDetails.push({
          field: 'special request',
          from: displayValue(previous),
          to: displayValue(nextOverride.specialInstructions)
        });
      }
    }

    if (hasOwn(body, 'deliveryAddress')) {
      hasPatchField = true;
      const previousAddress = effectiveBefore.deliveryAddress || {};
      if (body.deliveryAddress === null) {
        const hadAddressValues = Object.values(previousAddress).some((value) => Boolean(normalizeOptionalText(value)));
        nextOverride.deliveryAddress = {};
        if (hadAddressValues) {
          changedFields.push('address');
          const fieldMap: Array<{ key: keyof DeliveryAddress; label: string }> = [
            { key: 'unitNumber', label: 'unit number' },
            { key: 'streetAddress', label: 'street address' },
            { key: 'postalCode', label: 'postal code' },
            { key: 'country', label: 'country' },
            { key: 'buzzCode', label: 'buzz code' }
          ];
          for (const field of fieldMap) {
            const before = normalizeOptionalText(previousAddress[field.key]);
            if (toComparable(before)) {
              changedDetails.push({
                field: field.label,
                from: displayValue(before),
                to: '(empty)'
              });
            }
          }
        }
      } else {
        const addressPatch = sanitizeAddressPatch(body.deliveryAddress);
        if (!addressPatch) {
          return NextResponse.json({ success: false, error: 'Invalid deliveryAddress payload' }, { status: 400 });
        }
        nextOverride.deliveryAddress = {
          ...(nextOverride.deliveryAddress || {}),
          ...addressPatch,
        };

        const fieldMap: Array<{ key: keyof DeliveryAddress; label: string }> = [
          { key: 'unitNumber', label: 'unit number' },
          { key: 'streetAddress', label: 'street address' },
          { key: 'postalCode', label: 'postal code' },
          { key: 'country', label: 'country' },
          { key: 'buzzCode', label: 'buzz code' }
        ];

        for (const field of fieldMap) {
          if (Object.prototype.hasOwnProperty.call(addressPatch, field.key)) {
            const before = normalizeOptionalText(previousAddress[field.key]);
            const after = normalizeOptionalText((nextOverride.deliveryAddress || {})[field.key]);
            if (toComparable(before) !== toComparable(after)) {
              changedFields.push(field.label);
              changedDetails.push({
                field: field.label,
                from: displayValue(before),
                to: displayValue(after)
              });
            }
          }
        }
      }
    }

    if (!hasPatchField) {
      return NextResponse.json({ success: false, error: 'No editable fields provided' }, { status: 400 });
    }

    const shouldPersistOverride =
      Boolean(nextOverride.name) ||
      Boolean(nextOverride.phoneNumber) ||
      Boolean(nextOverride.area) ||
      Boolean(nextOverride.specialInstructions) ||
      hasAddressValue(nextOverride.deliveryAddress);

    const adminMarker =
      request.headers.get('x-admin-email') ||
      request.headers.get('x-admin-id') ||
      'admin';

    const now = new Date();
    const uniqueChangedFields = Array.from(new Set(changedFields));
    const shouldLog = uniqueChangedFields.length > 0;
    const changeLogEntry = shouldLog
      ? {
          updatedAt: now,
          updatedBy: adminMarker,
          changedFields: uniqueChangedFields,
          changedDetails
        }
      : null;

    if (shouldPersistOverride) {
      nextOverride.updatedAt = now;
      nextOverride.updatedBy = adminMarker;

      const updateDoc: Record<string, any> = { $set: { orderCustomerOverride: nextOverride } };
      if (changeLogEntry) {
        updateDoc.$push = {
          orderCustomerOverrideLogs: {
            $each: [changeLogEntry],
            $slice: -30
          }
        };
      }

      await WeeklyOrder.findOneAndUpdate({ orderId: id }, updateDoc, { strict: false });
    } else {
      const updateDoc: Record<string, any> = { $unset: { orderCustomerOverride: '' } };
      if (changeLogEntry) {
        updateDoc.$push = {
          orderCustomerOverrideLogs: {
            $each: [changeLogEntry],
            $slice: -30
          }
        };
      }

      await WeeklyOrder.findOneAndUpdate({ orderId: id }, updateDoc, { strict: false });
    }

    const updatedOrder = await WeeklyOrder.findOne({ orderId: id }).lean();
    const updatedUser = updatedOrder?.userId ? await User.findById(updatedOrder.userId).select('name email').lean() : null;
    const effectiveCustomerInfo = resolveEffectiveOrderCustomerInfo(updatedOrder || {}, updatedUser as any);

    return NextResponse.json({
      success: true,
      data: {
        ...updatedOrder,
        user: updatedUser,
        effectiveCustomerInfo,
        hasOrderOnlyOverride: hasOrderCustomerOverride(updatedOrder || {}),
        orderOnlyOverrideMeta: getOrderOnlyOverrideMeta(updatedOrder || {}),
      },
    });
  } catch (error: any) {
    console.error('Error updating weekly order customer info override:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order customer info', details: error.message },
      { status: 500 }
    );
  }
}

