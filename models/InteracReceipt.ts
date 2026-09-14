import mongoose, { Document, Model, Schema } from "mongoose";

export interface IInteracReceipt extends Document {
  provider: "interac";
  mailbox: string;
  reference: string;
  referenceNormalized: string;
  gmailMessageId: string;
  imapUid: number;
  uidValidity: string;
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
  authenticationVerified: boolean;
  status: "unmatched" | "allocated" | "conflict";
  allocatedRequestKey?: string;
  allocatedRequestId?: string;
  allocatedRequestKind?: "daily" | "weekly";
  allocatedUserId?: mongoose.Types.ObjectId;
  allocatedAt?: Date;
  conflictReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InteracReceiptSchema = new Schema<IInteracReceipt>(
  {
    provider: { type: String, enum: ["interac"], default: "interac", required: true },
    mailbox: { type: String, required: true, lowercase: true, trim: true },
    reference: { type: String, required: true, trim: true },
    referenceNormalized: { type: String, required: true, trim: true },
    gmailMessageId: { type: String, required: true, trim: true },
    imapUid: { type: Number, required: true },
    uidValidity: { type: String, required: true },
    payerEmail: { type: String, required: true, trim: true },
    payerEmailNormalized: { type: String, required: true, lowercase: true, trim: true },
    senderName: { type: String, required: true, trim: true },
    recipientEmail: { type: String, required: true, lowercase: true, trim: true },
    amountCents: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ["CAD"], required: true },
    depositedAt: { type: Date, required: true },
    receivedAt: { type: Date, required: true },
    accountLast4: { type: String },
    subject: { type: String, required: true },
    rawSha256: { type: String, required: true },
    parserVersion: { type: String, required: true },
    authenticationVerified: { type: Boolean, required: true },
    status: {
      type: String,
      enum: ["unmatched", "allocated", "conflict"],
      default: "unmatched",
      required: true,
    },
    allocatedRequestKey: { type: String },
    allocatedRequestId: { type: String },
    allocatedRequestKind: { type: String, enum: ["daily", "weekly"] },
    allocatedUserId: { type: Schema.Types.ObjectId, ref: "User" },
    allocatedAt: { type: Date },
    conflictReason: { type: String },
  },
  { timestamps: true }
);

InteracReceiptSchema.index(
  { provider: 1, mailbox: 1, referenceNormalized: 1 },
  { unique: true, name: "unique_interac_payment" }
);
InteracReceiptSchema.index(
  { mailbox: 1, gmailMessageId: 1 },
  { unique: true, name: "unique_gmail_receipt" }
);
InteracReceiptSchema.index({ status: 1, referenceNormalized: 1 });

const InteracReceipt =
  (mongoose.models.InteracReceipt as Model<IInteracReceipt> | undefined) ||
  mongoose.model<IInteracReceipt, Model<IInteracReceipt>>("InteracReceipt", InteracReceiptSchema);

export default InteracReceipt;
