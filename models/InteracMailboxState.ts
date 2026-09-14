import mongoose, { Document, Model, Schema } from "mongoose";

export interface IInteracMailboxState extends Document {
  mailbox: string;
  mailboxPath?: string;
  uidValidity?: string;
  lastUid: number;
  lastSuccessfulAt?: Date;
  lockOwner?: string;
  lockExpiresAt?: Date;
  lastError?: string;
}

const InteracMailboxStateSchema = new Schema<IInteracMailboxState>(
  {
    mailbox: { type: String, required: true, unique: true, lowercase: true },
    mailboxPath: { type: String },
    uidValidity: { type: String },
    lastUid: { type: Number, default: 0, required: true },
    lastSuccessfulAt: { type: Date },
    lockOwner: { type: String },
    lockExpiresAt: { type: Date },
    lastError: { type: String },
  },
  { timestamps: true }
);

const InteracMailboxState =
  (mongoose.models.InteracMailboxState as Model<IInteracMailboxState> | undefined) ||
  mongoose.model<IInteracMailboxState, Model<IInteracMailboxState>>(
    "InteracMailboxState",
    InteracMailboxStateSchema
  );

export default InteracMailboxState;
