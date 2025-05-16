import mongoose, { Schema, Document } from 'mongoose';

// Define MusicSubmission interface
export interface IMusicSubmission extends Document {
  songName: string;
  artistName: string;
  reason: string;
  submitterName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

// Define MusicSubmission schema
const MusicSubmissionSchema: Schema = new Schema(
  {
    songName: { type: String, required: true },
    artistName: { type: String, required: true },
    reason: { type: String, required: true },
    submitterName: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'], 
      default: 'pending' 
    }
  },
  { 
    timestamps: true,
  }
);

// Create model if it doesn't exist already (for Next.js hot reloading)
export default mongoose.models.MusicSubmission || 
  mongoose.model<IMusicSubmission>('MusicSubmission', MusicSubmissionSchema); 