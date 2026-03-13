"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-12 bg-[#fff6ef]/50">
        <div className="max-w-md space-y-4 text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground">
            We encountered an unexpected error. Please try again or return home.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md border border-input bg-[#fff6ef] px-4 py-2 text-sm font-medium hover:bg-[#f5ebe0]"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-md bg-gradient-to-r from-[#C2884E] to-[#D1A46C] px-4 py-2 text-sm font-medium text-white no-underline hover:opacity-90"
          >
            Return home
          </a>
        </div>
      </body>
    </html>
  );
}
