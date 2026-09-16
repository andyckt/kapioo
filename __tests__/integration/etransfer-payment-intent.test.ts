import mongoose from "mongoose";

import {
  findBindablePaymentIntent,
  markPaymentIntentSubmitted,
  recordEtransferPaymentIntent,
} from "@/lib/etransfer/payment-intent";
import EtransferPaymentIntent from "@/models/EtransferPaymentIntent";
import InteracPayerEmail from "@/models/InteracPayerEmail";

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db";
import { createTestUser } from "../helpers/factories";

describe("e-Transfer checkout intent", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it("records only a verified payer email and binds only the exact checkout", async () => {
    const user = await createTestUser({ email: "intent@example.com" });
    const identity = await InteracPayerEmail.create({
      userId: user._id,
      slot: 1,
      email: user.email,
      emailNormalized: user.email,
      status: "verified",
      verifiedAt: new Date(),
    });
    const submissionKey = "79f96b82-2eb7-4f38-a150-fcd625bf4f80";

    const intent = await recordEtransferPaymentIntent({
      userId: String(user._id),
      submissionKey,
      requestKind: "daily",
      planId: "daily-2dish-6",
      amountCents: 14803,
      payerEmail: user.email,
    });

    expect(intent).toMatchObject({
      status: "open",
      requestKind: "daily",
      planId: "daily-2dish-6",
      amountCents: 14803,
    });
    expect(
      await findBindablePaymentIntent({
        userId: String(user._id),
        submissionKey,
        requestKind: "daily",
        planId: "daily-2dish-6",
        amountCents: 14803,
        payerEmailIdentityId: identity._id,
        payerEmail: user.email,
      })
    ).not.toBeNull();
    expect(
      await findBindablePaymentIntent({
        userId: String(user._id),
        submissionKey,
        requestKind: "daily",
        planId: "daily-2dish-6",
        amountCents: 14804,
        payerEmailIdentityId: identity._id,
        payerEmail: user.email,
      })
    ).toBeNull();
  });

  it("does not create an intent for an unverified sender email", async () => {
    const user = await createTestUser({ email: "unverified-intent@example.com" });
    const result = await recordEtransferPaymentIntent({
      userId: String(user._id),
      submissionKey: "1efdb077-ccfa-4a2a-83bc-4de59303ea29",
      requestKind: "weekly",
      planId: "weekly-6x1",
      amountCents: 10000,
      payerEmail: user.email,
    });

    expect(result).toBeNull();
    expect(await EtransferPaymentIntent.countDocuments()).toBe(0);
  });

  it("cannot reopen a checkout marker after it is attached to a request", async () => {
    const user = await createTestUser({ email: "submitted-intent@example.com" });
    await InteracPayerEmail.create({
      userId: user._id,
      slot: 1,
      email: user.email,
      emailNormalized: user.email,
      status: "verified",
      verifiedAt: new Date(),
    });
    const submissionKey = "f77c24c3-3f87-4598-8db9-68522cf5efdc";
    const intent = await recordEtransferPaymentIntent({
      userId: String(user._id),
      submissionKey,
      requestKind: "daily",
      planId: "daily-2dish-6",
      amountCents: 14803,
      payerEmail: user.email,
    });
    const session = await mongoose.startSession();
    try {
      await markPaymentIntentSubmitted({
        intentId: intent?._id,
        requestId: "VPR-INTENT-1",
        session,
      });
    } finally {
      await session.endSession();
    }

    const retried = await recordEtransferPaymentIntent({
      userId: String(user._id),
      submissionKey,
      requestKind: "daily",
      planId: "daily-3dish-20",
      amountCents: 99999,
      payerEmail: user.email,
    });

    expect(retried).toMatchObject({
      status: "submitted",
      requestId: "VPR-INTENT-1",
      planId: "daily-2dish-6",
      amountCents: 14803,
    });
  });
});
