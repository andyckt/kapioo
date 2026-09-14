export type EtransferAutomationMode = "off" | "observe" | "live";

export interface EtransferAutomationConfig {
  mode: EtransferAutomationMode;
  mailbox: string;
  password: string;
  recipientEmail: string;
  accountLast4: string;
  activationAt: Date | null;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeInteracReference(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

export function isValidInteracReference(value: string) {
  const raw = value.trim();
  return (
    raw.length <= 32 &&
    /^[A-Za-z0-9 -]+$/.test(raw) &&
    /^[A-Z0-9]{8,24}$/.test(normalizeInteracReference(raw))
  );
}

export function moneyToCents(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Payment amount must be a positive number");
  }
  return Math.round((value + Number.EPSILON) * 100);
}

export function getEtransferAutomationConfig(): EtransferAutomationConfig {
  const rawMode = process.env.ETRANSFER_AUTO_APPROVAL_MODE || "off";
  const mode: EtransferAutomationMode =
    rawMode === "observe" || rawMode === "live" ? rawMode : "off";
  const activationValue = process.env.ETRANSFER_AUTO_APPROVAL_ACTIVATION_AT;
  const parsedActivation = activationValue ? new Date(activationValue) : null;
  const activationAt =
    parsedActivation && !Number.isNaN(parsedActivation.getTime()) ? parsedActivation : null;

  return {
    mode,
    mailbox: normalizeEmail(process.env.EMAIL_USER || ""),
    password: process.env.EMAIL_PASS || "",
    recipientEmail: normalizeEmail(
      process.env.ETRANSFER_RECIPIENT_EMAIL || "kapioomeal@gmail.com"
    ),
    accountLast4: (process.env.ETRANSFER_ACCOUNT_LAST4 || "").trim(),
    activationAt,
  };
}

export function assertMailboxConfiguration(config: EtransferAutomationConfig) {
  if (!config.mailbox || !config.password) {
    throw new Error("Company mailbox credentials are not configured");
  }
  if (config.mailbox !== config.recipientEmail) {
    throw new Error("The authenticated mailbox does not match the configured Interac recipient");
  }
  if (!config.activationAt) {
    throw new Error("ETRANSFER_AUTO_APPROVAL_ACTIVATION_AT must be a valid ISO timestamp");
  }
  if (config.mode !== "off" && !/^\d{4}$/.test(config.accountLast4)) {
    throw new Error("ETRANSFER_ACCOUNT_LAST4 is required before payment verification can run");
  }
}

function hasCompleteAutomationConfiguration(config: EtransferAutomationConfig) {
  return (
    Boolean(config.mailbox) &&
    Boolean(config.password) &&
    config.mailbox === config.recipientEmail &&
    Boolean(config.activationAt) &&
    /^\d{4}$/.test(config.accountLast4) &&
    (process.env.ETRANSFER_CRON_SECRET || "").length >= 32
  );
}

export function isEligibleForAutomaticChecks(now = new Date()) {
  const config = getEtransferAutomationConfig();
  return (
    config.mode !== "off" &&
    hasCompleteAutomationConfiguration(config) &&
    now.getTime() >= (config.activationAt?.getTime() || Number.POSITIVE_INFINITY)
  );
}

export function isLiveAutomaticApprovalEnabled(now = new Date()) {
  const config = getEtransferAutomationConfig();
  return (
    config.mode === "live" &&
    hasCompleteAutomationConfiguration(config) &&
    now.getTime() >= (config.activationAt?.getTime() || Number.POSITIVE_INFINITY)
  );
}

export function getNextPaymentCheckAt(createdAt: Date, now = new Date()) {
  const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
  const delayMs = ageMs < 24 * 60 * 60_000 ? 15 * 60_000 : 60 * 60_000;
  return new Date(now.getTime() + delayMs);
}
