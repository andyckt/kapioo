"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type GoogleDerivedAreaInputProps = {
  id?: string;
  value: string;
  language?: "en" | "zh";
  className?: string;
  disabled?: boolean;
};

export function GoogleDerivedAreaInput({
  id = "province",
  value,
  language = "en",
  className,
  disabled = false,
}: GoogleDerivedAreaInputProps) {
  return (
    <Input
      id={id}
      name={id}
      value={value}
      readOnly
      disabled={disabled}
      aria-readonly="true"
      placeholder={
        language === "zh" ? "选择上方地址后自动填写" : "Select your address above"
      }
      className={cn("cursor-not-allowed bg-muted/60 text-muted-foreground", className)}
    />
  );
}
