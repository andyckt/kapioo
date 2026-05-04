import mongoose, { Schema, Document } from 'mongoose';

export interface DayHistoryDocument extends Document {
  historyId: string;
  originalDayId: string;
  displayName: string;
  date: string;
  week: number;
  archivedAt: Date;
  archivedReason: 'rolled_forward' | 'manually_deleted';
  combos: Array<{
    comboId: string;
    name: string;
    calories: number;
    tags: string[];
    typeA: {
      dishes: string[];
      voucherType: 'twoDish';
    };
    typeB: {
      dishes: string[];
      voucherType: 'threeDish';
    };
    imageUrl?: string;
    imageKey?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const DayHistorySchema = new Schema({
  historyId: {
    type: String,
    required: true,
    unique: true
  },
  originalDayId: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  week: {
    type: Number,
    required: true
  },
  archivedAt: {
    type: Date,
    default: Date.now
  },
  archivedReason: {
    type: String,
    enum: ['rolled_forward', 'manually_deleted'],
    required: true
  },
  combos: [{
    comboId: String,
    name: String,
    calories: Number,
    tags: [String],
    typeA: {
      dishes: [String],
      voucherType: {
        type: String,
        default: 'twoDish'
      }
    },
    typeB: {
      dishes: [String],
      voucherType: {
        type: String,
        default: 'threeDish'
      }
    },
    imageUrl: String,
    imageKey: String
  }]
}, { timestamps: true });

// Index for faster queries
DayHistorySchema.index({ archivedAt: -1 });
DayHistorySchema.index({ displayName: 1, date: 1 });

export default mongoose.models.DayHistory || mongoose.model<DayHistoryDocument>('DayHistory', DayHistorySchema);

