import mongoose, { Document, Model, Schema } from "mongoose";

export interface IVoucherApprovalGrant extends Document {
  requestKey: string;
  requestId: string;
  requestKind: "daily" | "weekly";
  userId: mongoose.Types.ObjectId;
  paymentKey: string;
  paymentReceiptId: mongoose.Types.ObjectId;
  planId: string;
  entitlementField: string;
  entitlementAmount: number;
  amountCents: number;
  balanceTransactionId: string;
  approvalSource: "automatic" | "manual";
  createdAt: Date;
}

const VoucherApprovalGrantSchema = new Schema<IVoucherApprovalGrant>(
  {
    requestKey: { type: String, required: true, unique: true },
    requestId: { type: String, required: true },
    requestKind: { type: String, enum: ["daily", "weekly"], required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    paymentKey: { type: String, required: true, unique: true },
    paymentReceiptId: { type: Schema.Types.ObjectId, ref: "InteracReceipt", required: true },
    planId: { type: String, required: true },
    entitlementField: { type: String, required: true },
    entitlementAmount: { type: Number, required: true, min: 1 },
    amountCents: { type: Number, required: true, min: 1 },
    balanceTransactionId: { type: String, required: true },
    approvalSource: { type: String, enum: ["automatic", "manual"], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const VoucherApprovalGrant =
  (mongoose.models.VoucherApprovalGrant as Model<IVoucherApprovalGrant> | undefined) ||
  mongoose.model<IVoucherApprovalGrant, Model<IVoucherApprovalGrant>>(
    "VoucherApprovalGrant",
    VoucherApprovalGrantSchema
  );

export default VoucherApprovalGrant;
