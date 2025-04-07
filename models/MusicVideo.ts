import mongoose, { Schema, Document } from 'mongoose';

// Define MusicVideo interface
export interface IMusicVideo extends Document {
  id: string;
  videoId: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define MusicVideo schema
const MusicVideoSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    videoId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
  },
  { 
    timestamps: true,
  }
);

// Create model if it doesn't exist already (for Next.js hot reloading)
export default mongoose.models.MusicVideo || mongoose.model<IMusicVideo>('MusicVideo', MusicVideoSchema); 