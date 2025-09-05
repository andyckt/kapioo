import mongoose, { Schema, Document } from 'mongoose';

export interface TagDocument extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  }
}, { timestamps: true });

export default mongoose.models.Tag || mongoose.model<TagDocument>('Tag', TagSchema);
