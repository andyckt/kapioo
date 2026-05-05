import mongoose, { Schema, Document } from "mongoose"

export interface DailyComboLibraryItemDocument extends Document {
  dailyComboLibraryId: string
  name: string
  internalName: string
  typeADishes: string[]
  typeADishesEn?: string[]
  typeBDishes: string[]
  typeBDishesEn?: string[]
  imageUrl?: string
  imageKey?: string
  calories: number
  proteinGrams?: number
  tags: string[]
  tagsEn?: string[]
  allergensZh?: string[]
  allergensEn?: string[]
  descriptionZh?: string
  descriptionEn?: string
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const DailyComboLibraryItemSchema = new Schema(
  {
    dailyComboLibraryId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    internalName: { type: String, required: true, index: true },
    typeADishes: { type: [String], required: true, default: [] },
    typeADishesEn: { type: [String], default: [] },
    typeBDishes: { type: [String], required: true, default: [] },
    typeBDishesEn: { type: [String], default: [] },
    imageUrl: { type: String },
    imageKey: { type: String },
    calories: { type: Number, required: true },
    proteinGrams: { type: Number },
    tags: { type: [String], default: [] },
    tagsEn: { type: [String], default: [] },
    allergensZh: { type: [String], default: [] },
    allergensEn: { type: [String], default: [] },
    descriptionZh: { type: String },
    descriptionEn: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

DailyComboLibraryItemSchema.index({ internalName: 1 })

const existingDailyComboLibraryItemModel = mongoose.models.DailyComboLibraryItem
if (
  existingDailyComboLibraryItemModel &&
  !existingDailyComboLibraryItemModel.schema.path("descriptionEn")
) {
  delete mongoose.models.DailyComboLibraryItem
}

export default mongoose.models.DailyComboLibraryItem ||
  mongoose.model<DailyComboLibraryItemDocument>(
    "DailyComboLibraryItem",
    DailyComboLibraryItemSchema,
    "dailyComboLibraryItems"
  )
