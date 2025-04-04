import mongoose, { Schema, Document } from 'mongoose';
import { IMeal } from './Meal';

// Define WeeklyMeal interface
export interface IWeeklyMeal extends Document {
  day: string;
  meal: mongoose.Types.ObjectId | IMeal;
  active: boolean;
  week: number; // week number of the year
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

// Define WeeklyMeal schema
const WeeklyMealSchema: Schema = new Schema(
  {
    day: { 
      type: String, 
      required: true,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    meal: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Meal',
      required: true,
    },
    active: { type: Boolean, default: true },
    week: { type: Number, required: true },
    year: { type: Number, required: true },
  },
  { 
    timestamps: true,
  }
);

// Create a compound index to ensure only one meal per day per week/year
WeeklyMealSchema.index({ day: 1, week: 1, year: 1 }, { unique: true });

// Create model if it doesn't exist already (for Next.js hot reloading)
export default mongoose.models.WeeklyMeal || mongoose.model<IWeeklyMeal>('WeeklyMeal', WeeklyMealSchema); 