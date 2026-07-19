const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ParsedEmailList = {
  valid: string[];
  invalid: string[];
  duplicateCount: number;
};

/** Split pasted text on newlines, commas, or semicolons; normalize and dedupe. */
export function parseEmailListFromText(text: string): ParsedEmailList {
  return parseEmailList(text.split(/[\n,;]+/));
}

export function parseEmailList(inputs: string[]): ParsedEmailList {
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;

  for (const raw of inputs) {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) continue;

    if (!EMAIL_REGEX.test(trimmed)) {
      invalid.push(raw.trim());
      continue;
    }

    if (seen.has(trimmed)) {
      duplicateCount++;
      continue;
    }

    seen.add(trimmed);
    valid.push(trimmed);
  }

  return { valid, invalid, duplicateCount };
}
