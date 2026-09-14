import {
  InteracReceiptValidationError,
  parseInteracReceipt,
} from "@/lib/etransfer/receipt-parser";

function receiptSource(overrides: {
  authenticationResults?: string;
  accountLast4?: string;
  amount?: string;
  bodyAmount?: string;
  payerEmail?: string;
  reference?: string;
} = {}) {
  const amount = overrides.amount || "147.00";
  const bodyAmount = overrides.bodyAmount || amount;
  const authenticationResults = overrides.authenticationResults === undefined
    ? "mx.google.com; dkim=pass header.i=@payments.interac.ca; spf=pass smtp.mailfrom=payments.interac.ca; dmarc=pass header.from=payments.interac.ca"
    : overrides.authenticationResults;
  return Buffer.from([
    `Authentication-Results: ${authenticationResults}`,
    "From: Interac <notify@payments.interac.ca>",
    `Reply-To: Customer <${overrides.payerEmail || "customer@example.com"}>`,
    "To: Kapioo <kapioomeal@gmail.com>",
    `Subject: Interac e-Transfer: You've received $${amount} from Jane Customer and it has been automatically deposited.`,
    "Message-ID: <interac-test-123@payments.interac.ca>",
    "Date: Sun, 13 Sep 2026 10:00:00 -0400",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Funds Deposited!",
    "The funds have been automatically deposited into your account at Kapioo Bank.",
    "Sent From: Jane Customer",
    `Amount: $${bodyAmount} (CAD)`,
    `Reference Number: ${overrides.reference || "CA1234567890"}`,
    `Account ending in ${overrides.accountLast4 || "4994"}`,
    "",
  ].join("\r\n"));
}

describe("Interac receipt parser", () => {
  it("accepts a completed, Gmail-authenticated deposit and extracts signed fields", async () => {
    const receipt = await parseInteracReceipt(receiptSource(), {
      expectedRecipient: "kapioomeal@gmail.com",
      expectedAccountLast4: "4994",
    });

    expect(receipt).toMatchObject({
      reference: "CA1234567890",
      referenceNormalized: "CA1234567890",
      payerEmailNormalized: "customer@example.com",
      recipientEmail: "kapioomeal@gmail.com",
      amountCents: 14700,
      currency: "CAD",
      accountLast4: "4994",
      authenticationVerified: true,
    });
  });

  it("rejects a spoofed message without passing Gmail DKIM, SPF, and DMARC results", async () => {
    await expect(
      parseInteracReceipt(receiptSource({ authenticationResults: "mx.google.com; dkim=fail; spf=fail; dmarc=fail" }), {
        expectedRecipient: "kapioomeal@gmail.com",
        expectedAccountLast4: "4994",
      })
    ).rejects.toBeInstanceOf(InteracReceiptValidationError);
  });

  it("rejects a receipt whose subject and body amounts differ", async () => {
    await expect(
      parseInteracReceipt(receiptSource({ bodyAmount: "148.00" }), {
        expectedRecipient: "kapioomeal@gmail.com",
        expectedAccountLast4: "4994",
      })
    ).rejects.toThrow("subject and body amounts differ");
  });

  it("rejects a deposit to a different bank account", async () => {
    await expect(
      parseInteracReceipt(receiptSource({ accountLast4: "1234" }), {
        expectedRecipient: "kapioomeal@gmail.com",
        expectedAccountLast4: "4994",
      })
    ).rejects.toThrow("unexpected bank account");
  });
});
