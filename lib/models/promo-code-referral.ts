import { Schema, Types } from "mongoose";

export interface IPromoCodeReferral {
  referrerUserId: Types.ObjectId;
  refereeUserId: Types.ObjectId;
  referrerEmail: string;
  referrerName: string;
  refereeName: string;
  rewardEmailSentAt?: Date;
}

export const PromoCodeReferralSchema = new Schema<IPromoCodeReferral>(
  {
    referrerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    refereeUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referrerEmail: {
      type: String,
      required: true,
      trim: true,
    },
    referrerName: {
      type: String,
      required: true,
      trim: true,
    },
    refereeName: {
      type: String,
      required: true,
      trim: true,
    },
    rewardEmailSentAt: {
      type: Date,
    },
  },
  {
    _id: false,
  }
);
