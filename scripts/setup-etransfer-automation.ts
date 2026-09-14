import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
mongoose.set("autoIndex", false);

async function assertNoDuplicateSubmissionKeys(model: mongoose.Model<any>, label: string) {
  const duplicates = await model.aggregate([
    { $match: { submissionKey: { $type: "string" } } },
    { $group: { _id: { userId: "$userId", submissionKey: "$submissionKey" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 1 },
  ]);
  if (duplicates.length) {
    throw new Error(`${label} has duplicate submission keys; resolve them before enabling automation`);
  }
}

async function main() {
  const { default: connectToDatabase } = await import("../lib/db");
  const [
    { default: AtomicCounter },
    { default: CreditPurchaseRequest },
    { default: InteracMailboxState },
    { default: InteracReceipt },
    { default: Transaction },
    { default: VoucherApprovalGrant },
    { default: VoucherApprovalNotification },
    { default: VoucherPurchaseRequest },
  ] = await Promise.all([
    import("../models/AtomicCounter"),
    import("../models/CreditPurchaseRequest"),
    import("../models/InteracMailboxState"),
    import("../models/InteracReceipt"),
    import("../models/Transaction"),
    import("../models/VoucherApprovalGrant"),
    import("../models/VoucherApprovalNotification"),
    import("../models/VoucherPurchaseRequest"),
  ]);

  await connectToDatabase();
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    await AtomicCounter.findOne().session(session).lean();
    await session.abortTransaction();
    console.log("Verified MongoDB transaction support");
  } finally {
    await session.endSession();
  }

  await assertNoDuplicateSubmissionKeys(VoucherPurchaseRequest, "Daily voucher requests");
  await assertNoDuplicateSubmissionKeys(CreditPurchaseRequest, "Weekly voucher requests");

  const models = [
    AtomicCounter,
    VoucherPurchaseRequest,
    CreditPurchaseRequest,
    Transaction,
    InteracReceipt,
    InteracMailboxState,
    VoucherApprovalGrant,
    VoucherApprovalNotification,
  ];
  for (const model of models) {
    await model.createIndexes();
    console.log(`Verified indexes for ${model.modelName}`);
  }
}

main()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    await mongoose.disconnect();
    process.exitCode = 1;
  });
