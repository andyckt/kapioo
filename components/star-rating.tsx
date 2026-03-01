"use client";

import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
  className,
}: StarRatingProps) {
  const iconSize = sizeClasses[size];

  return (
    <div className={cn("flex gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange?.(star);
            }
          }}
          className={cn(
            "transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2884E] focus-visible:ring-offset-2 rounded p-0.5",
            !readonly && "hover:scale-110 active:scale-95 cursor-pointer",
            readonly && "cursor-default"
          )}
          aria-label={`${star} stars`}
          aria-pressed={value >= star}
        >
          <Star
            className={cn(
              iconSize,
              value >= star
                ? "fill-[#C2884E] text-[#C2884E]"
                : "fill-transparent text-[#C2884E]/30"
            )}
          />
        </button>
      ))}
    </div>
  );
}
