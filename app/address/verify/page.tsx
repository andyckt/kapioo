"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AddressAutocomplete } from "@/components/address-autocomplete";
import { GoogleDerivedAreaInput } from "@/components/google-derived-area-input";
import { GoogleDerivedPostalCodeInput } from "@/components/google-derived-postal-code-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useClientAuth } from "@/lib/client-auth";
import { mergeStoredUser } from "@/lib/client-user-cache";
import { useAddressSelection } from "@/hooks/use-address-selection";
import { getStarterAddressSelection } from "@/lib/plan-flow-state";

export default function VerifyAddressPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { authenticated, status, user, refreshAuthState } = useClientAuth();
  const language = user?.languagePreference === "zh" ? "zh" : "en";
  const [unitNumber, setUnitNumber] = useState("");
  const [buzzCode, setBuzzCode] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [fromPage, setFromPage] = useState<string | null>(null);
  const [planIdentifier, setPlanIdentifier] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFromPage(params.get("from"));
    setPlanIdentifier(params.get("plan"));
  }, []);

  const { address, handleAddressSelect, handleStreetInputChange, setAddress } =
    useAddressSelection({ service: "any", language });

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

    // Pre-fill from starter flow if user entered address on marketing page before signing up
    const starterSelection = getStarterAddressSelection();

    setUnitNumber(user.address?.unitNumber || "");
    setBuzzCode(user.address?.buzzCode || "");
    setDeliveryNotes(user.deliveryNotes || "");
    setAddress((prev) => ({
      ...prev,
      streetAddress: starterSelection?.streetAddress || user.address?.streetAddress || "",
      postalCode: starterSelection?.postalCode || user.address?.postalCode || "",
      province: starterSelection?.areaLabel || user.address?.province || "",
    }));
  }, [authenticated, router, status, user, setAddress]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?._id) return;

    if (!address.streetAddress.trim() || !address.postalCode.trim() || !address.province.trim()) {
      toast({
        title: language === "zh" ? "资料不完整" : "Missing information",
        description: language === "zh"
          ? "请从地址建议中选择配送地址。"
          : "Please select your delivery address from the suggestions.",
        variant: "destructive",
      });
      return;
    }

    if (!address.addressGeo) {
      toast({
        title: language === "zh" ? "请选择 Google 地址" : "Select a Google address",
        description: language === "zh"
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
            unitNumber,
            streetAddress: address.streetAddress,
            province: address.province,
            postalCode: address.postalCode,
            country: address.country || "Canada",
            buzzCode,
          },
          addressGeo: address.addressGeo,
          deliveryNotes,
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
        description: language === "zh"
          ? "您的配送地址已更新。"
          : "Your delivery address has been updated.",
      });

      // Redirect to plan page if user came from a plan flow, otherwise dashboard
      if (fromPage === "daily-delivery") {
        const url = planIdentifier
          ? `/dashboard?tab=meal-vouchers&selectPlan=true&plan=${planIdentifier}`
          : `/dashboard?tab=meal-vouchers&selectPlan=true`;
        router.replace(url);
      } else if (fromPage === "weekly-meal") {
        const url = planIdentifier
          ? `/dashboard?tab=credits&selectPlan=true&plan=${planIdentifier}`
          : `/dashboard?tab=credits&selectPlan=true`;
        router.replace(url);
      } else {
        router.replace("/dashboard");
      }
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
              value={address.streetAddress}
              language={language}
              disabled={isSaving}
              onInputChange={handleStreetInputChange}
              onAddressSelect={handleAddressSelect}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitNumber">{language === "zh" ? "单元/公寓号" : "Unit/Apt number"}</Label>
            <Input
              id="unitNumber"
              value={unitNumber}
              onChange={(event) => setUnitNumber(event.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="province">
              {language === "zh" ? "配送区域" : "Delivery area"} <span className="text-red-500">*</span>
            </Label>
            <GoogleDerivedAreaInput
              id="province"
              value={address.province}
              language={language}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode">
              {language === "zh" ? "邮编" : "Postal code"} <span className="text-red-500">*</span>
            </Label>
            <GoogleDerivedPostalCodeInput
              id="postalCode"
              value={address.postalCode}
              language={language}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="buzzCode">{language === "zh" ? "门禁/蜂鸣码" : "Buzz/entry code"}</Label>
            <Input
              id="buzzCode"
              value={buzzCode}
              onChange={(event) => setBuzzCode(event.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="deliveryNotes">{language === "zh" ? "配送备注" : "Delivery notes"}</Label>
            <Textarea
              id="deliveryNotes"
              value={deliveryNotes}
              onChange={(event) => setDeliveryNotes(event.target.value)}
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
            ? (language === "zh" ? "保存中..." : "Saving...")
            : (language === "zh" ? "保存并继续" : "Save and continue")}
        </Button>
      </form>
    </div>
  );
}
