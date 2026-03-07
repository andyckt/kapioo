import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAuditLog extends Document {
  actorUserId?: mongoose.Types.ObjectId;
  actorRole: "user" | "admin" | "system";
  actorEmail?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface IAuditLogModel extends Model<IAuditLog> {}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    actorRole: {
      type: String,
      enum: ["user", "admin", "system"],
      required: true,
    },
    actorEmail: {
      type: String,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    targetType: {
      type: String,
      required: true,
      trim: true,
    },
    targetId: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const AuditLog =
  (mongoose.models.AuditLog as IAuditLogModel | undefined) ||
  mongoose.model<IAuditLog, IAuditLogModel>("AuditLog", AuditLogSchema);

export default AuditLog;

