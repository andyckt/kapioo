import mongoose, { Schema, Document } from 'mongoose';

// Define WeeklyMealOption interface
export interface IWeeklyMealOption extends Document {
  id: string;
  name: string;
  nameEn?: string; // English translation of the dish name
  tags?: string[];
  active: boolean;
  imageUrl?: string; // Optional public URL of the meal photo (S3)
  imageKey?: string; // Optional S3 key used for cleanup on replace/delete
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
    nameEn: {
      type: String,
      required: false, // Optional field for English translation
    },
    tags: { 
      type: [String], 
      default: [] 
    },
    active: { 
      type: Boolean, 
      default: true 
    },
    imageUrl: {
      type: String,
      required: false,
    },
    imageKey: {
      type: String,
      required: false,
    },
  },
  { 
    timestamps: true,
  }
);

// Create model if it doesn't exist already (for Next.js hot reloading)
// Explicitly specify the collection name to ensure consistency
export default mongoose.models.WeeklyMealOption || mongoose.model<IWeeklyMealOption>('WeeklyMealOption', WeeklyMealOptionSchema, 'weeklymealOptions');
