import { createHash } from "node:crypto";

import { simpleParser } from "mailparser";

import { normalizeEmail, normalizeInteracReference } from "./config";

export const INTERAC_RECEIPT_PARSER_VERSION = "1";

export interface ParsedInteracReceipt {
  reference: string;
  referenceNormalized: string;
  gmailMessageId: string;
  payerEmail: string;
  payerEmailNormalized: string;
  senderName: string;
  recipientEmail: string;
  amountCents: number;
  currency: "CAD";
  depositedAt: Date;
  receivedAt: Date;
  accountLast4?: string;
  subject: string;
  rawSha256: string;
  parserVersion: string;
  authenticationVerified: true;
}

export class InteracReceiptValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InteracReceiptValidationError";
  }
}

function unfoldRawHeaders(source: Buffer) {
  const text = source.toString("utf8");
  const headerEnd = text.search(/\r?\n\r?\n/);
  const headers = headerEnd >= 0 ? text.slice(0, headerEnd) : text;
  return headers.replace(/\r?\n[\t ]+/g, " ").split(/\r?\n/);
}

function getFirstRawHeader(source: Buffer, name: string) {
  const prefix = `${name.toLowerCase()}:`;
  const line = unfoldRawHeaders(source).find((entry) => entry.toLowerCase().startsWith(prefix));
  return line ? line.slice(line.indexOf(":") + 1).trim() : "";
}

function assertGmailAuthentication(source: Buffer) {
  const result = getFirstRawHeader(source, "Authentication-Results");
  const normalized = result.toLowerCase();
  if (!normalized.startsWith("mx.google.com;")) {
    throw new InteracReceiptValidationError("Receipt lacks trusted Gmail authentication results");
  }
  if (!/\bdkim=pass\b[^;]*\bheader\.i=@payments\.interac\.ca\b/i.test(result)) {
    throw new InteracReceiptValidationError("Interac DKIM verification did not pass");
  }
  const spfMailFrom = result.match(/\bspf=pass\b[^;]*\bsmtp\.mailfrom=([^;\s]+)/i)?.[1] || "";
  const spfAligned = /^[^@;\s]+@(?:mail\.)?payments\.interac\.ca$/i.test(spfMailFrom);
  if (
    !spfAligned ||
    !/\bdmarc=pass\b[^;]*\bheader\.from=payments\.interac\.ca\b/i.test(result)
  ) {
    throw new InteracReceiptValidationError("Interac SPF or DMARC verification did not pass");
  }
}

function parseAmountCents(rawAmount: string) {
  const normalized = rawAmount.replace(/,/g, "");
  if (!/^\d+\.\d{2}$/.test(normalized)) {
    throw new InteracReceiptValidationError("Receipt amount is not in the expected format");
  }
  const [dollars, cents] = normalized.split(".");
  const value = Number(dollars) * 100 + Number(cents);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new InteracReceiptValidationError("Receipt amount is invalid");
  }
  return value;
}

function oneMatch(body: string, pattern: RegExp, label: string) {
  const matches = [...body.matchAll(pattern)];
  if (matches.length !== 1 || !matches[0][1]) {
    throw new InteracReceiptValidationError(`Receipt has an ambiguous or missing ${label}`);
  }
  return matches[0][1].trim();
}

export async function parseInteracReceipt(
  source: Buffer,
  options: {
    expectedRecipient: string;
    expectedAccountLast4?: string;
    receivedAt?: Date;
  }
): Promise<ParsedInteracReceipt> {
  assertGmailAuthentication(source);
  const parsed = await simpleParser(source, { skipImageLinks: true });
  const from = normalizeEmail(parsed.from?.value[0]?.address || "");
  if (from !== "notify@payments.interac.ca") {
    throw new InteracReceiptValidationError("Receipt sender is not Interac");
  }

  const expectedRecipient = normalizeEmail(options.expectedRecipient);
  const recipients = (parsed.to && "value" in parsed.to ? parsed.to.value : [])
    .map((entry) => normalizeEmail(entry.address || ""));
  if (!recipients.includes(expectedRecipient)) {
    throw new InteracReceiptValidationError("Receipt was not addressed to the Kapioo mailbox");
  }

  const subject = parsed.subject?.trim() || "";
  const subjectMatch = subject.match(
    /^Interac e-Transfer: You've received \$([\d,]+\.\d{2}) from (.+) and it has been automatically deposited\.$/i
  );
  if (!subjectMatch) {
    throw new InteracReceiptValidationError("Receipt does not confirm an automatic deposit");
  }

  const body = parsed.text?.replace(/\r/g, "") || "";
  if (!/Funds Deposited!/i.test(body) || !/funds have been automatically deposited into your account at/i.test(body)) {
    throw new InteracReceiptValidationError("Receipt body does not confirm completed deposit");
  }

  const amountText = oneMatch(body, /^Amount:\s*\$([\d,]+\.\d{2})\s*\(CAD\)\s*$/gim, "amount");
  const subjectAmountCents = parseAmountCents(subjectMatch[1]);
  const amountCents = parseAmountCents(amountText);
  if (amountCents !== subjectAmountCents) {
    throw new InteracReceiptValidationError("Receipt subject and body amounts differ");
  }

  const senderName = oneMatch(body, /^Sent From:\s*(.+?)\s*$/gim, "sender name");
  if (senderName.localeCompare(subjectMatch[2].trim(), undefined, { sensitivity: "base" }) !== 0) {
    throw new InteracReceiptValidationError("Receipt subject and body sender names differ");
  }

  const reference = oneMatch(body, /^Reference Number:\s*([A-Za-z0-9-]+)\s*$/gim, "reference number");
  const referenceNormalized = normalizeInteracReference(reference);
  if (!/^[A-Z0-9]{8,24}$/.test(referenceNormalized)) {
    throw new InteracReceiptValidationError("Receipt reference number is invalid");
  }

  const payerEmail = normalizeEmail(parsed.replyTo?.value[0]?.address || "");
  if (!/^\S+@\S+\.\S+$/.test(payerEmail)) {
    throw new InteracReceiptValidationError("Receipt lacks the payer email");
  }

  const accountMatches = [...body.matchAll(/^Account ending in\s+(\d{4})\s*$/gim)];
  const accountLast4 = accountMatches.length === 1 ? accountMatches[0][1] : undefined;
  if (options.expectedAccountLast4 && accountLast4 !== options.expectedAccountLast4) {
    throw new InteracReceiptValidationError("Receipt was deposited to an unexpected bank account");
  }

  const receivedAt = options.receivedAt || parsed.date;
  if (!receivedAt || Number.isNaN(receivedAt.getTime())) {
    throw new InteracReceiptValidationError("Receipt date is invalid");
  }

  return {
    reference,
    referenceNormalized,
    gmailMessageId: parsed.messageId || createHash("sha256").update(source).digest("hex"),
    payerEmail,
    payerEmailNormalized: payerEmail,
    senderName,
    recipientEmail: expectedRecipient,
    amountCents,
    currency: "CAD",
    depositedAt: receivedAt,
    receivedAt,
    accountLast4,
    subject,
    rawSha256: createHash("sha256").update(source).digest("hex"),
    parserVersion: INTERAC_RECEIPT_PARSER_VERSION,
    authenticationVerified: true,
  };
}
