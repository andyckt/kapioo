"use client";

import { Loader2, MapPin, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlacesAutocomplete } from "@/hooks/use-places-autocomplete";
import type { ParsedGoogleAddress } from "@/lib/address/types";
import { cn } from "@/lib/utils";

type AddressAutocompleteProps = {
  value: string;
  language: "en" | "zh";
  disabled?: boolean;
  placeholder?: string;
  onInputChange: (value: string) => void;
  onAddressSelect: (result: ParsedGoogleAddress) => void;
};

export function AddressAutocomplete({
  value,
  language,
  disabled = false,
  placeholder,
  onInputChange,
  onAddressSelect,
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const {
    suggestions,
    isLoading,
    error,
    retry,
    selectSuggestion,
  } = usePlacesAutocomplete(value);

  const trimmed = value.trim();
  const showPanel = open && trimmed.length >= 3;

  const inputClassName = cn(
    "pr-10 rounded-md border-[#C2884E]/25 bg-white text-[#6B5F53] placeholder:text-[#6B5F53]/45",
    "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#C2884E]",
    showPanel && "rounded-b-none border-b-0 border-[#C2884E]"
  );

  const panelClassName = cn(
    "absolute z-50 mt-0 max-h-60 w-full overflow-auto rounded-b-md rounded-t-none",
    "border border-t-0 border-[#C2884E] bg-white shadow-sm"
  );

  const handleSelect = async (suggestion: (typeof suggestions)[number]) => {
    try {
      setSelectingId(suggestion.id);
      const parsed = await selectSuggestion(suggestion);
      onAddressSelect(parsed);
      setOpen(false);
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <div className="relative">
      <Input
        value={value}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-autocomplete="list"
        placeholder={
          placeholder ||
          (language === "zh" ? "输入配送地址..." : "Enter delivery address...")
        }
        onChange={(event) => {
          onInputChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        className={inputClassName}
      />
      <MapPin
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2",
          open ? "text-[#C2884E]/70" : "text-[#C2884E]/40"
        )}
      />

      {showPanel && (
        <div role="listbox" className={panelClassName}>
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {language === "zh" ? "正在搜索地址..." : "Searching addresses..."}
            </div>
          )}

          {error ? (
            <div className="space-y-2 px-3 py-3 text-sm">
              <p className="text-destructive">
                {language === "zh"
                  ? "无法加载 Google 地址建议，请检查网络连接后重试。"
                  : "Unable to load address suggestions. Please check your connection and try again."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={retry}>
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  {language === "zh" ? "重试" : "Retry"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {language === "zh"
                  ? "如问题持续，请联系客服：kapioomeal@gmail.com"
                  : "If the issue persists, contact us at kapioomeal@gmail.com"}
              </p>
            </div>
          ) : (
            <>
              {!isLoading && suggestions.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  {language === "zh" ? "没有找到地址" : "No address found"}
                </p>
              )}

              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  role="option"
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[#FFF6EF] focus-visible:bg-[#FFF6EF] focus-visible:outline-none"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void handleSelect(suggestion)}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#C2884E]/50" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{suggestion.mainText}</div>
                    {suggestion.secondaryText && (
                      <div className="truncate text-xs text-muted-foreground">
                        {suggestion.secondaryText}
                      </div>
                    )}
                  </div>
                  {selectingId === suggestion.id && (
                    <Loader2 className="ml-auto h-4 w-4 shrink-0 animate-spin" />
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
