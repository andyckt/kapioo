import mongoose, { Schema, Document } from 'mongoose';

export interface DayDocument extends Document {
  dayId: string;
  displayName: string;
  date: string;
  week: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DaySchema = new Schema({
  dayId: {
    type: String,
    required: true,
    unique: true
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
    required: true,
    enum: [1, 2]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Use mongoose.models to check if the model exists already to prevent overwriting
export default mongoose.models.Day || mongoose.model<DayDocument>('Day', DaySchema);
