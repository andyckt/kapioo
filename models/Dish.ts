import mongoose, { Schema, Document } from 'mongoose';

export interface DishDocument extends Document {
  name: string; // Chinese name (unique identifier)
  nameEn?: string; // English translation
  createdAt: Date;
  updatedAt: Date;
}

const DishSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true // Each dish name should be unique
  },
  nameEn: {
    type: String,
    required: false
  }
}, { timestamps: true });

export default mongoose.models.Dish || mongoose.model<DishDocument>('Dish', DishSchema);

