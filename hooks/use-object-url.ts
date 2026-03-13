"use client";

import { useState, useEffect } from "react";

/**
 * Creates a blob: object URL for a File, with automatic cleanup on unmount or when the file changes.
 * Use for displaying file previews in <img src={...} />. Avoids render-time URL.createObjectURL
 * and prevents memory leaks by revoking the URL when no longer needed.
 *
 * Edge cases handled:
 * - null/undefined file → returns null
 * - createObjectURL throws (corrupt/invalid file) → returns null, no leak
 * - Cleanup always revokes the URL to prevent memory leaks
 */
export function useObjectUrl(file: File | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }

    let objectUrl: string;

    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      setUrl(null);
      return;
    }

    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return url;
}
