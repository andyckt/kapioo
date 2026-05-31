import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDeliveryAgentGeocodeCache extends Document {
  normalizedAddressKey: string;
  formattedAddress: string;
  lat?: number;
  lng?: number;
  status: "ok" | "failed" | "approximate";
  confidence?: "high" | "medium" | "low";
  provider: string;
  geocodeStatus?: string;
  geocodedAt: Date;
  expiresAt: Date;
  failCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeliveryAgentGeocodeCacheModel extends Model<IDeliveryAgentGeocodeCache> {}

const DeliveryAgentGeocodeCacheSchema = new Schema<IDeliveryAgentGeocodeCache>(
  {
    normalizedAddressKey: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    formattedAddress: {
      type: String,
      required: true,
      trim: true,
    },
    lat: { type: Number },
    lng: { type: Number },
    status: {
      type: String,
      enum: ["ok", "failed", "approximate"],
      required: true,
    },
    confidence: {
      type: String,
      enum: ["high", "medium", "low"],
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      default: "route_optimizer",
    },
    geocodeStatus: { type: String, trim: true },
    geocodedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    failCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

DeliveryAgentGeocodeCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const DeliveryAgentGeocodeCache: IDeliveryAgentGeocodeCacheModel =
  (mongoose.models.DeliveryAgentGeocodeCache as IDeliveryAgentGeocodeCacheModel | undefined) ||
  mongoose.model<IDeliveryAgentGeocodeCache, IDeliveryAgentGeocodeCacheModel>(
    "DeliveryAgentGeocodeCache",
    DeliveryAgentGeocodeCacheSchema
  );

export default DeliveryAgentGeocodeCache;
