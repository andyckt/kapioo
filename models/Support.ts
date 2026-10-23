import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

function model<T extends Schema>(name: string, schema: T): Model<InferSchemaType<T>> {
  return (mongoose.models[name] as Model<InferSchemaType<T>>) || mongoose.model(name, schema);
}

const conversationSchema = new Schema({
  guestHash: { type: String, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  language: { type: String, enum: ["en", "zh"], default: "en", required: true },
  kind: { type: String, enum: ["support", "lead"], default: "support", required: true },
  status: { type: String, enum: ["open", "waiting", "resolved"], default: "open", required: true },
  humanMode: { type: Boolean, default: false, required: true },
  revision: { type: Number, default: 0, required: true },
  unread: { type: Number, default: 0, required: true },
  customerUnread: { type: Number, default: 0, required: true },
  preferences: { type: Schema.Types.Mixed, default: {} },
  linkedOrders: [{ kind: { type: String, enum: ["daily", "weekly"] }, orderId: String }],
  processingUntil: Date,
  returnTokenHash: String,
  returnTokenExpires: Date,
}, { timestamps: true });
conversationSchema.index({ updatedAt: -1 });
export const SupportConversation = model("SupportConversation", conversationSchema);

const messageSchema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, required: true, index: true },
  clientId: { type: String, required: true },
  role: { type: String, enum: ["customer", "assistant", "staff", "system"], required: true },
  text: { type: String, required: true, maxlength: 8000 },
  cards: { type: [Schema.Types.Mixed], default: [] },
  emailStatus: { type: String, enum: ["pending", "sent", "failed"] },
}, { timestamps: true });
messageSchema.index({ conversationId: 1, clientId: 1 }, { unique: true });
export const SupportMessage = model("SupportMessage", messageSchema);

const leadSchema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  consentAt: { type: Date, required: true },
  stage: { type: String, enum: ["new", "contacted", "purchased", "closed"], default: "new", required: true },
}, { timestamps: true });
export const SupportLead = model("SupportLead", leadSchema);

const articleSchema = new Schema({
  slug: { type: String, required: true, unique: true },
  draft: { type: Schema.Types.Mixed, required: true },
  published: Schema.Types.Mixed,
  publishedAt: Date,
}, { timestamps: true });
export const SupportArticle = model("SupportArticle", articleSchema);

const budgetSchema = new Schema({
  month: { type: String, required: true, unique: true },
  // Integer micro-dollars. Uncertain network results retain their reservation.
  chargedMicros: { type: Number, default: 0, required: true },
  reservedMicros: { type: Number, default: 0, required: true },
}, { timestamps: true });
export const SupportBudget = model("SupportBudget", budgetSchema);

const reservationSchema = new Schema({
  month: { type: String, required: true },
  reservedMicros: { type: Number, required: true },
  actualMicros: Number,
  state: { type: String, enum: ["reserved", "settled"], default: "reserved", required: true },
}, { timestamps: true });
export const SupportReservation = model("SupportReservation", reservationSchema);

const eventSchema = new Schema({
  key: { type: String, required: true, unique: true },
  conversationId: { type: Schema.Types.ObjectId, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, index: true },
  kind: { type: String, enum: ["recommendation", "checkout", "lead", "purchase", "first-order"], required: true },
  planId: String,
  purchaseKey: String,
  amountCents: Number,
}, { timestamps: true });
export const SupportEvent = model("SupportEvent", eventSchema);

const rateSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
rateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const SupportRate = model("SupportRate", rateSchema);

const attributionSchema = new Schema({
  purchaseKey: { type: String, required: true, unique: true },
  conversationId: { type: Schema.Types.ObjectId, required: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  planId: { type: String, required: true },
}, { timestamps: true });
export const SupportAttribution = model("SupportAttribution", attributionSchema);
