import mongoose, { Schema, Document } from "mongoose"

import type { ComboLibraryStatus } from "@/lib/combo-library/shared/constants"

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
  status: ComboLibraryStatus
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
    status: {
      type: String,
      enum: ["active", "archived", "draft"],
      default: "active",
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

DailyComboLibraryItemSchema.index({ status: 1, updatedAt: -1 })
DailyComboLibraryItemSchema.index({ internalName: 1 })

export default mongoose.models.DailyComboLibraryItem ||
  mongoose.model<DailyComboLibraryItemDocument>(
    "DailyComboLibraryItem",
    DailyComboLibraryItemSchema,
    "dailyComboLibraryItems"
  )
