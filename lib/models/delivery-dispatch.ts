import { Schema } from "mongoose";

export interface IDeliveryDispatch {
  eta: Date;
  dispatchedAt: Date;
  receivedAt: Date;
  stopId?: string;
  driverId?: string;
  source: "route-optimizer";
  note?: string;
}

export const DeliveryDispatchSchema = new Schema<IDeliveryDispatch>(
  {
    eta: {
      type: Date,
      required: true,
    },
    dispatchedAt: {
      type: Date,
      required: true,
    },
    receivedAt: {
      type: Date,
      required: true,
    },
    stopId: {
      type: String,
      trim: true,
    },
    driverId: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ["route-optimizer"],
      required: true,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);
