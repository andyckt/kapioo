import mongoose, { Document, Model, Schema } from "mongoose";

export type EtransferPaymentIntentKind = "daily" | "weekly";

export interface IEtransferPaymentIntent extends Document {
  userId: mongoose.Types.ObjectId;
  submissionKey: string;
  requestKind: EtransferPaymentIntentKind;
  planId: string;
  amountCents: number;
  payerEmailIdentityId: mongoose.Types.ObjectId;
  payerEmailNormalized: string;
  status: "open" | "submitted" | "expired";
  requestId?: string;
  expiresAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EtransferPaymentIntentSchema = new Schema<IEtransferPaymentIntent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submissionKey: { type: String, required: true, trim: true },
    requestKind: { type: String, enum: ["daily", "weekly"], required: true },
    planId: { type: String, required: true, trim: true },
    amountCents: { type: Number, required: true, min: 1 },
    payerEmailIdentityId: {
      type: Schema.Types.ObjectId,
      ref: "InteracPayerEmail",
      required: true,
    },
    payerEmailNormalized: { type: String, required: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ["open", "submitted", "expired"],
      default: "open",
      required: true,
    },
    requestId: { type: String, trim: true },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
  },
  { timestamps: true }
);

EtransferPaymentIntentSchema.index(
  { userId: 1, submissionKey: 1 },
  { unique: true, name: "unique_user_payment_intent" }
);
EtransferPaymentIntentSchema.index({
  status: 1,
  payerEmailNormalized: 1,
  amountCents: 1,
  createdAt: -1,
});
EtransferPaymentIntentSchema.index({ status: 1, expiresAt: 1 });

const EtransferPaymentIntent =
  (mongoose.models.EtransferPaymentIntent as Model<IEtransferPaymentIntent> | undefined) ||
  mongoose.model<IEtransferPaymentIntent, Model<IEtransferPaymentIntent>>(
    "EtransferPaymentIntent",
    EtransferPaymentIntentSchema
  );

export default EtransferPaymentIntent;
