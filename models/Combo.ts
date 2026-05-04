import mongoose, { Schema, Document } from 'mongoose';

export interface ComboDocument extends Document {
  comboId: string;
  dayId: string;
  name: string;
  calories: number;
  tags: string[];
  typeA: {
    dishes: string[];
    voucherType: 'twoDish';
  };
  typeB: {
    dishes: string[];
    voucherType: 'threeDish';
  };
  imageUrl?: string;
  imageKey?: string;
  sourceComboLibraryId?: string;
  sourceComboLibraryUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ComboSchema = new Schema({
  comboId: {
    type: String,
    required: true,
    unique: true
  },
  dayId: {
    type: String,
    required: true,
    ref: 'Day'
  },
  name: {
    type: String,
    required: true
  },
  calories: {
    type: Number,
    required: true
  },
  tags: [{
    type: String
  }],
  typeA: {
    dishes: [{
      type: String
    }],
    voucherType: {
      type: String,
      default: 'twoDish'
    }
  },
  typeB: {
    dishes: [{
      type: String
    }],
    voucherType: {
      type: String,
      default: 'threeDish'
    }
  },
  imageUrl: {
    type: String
  },
  imageKey: {
    type: String
  },
  sourceComboLibraryId: {
    type: String
  },
  sourceComboLibraryUpdatedAt: {
    type: Date
  }
}, { timestamps: true });

export default mongoose.models.Combo || mongoose.model<ComboDocument>('Combo', ComboSchema);
