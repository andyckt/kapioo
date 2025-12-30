import mongoose, { Schema, Document } from 'mongoose';

export interface SettingsDocument extends Document {
  key: string;
  value: any;
  description?: string;
  updatedAt: Date;
}

const SettingsSchema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String
  }
}, { timestamps: true });

export default mongoose.models.Settings || mongoose.model<SettingsDocument>('Settings', SettingsSchema);


