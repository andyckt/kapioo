import mongoose, { Document, Model, Schema } from "mongoose";

export interface IVoucherApprovalNotification extends Document {
  eventKey: string;
  requestKey: string;
  requestId: string;
  requestKind: "daily" | "weekly";
  status: "approved" | "declined";
  recipientEmail: string;
  recipientName: string;
  language: "en" | "zh";
  planDescription?: string;
  voucherType?: "twoDish" | "threeDish";
  quantity?: number;
  adminNotes?: string;
  deliveryStatus: "pending" | "processing" | "sent" | "failed";
  attempts: number;
  nextAttemptAt: Date;
  lockExpiresAt?: Date;
  lastError?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VoucherApprovalNotificationSchema = new Schema<IVoucherApprovalNotification>(
  {
    eventKey: { type: String, required: true, unique: true },
    requestKey: { type: String, required: true },
    requestId: { type: String, required: true },
    requestKind: { type: String, enum: ["daily", "weekly"], required: true },
    status: { type: String, enum: ["approved", "declined"], required: true },
    recipientEmail: { type: String, required: true },
    recipientName: { type: String, required: true },
    language: { type: String, enum: ["en", "zh"], required: true },
    planDescription: { type: String },
    voucherType: { type: String, enum: ["twoDish", "threeDish"] },
    quantity: { type: Number },
    adminNotes: { type: String },
    deliveryStatus: {
      type: String,
      enum: ["pending", "processing", "sent", "failed"],
      default: "pending",
      required: true,
    },
    attempts: { type: Number, default: 0, required: true },
    nextAttemptAt: { type: Date, required: true },
    lockExpiresAt: { type: Date },
    lastError: { type: String },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

VoucherApprovalNotificationSchema.index({ deliveryStatus: 1, nextAttemptAt: 1 });

const VoucherApprovalNotification =
  (mongoose.models.VoucherApprovalNotification as Model<IVoucherApprovalNotification> | undefined) ||
  mongoose.model<IVoucherApprovalNotification, Model<IVoucherApprovalNotification>>(
    "VoucherApprovalNotification",
    VoucherApprovalNotificationSchema
  );

export default VoucherApprovalNotification;
