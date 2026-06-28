import type { Address, AddressGeo } from "@/lib/contracts/common";

export type VerifiedAddressPayload = {
  address: Address;
  addressGeo: AddressGeo;
  deliveryNotes?: string;
};

export type ParsedGoogleAddress = {
  address: Address;
  addressGeo: AddressGeo;
};

export type GoogleAddressComponentLike = {
  longText?: string;
  shortText?: string;
  long_name?: string;
  short_name?: string;
  types?: string[];
};

export type GooglePlaceLike = {
  id?: string;
  formattedAddress?: string;
  formatted_address?: string;
  location?: {
    lat?: number | (() => number);
    lng?: number | (() => number);
  };
  addressComponents?: GoogleAddressComponentLike[];
  address_components?: GoogleAddressComponentLike[];
};
