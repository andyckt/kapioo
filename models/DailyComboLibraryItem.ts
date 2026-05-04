import mongoose, { Schema, Document } from "mongoose"

import type { ComboLibraryStatus } from "@/lib/combo-library/shared/constants"

export interface DailyComboLibraryItemDocument extends Document {
  dailyComboLibraryId: string
  name: string
  nameEn?: string
  internalName?: string
  description?: string
  typeADishes: string[]
  typeBDishes: string[]
  mainProtein?: string
  carb?: string
  vegetables: string[]
  sauce?: string
  imageUrl?: string
  imageKey?: string
  calories: number
  proteinGrams?: number
  carbsGrams?: number
  fatGrams?: number
  tags: string[]
  allergens: string[]
  dietaryTags: string[]
  cuisineType?: string
  spiceLevel?: "none" | "mild" | "medium" | "hot" | "extra_hot"
  portionSize?: string
  status: ComboLibraryStatus
  notesForAdmin?: string
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const DailyComboLibraryItemSchema = new Schema(
  {
    dailyComboLibraryId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    nameEn: { type: String },
    internalName: { type: String },
    description: { type: String },
    typeADishes: { type: [String], required: true, default: [] },
    typeBDishes: { type: [String], required: true, default: [] },
    mainProtein: { type: String },
    carb: { type: String },
    vegetables: { type: [String], default: [] },
    sauce: { type: String },
    imageUrl: { type: String },
    imageKey: { type: String },
    calories: { type: Number, required: true },
    proteinGrams: { type: Number },
    carbsGrams: { type: Number },
    fatGrams: { type: Number },
    tags: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    dietaryTags: { type: [String], default: [] },
    cuisineType: { type: String },
    spiceLevel: {
      type: String,
      enum: ["none", "mild", "medium", "hot", "extra_hot"],
    },
    portionSize: { type: String },
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

DailyComboLibraryItemSchema.index({ status: 1, updatedAt: -1 })
DailyComboLibraryItemSchema.index({ internalName: 1 })

export default mongoose.models.DailyComboLibraryItem ||
  mongoose.model<DailyComboLibraryItemDocument>(
    "DailyComboLibraryItem",
    DailyComboLibraryItemSchema,
    "dailyComboLibraryItems"
  )
