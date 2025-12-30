import mongoose, { Schema, Document } from 'mongoose';

export interface WeeklyDeliveryHistoryDocument extends Document {
  historyId: string;
  originalDay: 'sunday' | 'tuesday';
  originalWeekOffset: number;
  displayName: string;
  date: string;
  archivedAt: Date;
  archivedReason: 'rolled_forward' | 'manually_deleted';
  mealOptions: any[]; // Store the full meal option structure
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyDeliveryHistorySchema = new Schema({
  historyId: { type: String, required: true, unique: true },
  originalDay: { type: String, required: true, enum: ['sunday', 'tuesday'] },
  originalWeekOffset: { type: Number, required: true },
  displayName: { type: String, required: true },
  date: { type: String, required: true },
  archivedAt: { type: Date, default: Date.now },
  archivedReason: { type: String, enum: ['rolled_forward', 'manually_deleted'], required: true },
  mealOptions: [{ type: Schema.Types.Mixed }] // Store array of meal option objects
}, { timestamps: true });

export default mongoose.models.WeeklyDeliveryHistory || mongoose.model<WeeklyDeliveryHistoryDocument>('WeeklyDeliveryHistory', WeeklyDeliveryHistorySchema);

