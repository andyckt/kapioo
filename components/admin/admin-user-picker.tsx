"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getUserDisplayName } from "@/lib/users/display";
import { cn, getUsers, type User } from "@/lib/utils";

type AdminUserPickerProps = {
  id?: string;
  label: string;
  value: User | null;
  onChange: (user: User | null) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function AdminUserPicker({
  id,
  label,
  value,
  onChange,
  disabled = false,
  placeholder = "Search for a user...",
}: AdminUserPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  const searchUsers = (query: string) => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    searchTimerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const { users } = await getUsers(1, 20, trimmed, "all");
          setSearchResults(users);
        } catch {
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 300);
  };

  const displayValue = value
    ? `${getUserDisplayName(value)} (${value.userID}) · ${value.email}`
    : placeholder;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{displayValue}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[300px]">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name, email, or user ID..."
              className="h-9"
              onValueChange={(nextValue) => {
                searchUsers(nextValue);
              }}
            />
            <CommandList>
              <CommandEmpty>{searchLoading ? "Searching..." : "No users found."}</CommandEmpty>
              <CommandGroup>
                {searchLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : (
                  searchResults.map((user) => (
                    <CommandItem
                      key={user._id}
                      value={`${getUserDisplayName(user)} ${user.nickname || ""} ${user.userID} ${user.email}`}
                      onSelect={() => {
                        onChange(user);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value?._id === user._id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {getUserDisplayName(user)} ({user.userID})
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
