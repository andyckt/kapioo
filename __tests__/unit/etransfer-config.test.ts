import {
  assertMailboxConfiguration,
  getEtransferAutomationConfig,
  getNextPaymentCheckAt,
  isEligibleForAutomaticChecks,
  isLiveAutomaticApprovalEnabled,
  isValidInteracReference,
  moneyToCents,
} from "@/lib/etransfer/config";

const ORIGINAL_ENV = { ...process.env };

describe("e-Transfer automation configuration", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ETRANSFER_AUTO_APPROVAL_MODE;
    delete process.env.ETRANSFER_AUTO_APPROVAL_ACTIVATION_AT;
    delete process.env.ETRANSFER_ACCOUNT_LAST4;
    delete process.env.ETRANSFER_RECIPIENT_EMAIL;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.ETRANSFER_CRON_SECRET;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("defaults unknown modes to the disabled state", () => {
    process.env.ETRANSFER_AUTO_APPROVAL_MODE = "liv";
    expect(getEtransferAutomationConfig().mode).toBe("off");
    expect(isEligibleForAutomaticChecks()).toBe(false);
    expect(isLiveAutomaticApprovalEnabled()).toBe(false);
  });

  it("requires matching mailbox, activation time, and account digits for live mode", () => {
    process.env.ETRANSFER_AUTO_APPROVAL_MODE = "live";
    process.env.ETRANSFER_AUTO_APPROVAL_ACTIVATION_AT = "2026-09-14T00:00:00.000Z";
    process.env.EMAIL_USER = "kapioomeal@gmail.com";
    process.env.EMAIL_PASS = "test-app-password";
    process.env.ETRANSFER_RECIPIENT_EMAIL = "kapioomeal@gmail.com";
    process.env.ETRANSFER_CRON_SECRET = "a".repeat(32);

    expect(() => assertMailboxConfiguration(getEtransferAutomationConfig())).toThrow(
      "ETRANSFER_ACCOUNT_LAST4"
    );

    process.env.ETRANSFER_ACCOUNT_LAST4 = "4994";
    expect(() => assertMailboxConfiguration(getEtransferAutomationConfig())).not.toThrow();
    expect(isEligibleForAutomaticChecks(new Date("2026-09-14T00:00:01.000Z"))).toBe(true);
  });

  it("uses a 15-minute retry during day one and hourly retries afterward", () => {
    const now = new Date("2026-09-14T12:00:00.000Z");
    expect(
      getNextPaymentCheckAt(new Date("2026-09-14T00:01:00.000Z"), now).toISOString()
    ).toBe("2026-09-14T12:15:00.000Z");
    expect(
      getNextPaymentCheckAt(new Date("2026-09-13T11:59:00.000Z"), now).toISOString()
    ).toBe("2026-09-14T13:00:00.000Z");
  });

  it("normalizes money and accepts only plausible Interac references", () => {
    expect(moneyToCents(147.1)).toBe(14710);
    expect(isValidInteracReference("C1AJ-H4XQ XJVR")).toBe(true);
    expect(isValidInteracReference("short")).toBe(false);
    expect(isValidInteracReference("A".repeat(25))).toBe(false);
  });
});
