import mongoose, { Schema, Document } from "mongoose"

export interface DailyComboLibraryItemDocument extends Document {
  dailyComboLibraryId: string
  name: string
  internalName: string
  typeADishes: string[]
  typeBDishes: string[]
  imageUrl?: string
  imageKey?: string
  calories: number
  tags: string[]
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
    typeBDishes: { type: [String], required: true, default: [] },
    imageUrl: { type: String },
    imageKey: { type: String },
    calories: { type: Number, required: true },
    tags: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

DailyComboLibraryItemSchema.index({ internalName: 1 })

export default mongoose.models.DailyComboLibraryItem ||
  mongoose.model<DailyComboLibraryItemDocument>(
    "DailyComboLibraryItem",
    DailyComboLibraryItemSchema,
    "dailyComboLibraryItems"
  )
