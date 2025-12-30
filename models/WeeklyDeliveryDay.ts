import mongoose, { Schema, Document } from 'mongoose';
import { IWeeklyMealOption } from './WeeklyMealOption';

// Define WeeklyDeliveryDay interface
export interface IWeeklyDeliveryDay extends Document {
  id: string;
  day: 'sunday' | 'tuesday';
  name: string;
  date: string;
  active: boolean;
  options: mongoose.Types.ObjectId[] | IWeeklyMealOption[];
  weekOffset: number; // 0 for current week, 1 for next week, 2 for week 3
  createdAt: Date;
  updatedAt: Date;
}

// Define WeeklyDeliveryDay schema
const WeeklyDeliveryDaySchema: Schema = new Schema(
  {
    day: { 
      type: String, 
      required: true,
      enum: ['sunday', 'tuesday'],
    },
    name: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    active: { 
      type: Boolean, 
      default: true 
    },
    options: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'WeeklyMealOption'
    }],
    weekOffset: {
      type: Number,
      required: true,
      enum: [0, 1, 2], // 0 for current week, 1 for next week, 2 for week 3
    },
  },
  { 
    timestamps: true,
  }
);

// Create a compound index to ensure unique day and weekOffset combination
WeeklyDeliveryDaySchema.index({ day: 1, weekOffset: 1 }, { unique: true });

// Create model if it doesn't exist already (for Next.js hot reloading)
// Explicitly specify the collection name to ensure consistency
export default mongoose.models.WeeklyDeliveryDay || mongoose.model<IWeeklyDeliveryDay>('WeeklyDeliveryDay', WeeklyDeliveryDaySchema, 'weeklydeliverydays');
