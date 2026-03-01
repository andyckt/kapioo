import mongoose, { Schema, Document } from 'mongoose';

export interface DishRatingItem {
  dishId: string;
  dishName: string;
  rating: number;
  comment?: string;
}

export interface MealRatingDocument extends Document {
  overallRating: number;
  deliveryDate: string;
  dishRatings: DishRatingItem[];
  comment?: string;
  userEmail?: string; // Logged-in user's email, or undefined if anonymous
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DishRatingItemSchema = new Schema({
  dishId: { type: String, required: true },
  dishName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
});

const MealRatingSchema = new Schema(
  {
    overallRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    deliveryDate: {
      type: String,
      required: true,
    },
    dishRatings: {
      type: [DishRatingItemSchema],
      default: [],
    },
    comment: {
      type: String,
    },
    userEmail: {
      type: String,
      maxlength: 254,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.models.MealRating ||
  mongoose.model<MealRatingDocument>('MealRating', MealRatingSchema);
