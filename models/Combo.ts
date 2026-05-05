import mongoose, { Schema, Document } from 'mongoose';

export interface ComboDocument extends Document {
  comboId: string;
  dayId: string;
  name: string;
  calories: number;
  proteinGrams?: number;
  tags: string[];
  tagsEn?: string[];
  allergensZh?: string[];
  allergensEn?: string[];
  descriptionZh?: string;
  descriptionEn?: string;
  typeA: {
    dishes: string[];
    dishesEn?: string[];
    voucherType: 'twoDish';
  };
  typeB: {
    dishes: string[];
    dishesEn?: string[];
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
  tagsEn: [{
    type: String
  }],
  proteinGrams: {
    type: Number
  },
  allergensZh: [{
    type: String
  }],
  allergensEn: [{
    type: String
  }],
  descriptionZh: {
    type: String
  },
  descriptionEn: {
    type: String
  },
  typeA: {
    dishes: [{
      type: String
    }],
    dishesEn: [{
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
    dishesEn: [{
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

const existingComboModel = mongoose.models.Combo;
if (existingComboModel && !existingComboModel.schema.path('descriptionEn')) {
  delete mongoose.models.Combo;
}

export default mongoose.models.Combo || mongoose.model<ComboDocument>('Combo', ComboSchema);
