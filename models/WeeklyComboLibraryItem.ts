import mongoose, { Schema, Document } from "mongoose"

export interface WeeklyComboLibraryItemDocument extends Document {
  weeklyComboLibraryId: string
  name: string
  nameEn?: string
  internalName: string
  description?: string
  imageUrl?: string
  imageKey?: string
  calories?: number
  tags: string[]
  allergens: string[]
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const WeeklyComboLibraryItemSchema = new Schema(
  {
    weeklyComboLibraryId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    nameEn: { type: String, index: true },
    internalName: { type: String, required: true, index: true },
    description: { type: String },
    imageUrl: { type: String },
    imageKey: { type: String },
    calories: { type: Number },
    tags: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

WeeklyComboLibraryItemSchema.index({ internalName: 1 })
WeeklyComboLibraryItemSchema.index({ nameEn: 1 })

export default mongoose.models.WeeklyComboLibraryItem ||
  mongoose.model<WeeklyComboLibraryItemDocument>(
    "WeeklyComboLibraryItem",
    WeeklyComboLibraryItemSchema,
    "weeklyComboLibraryItems"
  )
