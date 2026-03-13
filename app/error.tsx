"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="max-w-md space-y-4 text-center">
        <h2 className="text-xl font-semibold text-foreground">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground">
          We encountered an unexpected error. Please try again or return home.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          variant="outline"
          onClick={() => reset()}
          className="bg-[#fff6ef] hover:bg-[#f5ebe0]"
        >
          Try again
        </Button>
        <Button asChild className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </div>
  );
}
