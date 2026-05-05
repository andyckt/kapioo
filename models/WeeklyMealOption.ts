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
  calories?: number;
  proteinGrams?: number;
  allergens?: string[];
  description?: string;
  /** When true, combo is eligible for the weekly landing menu preview carousel (requires image). */
  featuredInMenuPreview?: boolean;
  sourceComboLibraryId?: string;
  sourceComboLibraryUpdatedAt?: Date;
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
    calories: {
      type: Number,
      required: false,
    },
    proteinGrams: {
      type: Number,
      required: false,
    },
    allergens: {
      type: [String],
      default: undefined,
    },
    description: {
      type: String,
      required: false,
    },
    featuredInMenuPreview: {
      type: Boolean,
      default: false,
    },
    sourceComboLibraryId: {
      type: String,
      required: false,
    },
    sourceComboLibraryUpdatedAt: {
      type: Date,
      required: false,
    },
  },
  { 
    timestamps: true,
  }
);

/**
 * Next dev/hot reload can keep an older compiled Mongoose model around after
 * adding a schema path. If that happens, strict updates silently drop the new
 * field and admin toggles appear to "reset" after the next refetch.
 */
const existingWeeklyMealOptionModel = mongoose.models.WeeklyMealOption;
if (
  existingWeeklyMealOptionModel &&
  (!existingWeeklyMealOptionModel.schema.path("featuredInMenuPreview") ||
    !existingWeeklyMealOptionModel.schema.path("proteinGrams"))
) {
  delete mongoose.models.WeeklyMealOption;
}

// Explicitly specify the collection name to ensure consistency.
export default mongoose.models.WeeklyMealOption || mongoose.model<IWeeklyMealOption>('WeeklyMealOption', WeeklyMealOptionSchema, 'weeklymealOptions');
