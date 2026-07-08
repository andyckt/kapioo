"use client";

/**
 * Shared SSOT hook for Google-autocomplete address selection across all forms.
 *
 * Encapsulates:
 *  - Serviceability check (canDaily / canWeekly / any) against the registry
 *  - Toast messages for rejection, in zh and en
 *  - State shape: { streetAddress, postalCode, province (area label), country, buzzCode, unitNumber, addressGeo }
 *  - Clearing postal/area/geo when the street input changes
 *
 * Usage:
 *   const { address, serviceability, handleAddressSelect, handleStreetInputChange, reset } =
 *     useAddressSelection({ service: "daily", language: "zh" });
 */

import { useCallback, useState } from "react";

import { useToast } from "@/hooks/use-toast";
import type { AddressGeo } from "@/lib/contracts/common";
import type { ParsedGoogleAddress } from "@/lib/address/types";
import { resolveServiceability, type ServiceabilityResult } from "@/lib/zones/service-areas";

export type AddressSelectionState = {
  unitNumber: string;
  streetAddress: string;
  province: string;
  postalCode: string;
  country: string;
  buzzCode: string;
  addressGeo?: AddressGeo;
};

export const EMPTY_ADDRESS: AddressSelectionState = {
  unitNumber: "",
  streetAddress: "",
  province: "",
  postalCode: "",
  country: "Canada",
  buzzCode: "",
  addressGeo: undefined,
};

type UseAddressSelectionOptions = {
  /** Which service must be available at the selected address. */
  service: "daily" | "weekly" | "any";
  language: "zh" | "en";
  /** Initial address to pre-populate (e.g. from user profile). */
  initial?: Partial<AddressSelectionState>;
};

type UseAddressSelectionReturn = {
  address: AddressSelectionState;
  serviceability: ServiceabilityResult | null;
  handleAddressSelect: (result: ParsedGoogleAddress) => void;
  /** Call this when the user types into the street address input. Clears postal/area/geo. */
  handleStreetInputChange: (value: string) => void;
  setAddress: React.Dispatch<React.SetStateAction<AddressSelectionState>>;
  reset: () => void;
};

export function useAddressSelection({
  service,
  language,
  initial,
}: UseAddressSelectionOptions): UseAddressSelectionReturn {
  const { toast } = useToast();

  const [address, setAddress] = useState<AddressSelectionState>({
    ...EMPTY_ADDRESS,
    ...initial,
  });
  const [serviceability, setServiceability] = useState<ServiceabilityResult | null>(null);

  const handleAddressSelect = useCallback(
    (result: ParsedGoogleAddress) => {
      const postalCode = result.addressGeo.postalCode || result.address.postalCode || "";
      const areaLabel = result.address.province || "";

      const svc = resolveServiceability({ areaLabel, postalCode });
      setServiceability(svc);

      const canProceed =
        service === "daily"
          ? svc.canDaily
          : service === "weekly"
            ? svc.canWeekly
            : svc.isServed;

      if (!canProceed) {
        // Build rejection message based on service and what IS available
        let title: string;
        let description: string;

        if (language === "zh") {
          if (!svc.isServed) {
            title = "地址不在配送范围内";
            description = "此地址不在 Kapioo 配送范围内，请选择服务区域内的地址，或联系客服了解更多。";
          } else if (service === "daily" && svc.canWeekly) {
            title = "此地址暂不支持每日配送";
            description = "此地址目前不支持每日配送，但可以使用周餐盒服务。";
          } else {
            title = "地址不在服务范围内";
            description = "此地址不在配送范围内，请选择服务区域内的地址。";
          }
        } else {
          if (!svc.isServed) {
            title = "Address not in delivery area";
            description =
              "This address is not within Kapioo's delivery area. Please select a supported address or contact us for help.";
          } else if (service === "daily" && svc.canWeekly) {
            title = "Daily delivery not available";
            description =
              "Daily delivery is not available at this address yet, but weekly meal box service is available.";
          } else {
            title = "Address outside service area";
            description =
              "This address is not within Kapioo's delivery area. Please select an address in a supported area.";
          }
        }

        toast({ title, description, variant: "destructive" });
        setAddress((prev) => ({
          ...prev,
          streetAddress: "",
          postalCode: "",
          province: "",
          addressGeo: undefined,
        }));
        return;
      }

      setAddress((prev) => ({
        ...prev,
        streetAddress: result.address.streetAddress || "",
        postalCode,
        province: areaLabel,
        country: result.address.country || "Canada",
        addressGeo: result.addressGeo,
      }));
    },
    [service, language, toast]
  );

  const handleStreetInputChange = useCallback((value: string) => {
    setAddress((prev) => ({
      ...prev,
      streetAddress: value,
      postalCode: "",
      province: "",
      addressGeo: undefined,
    }));
    setServiceability(null);
  }, []);

  const reset = useCallback(() => {
    setAddress({ ...EMPTY_ADDRESS, ...initial });
    setServiceability(null);
  }, [initial]);

  return {
    address,
    serviceability,
    handleAddressSelect,
    handleStreetInputChange,
    setAddress,
    reset,
  };
}
