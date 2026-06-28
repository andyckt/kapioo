"use client";

import { Loader2, MapPin, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePlacesAutocomplete } from "@/hooks/use-places-autocomplete";
import { buildManualAddressGeo } from "@/lib/address/parse-google-place";
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
    resetSession,
    selectSuggestion,
  } = usePlacesAutocomplete(value);

  const useManualAddress = () => {
    const streetAddress = value.trim();
    if (!streetAddress) return;

    onAddressSelect({
      address: {
        streetAddress,
        country: "Canada",
      },
      addressGeo: buildManualAddressGeo({
        streetAddress,
        country: "Canada",
      }),
    });
    resetSession();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between text-left font-normal", !value && "text-muted-foreground")}
          disabled={disabled}
        >
          <span className="truncate">
            {value || placeholder || (language === "zh" ? "搜索配送地址..." : "Search delivery address...")}
          </span>
          <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={value}
            onValueChange={onInputChange}
            placeholder={placeholder || (language === "zh" ? "输入街道地址..." : "Type street address...")}
          />
          <CommandList>
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
                    ? "无法加载 Google 地址建议。"
                    : "Unable to load Google address suggestions."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={retry}>
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                    {language === "zh" ? "重试" : "Retry"}
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={useManualAddress}>
                    {language === "zh" ? "使用手动地址" : "Use manual address"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {!isLoading && value.trim().length >= 3 && suggestions.length === 0 && (
                  <CommandEmpty>
                    {language === "zh" ? "没有找到地址" : "No address found"}
                  </CommandEmpty>
                )}

                <CommandGroup>
                  {suggestions.map((suggestion) => (
                    <CommandItem
                      key={suggestion.id}
                      value={`${suggestion.mainText} ${suggestion.secondaryText}`}
                      onSelect={async () => {
                        try {
                          setSelectingId(suggestion.id);
                          const parsed = await selectSuggestion(suggestion);
                          onAddressSelect(parsed);
                          setOpen(false);
                        } finally {
                          setSelectingId(null);
                        }
                      }}
                    >
                      <MapPin className="mr-2 h-4 w-4 shrink-0 opacity-60" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{suggestion.mainText}</div>
                        {suggestion.secondaryText && (
                          <div className="truncate text-xs text-muted-foreground">{suggestion.secondaryText}</div>
                        )}
                      </div>
                      {selectingId === suggestion.id && (
                        <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
