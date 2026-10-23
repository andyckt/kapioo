"use client";
import type { AddressGeo } from "@/lib/contracts/common";

export type SupportCheckoutAddress = {
  streetAddress: string; province: string; postalCode: string; country?: string;
  unitNumber?: string; buzzCode?: string; addressGeo: AddressGeo;
};
const key = "kapioo.assistant.checkoutAddress";
export function saveSupportCheckoutAddress(address: SupportCheckoutAddress) {
  try { sessionStorage.setItem(key, JSON.stringify({ address, expiresAt: Date.now() + 30 * 60_000 })); } catch {}
}
/** A prefill only: the existing address form still requires customer confirmation. */
export function getSupportCheckoutAddress(): SupportCheckoutAddress | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    if (!value || !Number.isFinite(value.expiresAt) || value.expiresAt < Date.now()) return;
    const address = value.address;
    if (!address?.streetAddress || !address.postalCode || !address.province || !address.addressGeo?.placeId) return;
    return address;
  } catch { return; }
}
export function clearSupportCheckoutAddress() { try { sessionStorage.removeItem(key); } catch {} }
