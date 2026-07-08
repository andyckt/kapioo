"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type GoogleDerivedPostalCodeInputProps = {
  id?: string;
  value: string;
  language?: "en" | "zh";
  className?: string;
  disabled?: boolean;
};

export function GoogleDerivedPostalCodeInput({
  id = "postalCode",
  value,
  language = "en",
  className,
  disabled = false,
}: GoogleDerivedPostalCodeInputProps) {
  return (
    <Input
      id={id}
      name={id}
      value={value}
      readOnly
      disabled={disabled}
      aria-readonly="true"
      placeholder={
        language === "zh" ? "请从地址建议中选择" : "Filled when you select an address"
      }
      className={cn("cursor-not-allowed bg-muted/60 text-muted-foreground", className)}
    />
  );
}
