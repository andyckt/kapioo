"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AddressAutocomplete } from "@/components/address-autocomplete";
import { Button } from "@/components/ui/button";
import { GoogleDerivedPostalCodeInput } from "@/components/google-derived-postal-code-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { ParsedGoogleAddress } from "@/lib/address/types";
import { ALL_AREAS } from "@/lib/constants/areas";
import { useClientAuth } from "@/lib/client-auth";
import { mergeStoredUser } from "@/lib/client-user-cache";
import { resolveServiceability } from "@/lib/zones/service-areas";

type VerifyAddressForm = {
  unitNumber: string;
  streetAddress: string;
  province: string;
  postalCode: string;
  country: string;
  buzzCode: string;
  deliveryNotes: string;
};

const INITIAL_FORM: VerifyAddressForm = {
  unitNumber: "",
  streetAddress: "",
  province: "",
  postalCode: "",
  country: "Canada",
  buzzCode: "",
  deliveryNotes: "",
};


export default function VerifyAddressPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { authenticated, status, user, refreshAuthState } = useClientAuth();
  const language = user?.languagePreference === "zh" ? "zh" : "en";
  const [form, setForm] = useState<VerifyAddressForm>(INITIAL_FORM);
  const [selectedAddress, setSelectedAddress] = useState<ParsedGoogleAddress | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status !== "ready") return;
    if (!authenticated || !user) {
      router.replace("/login");
      return;
    }

    if (user.addressVerified) {
      router.replace("/dashboard");
      return;
    }

    setForm({
      unitNumber: user.address?.unitNumber || "",
      streetAddress: user.address?.streetAddress || "",
      province: user.address?.province || "",
      postalCode: user.address?.postalCode || "",
      country: user.address?.country || "Canada",
      buzzCode: user.address?.buzzCode || "",
      deliveryNotes: user.deliveryNotes || "",
    });
  }, [authenticated, router, status, user]);

  const updateForm = (patch: Partial<VerifyAddressForm>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleAddressSelect = (result: ParsedGoogleAddress) => {
    const serviceability = resolveServiceability({
      areaLabel: result.address.province,
      postalCode: result.addressGeo.postalCode || result.address.postalCode,
    });
    if (!serviceability.isServed) {
      toast({
        title: language === "zh" ? "地址不在服务范围内" : "Address outside service area",
        description:
          language === "zh"
            ? "此地址不在 Kapioo 配送范围内，请选择服务区域内的地址。"
            : "This address is not within Kapioo's delivery area. Please select an address in a supported area.",
        variant: "destructive",
      });
      updateForm({ streetAddress: "", postalCode: "" });
      return;
    }
    setSelectedAddress(result);
    updateForm({
      streetAddress: result.address.streetAddress || "",
      postalCode: result.addressGeo.postalCode || result.address.postalCode || "",
      country: result.address.country || "Canada",
      province: result.address.province,
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?._id) return;

    if (!form.streetAddress.trim() || !form.postalCode.trim() || !form.province.trim()) {
      toast({
        title: language === "zh" ? "资料不完整" : "Missing information",
        description: language === "zh" ? "请选择地址并填写配送区域。" : "Please select an address and delivery area.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedAddress?.addressGeo) {
      toast({
        title: language === "zh" ? "请选择 Google 地址" : "Select a Google address",
        description:
          language === "zh"
            ? "请从地址建议中选择配送地址。"
            : "Please choose your delivery address from the suggestions.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/users/${user._id}/verify-address`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: {
            unitNumber: form.unitNumber,
            streetAddress: form.streetAddress,
            province: form.province,
            postalCode: form.postalCode,
            country: form.country || "Canada",
            buzzCode: form.buzzCode,
          },
          addressGeo: selectedAddress.addressGeo,
          deliveryNotes: form.deliveryNotes,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to save address");
      }

      mergeStoredUser(result.data);
      await refreshAuthState({ force: true });
      toast({
        title: language === "zh" ? "地址已验证" : "Address verified",
        description:
          language === "zh"
            ? "您的配送地址已更新。"
            : "Your delivery address has been updated.",
      });
      router.replace("/dashboard");
    } catch (error) {
      toast({
        title: language === "zh" ? "保存失败" : "Save failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (status !== "ready" || !authenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fff6ef]/50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#C2884E]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff6ef]/50 px-4 py-10">
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 rounded-xl bg-white p-6 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#C2884E]">
            {language === "zh" ? "请更新配送地址" : "Update your delivery address"}
          </h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>
              {language === "zh" ? "配送地址" : "Delivery address"} <span className="text-red-500">*</span>
            </Label>
            <AddressAutocomplete
              value={form.streetAddress}
              language={language}
              disabled={isSaving}
              onInputChange={(value) => {
                updateForm({ streetAddress: value, postalCode: "" });
                setSelectedAddress(null);
              }}
              onAddressSelect={handleAddressSelect}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitNumber">{language === "zh" ? "单元/公寓号" : "Unit/Apt number"}</Label>
            <Input
              id="unitNumber"
              value={form.unitNumber}
              onChange={(event) => updateForm({ unitNumber: event.target.value })}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode">
              {language === "zh" ? "邮编" : "Postal code"} <span className="text-red-500">*</span>
            </Label>
            <GoogleDerivedPostalCodeInput
              id="postalCode"
              value={form.postalCode}
              language={language}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label>
              {language === "zh" ? "配送区域" : "Delivery area"} <span className="text-red-500">*</span>
            </Label>
            <Select value={form.province} onValueChange={(value) => updateForm({ province: value })} disabled={isSaving}>
              <SelectTrigger>
                <SelectValue placeholder={language === "zh" ? "选择配送区域" : "Select delivery area"} />
              </SelectTrigger>
              <SelectContent>
                {ALL_AREAS.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buzzCode">{language === "zh" ? "门禁/蜂鸣码" : "Buzz/entry code"}</Label>
            <Input
              id="buzzCode"
              value={form.buzzCode}
              onChange={(event) => updateForm({ buzzCode: event.target.value })}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="deliveryNotes">{language === "zh" ? "配送备注" : "Delivery notes"}</Label>
            <Textarea
              id="deliveryNotes"
              value={form.deliveryNotes}
              onChange={(event) => updateForm({ deliveryNotes: event.target.value })}
              disabled={isSaving}
              placeholder={
                language === "zh"
                  ? "例如：放门口、请电话联系等"
                  : "Example: leave at door, call on arrival, concierge instructions"
              }
            />
          </div>
        </div>

        <Button type="submit" className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]" disabled={isSaving}>
          {isSaving
            ? language === "zh"
              ? "保存中..."
              : "Saving..."
            : language === "zh"
              ? "保存并继续"
              : "Save and continue"}
        </Button>
      </form>
    </div>
  );
}
