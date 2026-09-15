import mongoose, { Document, Model, Schema } from "mongoose";

export interface IInteracPayerEmail extends Document {
  userId: mongoose.Types.ObjectId;
  slot: 1 | 2 | 3;
  email: string;
  emailNormalized: string;
  status: "pending" | "verified";
  verificationCodeHash?: string;
  verificationExpiresAt?: Date;
  verificationSentAt?: Date;
  failedAttempts: number;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InteracPayerEmailSchema = new Schema<IInteracPayerEmail>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    slot: { type: Number, enum: [1, 2, 3], required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    emailNormalized: { type: String, required: true, trim: true, lowercase: true },
    status: {
      type: String,
      enum: ["pending", "verified"],
      default: "pending",
      required: true,
    },
    verificationCodeHash: { type: String },
    verificationExpiresAt: { type: Date },
    verificationSentAt: { type: Date },
    failedAttempts: { type: Number, default: 0, required: true },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

// A sender email may identify only one Kapioo account. The numbered slot index
// enforces the three-address limit even when two link requests arrive together.
InteracPayerEmailSchema.index(
  { emailNormalized: 1 },
  { unique: true, name: "unique_interac_payer_email" }
);
InteracPayerEmailSchema.index(
  { userId: 1, slot: 1 },
  { unique: true, name: "unique_interac_payer_email_slot" }
);
InteracPayerEmailSchema.index({ userId: 1, status: 1 });

const InteracPayerEmail =
  (mongoose.models.InteracPayerEmail as Model<IInteracPayerEmail> | undefined) ||
  mongoose.model<IInteracPayerEmail, Model<IInteracPayerEmail>>(
    "InteracPayerEmail",
    InteracPayerEmailSchema
  );

export default InteracPayerEmail;
