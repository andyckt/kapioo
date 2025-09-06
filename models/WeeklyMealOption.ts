import mongoose, { Schema, Document } from 'mongoose';

// Define WeeklyMealOption interface
export interface IWeeklyMealOption extends Document {
  id: string;
  name: string;
  tags?: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define WeeklyMealOption schema
const WeeklyMealOptionSchema: Schema = new Schema(
  {
    name: { 
      type: String, 
      required: true,
    },
    tags: { 
      type: [String], 
      default: [] 
    },
    active: { 
      type: Boolean, 
      default: true 
    },
  },
  { 
    timestamps: true,
  }
);

// Create model if it doesn't exist already (for Next.js hot reloading)
// Explicitly specify the collection name to ensure consistency
export default mongoose.models.WeeklyMealOption || mongoose.model<IWeeklyMealOption>('WeeklyMealOption', WeeklyMealOptionSchema, 'weeklymealOptions');
