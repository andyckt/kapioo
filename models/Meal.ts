import mongoose, { Schema, Document } from 'mongoose';

// Define Meal interface
export interface IMeal extends Document {
  name: string;
  image: string;
  description: string;
  calories?: number;
  time?: string;
  tags?: string[];
  ingredients?: string[];
  allergens?: string[];
  day?: string; // for weekly meal assignment
  date?: string; // to store specific date for the meal
  createdAt: Date;
  updatedAt: Date;
}

// Define Meal schema
const MealSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    image: { type: String, required: true },
    description: { type: String, required: true },
    calories: { type: Number },
    time: { type: String },
    tags: { type: [String], default: [] },
    ingredients: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
    date: { type: String }, // for storing a specific date as a string
  },
  { 
    timestamps: true,
  }
);

// Create model if it doesn't exist already (for Next.js hot reloading)
export default mongoose.models.Meal || mongoose.model<IMeal>('Meal', MealSchema); 