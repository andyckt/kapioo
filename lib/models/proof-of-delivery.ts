import { Schema } from "mongoose";

export interface IProofOfDelivery {
  imageUrl: string;
  imageKey?: string;
  capturedAt: Date;
  receivedAt: Date;
  stopId?: string;
  driverId?: string;
  source: "route-optimizer" | "admin-manual";
  note?: string;
}

export const ProofOfDeliverySchema = new Schema<IProofOfDelivery>(
  {
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    imageKey: {
      type: String,
      trim: true,
    },
    capturedAt: {
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
      enum: ["route-optimizer", "admin-manual"],
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
