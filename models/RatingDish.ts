import mongoose, { Schema, Document } from 'mongoose';

export interface RatingDishDocument extends Document {
  name: string;
  nameEn?: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RatingDishSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    nameEn: {
      type: String,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.RatingDish ||
  mongoose.model<RatingDishDocument>('RatingDish', RatingDishSchema);
