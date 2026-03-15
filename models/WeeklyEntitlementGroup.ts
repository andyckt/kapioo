import mongoose, { Schema, Document } from 'mongoose';

import { WEEKLY_MEAL_PLAN_TYPES, type WeeklyMealPlanType } from './WeeklyOrder';

export interface IWeeklyEntitlementGroup extends Document {
  userId: mongoose.Types.ObjectId;
  groupId: string;
  mealPlanType: WeeklyMealPlanType;
  voucherCountUsed: number;
  totalMealsForWeek: number;
  splitDeliveryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyEntitlementGroupSchema = new Schema<IWeeklyEntitlementGroup>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    groupId: {
      type: String,
      required: true,
      unique: true,
    },
    mealPlanType: {
      type: String,
      enum: WEEKLY_MEAL_PLAN_TYPES,
      default: 'legacy',
      required: true,
    },
    voucherCountUsed: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    totalMealsForWeek: {
      type: Number,
      required: true,
      min: 0,
    },
    splitDeliveryCount: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

function shouldRefreshWeeklyEntitlementGroupModel(
  model: mongoose.Model<IWeeklyEntitlementGroup> | undefined
) {
  const schema = model?.schema as any;
  const groupIdPath = schema?.path?.('groupId');
  const mealPlanTypePath = schema?.path?.('mealPlanType');
  const totalMealsForWeekPath = schema?.path?.('totalMealsForWeek');
  const splitDeliveryCountPath = schema?.path?.('splitDeliveryCount');

  return (
    !groupIdPath ||
    !mealPlanTypePath ||
    !totalMealsForWeekPath ||
    !splitDeliveryCountPath ||
    !Array.isArray(mealPlanTypePath.enumValues) ||
    !mealPlanTypePath.enumValues.includes('legacy')
  );
}

export function getWeeklyEntitlementGroupModel() {
  const existingModel = mongoose.models.WeeklyEntitlementGroup as
    | mongoose.Model<IWeeklyEntitlementGroup>
    | undefined;

  if (shouldRefreshWeeklyEntitlementGroupModel(existingModel)) {
    delete (mongoose.models as Record<string, unknown>).WeeklyEntitlementGroup;
  }

  return (mongoose.models.WeeklyEntitlementGroup as mongoose.Model<IWeeklyEntitlementGroup> | undefined) ||
    mongoose.model<IWeeklyEntitlementGroup>('WeeklyEntitlementGroup', WeeklyEntitlementGroupSchema);
}

export default getWeeklyEntitlementGroupModel();
