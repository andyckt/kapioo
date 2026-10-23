import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  action: { type: String, enum: ["cancel", "address"], required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  snapshot: { type: String, required: true },
  preview: { type: Schema.Types.Mixed, required: true },
  state: { type: String, enum: ["preview", "completed"], default: "preview", required: true },
  expiresAt: { type: Date, required: true },
  completedAt: Date,
  result: Schema.Types.Mixed,
}, { timestamps: true });

export default (mongoose.models.CustomerOrderChange as Model<InferSchemaType<typeof schema>>) ||
  mongoose.model("CustomerOrderChange", schema);
