"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  size?: "sm" | "md";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

const SIZE_MAP = {
  sm: "w-3.5 h-3.5",
  md: "w-5 h-5",
} as const;

const GAP_MAP = {
  sm: "gap-0.5",
  md: "gap-1",
} as const;

export function StarRating({
  rating,
  size = "md",
  interactive = false,
  onChange,
  className,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number>(0);

  const displayRating = interactive && hoverRating > 0 ? hoverRating : rating;
  const iconSize = SIZE_MAP[size];
  const gap = GAP_MAP[size];

  return (
    <div
      className={cn("inline-flex items-center", gap, className)}
      onMouseLeave={() => interactive && setHoverRating(0)}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const starIndex = i + 1;
        const isFilled = starIndex <= displayRating;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            className={cn(
              "transition-all duration-150 flex-shrink-0",
              interactive
                ? "cursor-pointer hover:scale-110 active:scale-95"
                : "cursor-default",
              isFilled ? "text-warning" : "text-text-tertiary"
            )}
            onClick={() => interactive && onChange?.(starIndex)}
            onMouseEnter={() => interactive && setHoverRating(starIndex)}
            aria-label={`${starIndex} star${starIndex > 1 ? "s" : ""}`}
          >
            <Star
              className={cn(iconSize, isFilled && "fill-current")}
            />
          </button>
        );
      })}
    </div>
  );
}
