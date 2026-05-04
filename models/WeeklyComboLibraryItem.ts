import mongoose, { Schema, Document } from "mongoose"

import type { ComboLibraryStatus } from "@/lib/combo-library/shared/constants"

export interface WeeklyComboLibraryItemDocument extends Document {
  weeklyComboLibraryId: string
  name: string
  nameEn?: string
  internalName?: string
  description?: string
  dishes: string[]
  imageUrl?: string
  imageKey?: string
  calories?: number
  tags: string[]
  allergens: string[]
  dietaryTags: string[]
  status: ComboLibraryStatus
  notesForAdmin?: string
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const WeeklyComboLibraryItemSchema = new Schema(
  {
    weeklyComboLibraryId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    nameEn: { type: String },
    internalName: { type: String },
    description: { type: String },
    dishes: { type: [String], default: [] },
    imageUrl: { type: String },
    imageKey: { type: String },
    calories: { type: Number },
    tags: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    dietaryTags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["active", "archived", "draft"],
      default: "active",
      index: true,
    },
    notesForAdmin: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

WeeklyComboLibraryItemSchema.index({ status: 1, updatedAt: -1 })
WeeklyComboLibraryItemSchema.index({ internalName: 1 })

export default mongoose.models.WeeklyComboLibraryItem ||
  mongoose.model<WeeklyComboLibraryItemDocument>(
    "WeeklyComboLibraryItem",
    WeeklyComboLibraryItemSchema,
    "weeklyComboLibraryItems"
  )
