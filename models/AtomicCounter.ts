import mongoose, { Schema } from "mongoose";

interface IAtomicCounter {
  _id: string;
  value: number;
}

const AtomicCounterSchema = new Schema<IAtomicCounter>(
  {
    _id: { type: String, required: true },
    value: { type: Number, required: true, min: 0 },
  },
  { versionKey: false }
);

const AtomicCounter =
  (mongoose.models.AtomicCounter as mongoose.Model<IAtomicCounter> | undefined) ||
  mongoose.model<IAtomicCounter>("AtomicCounter", AtomicCounterSchema);

export default AtomicCounter;
