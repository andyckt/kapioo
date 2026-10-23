import mongoose from "mongoose";
import { SupportBudget, SupportReservation } from "@/models/Support";
import { torontoParts } from "@/lib/self-service/eligibility";

export function budgetMonth(now = new Date()) { const p = torontoParts(now); return `${p.year}-${p.month}`; }
export async function reserveBudget(micros: number, capMicros: number) {
  if (!Number.isSafeInteger(micros) || micros <= 0 || !Number.isSafeInteger(capMicros) || capMicros < 0) return null;
  const month = budgetMonth();
  try { await SupportBudget.updateOne({ month }, { $setOnInsert: { chargedMicros: 0, reservedMicros: 0 } }, { upsert: true }); }
  catch (e) { if ((e as { code?: number }).code !== 11000) throw e; }
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const budget = await SupportBudget.findOneAndUpdate({ month, $expr: { $lte: [{ $add: ["$chargedMicros", "$reservedMicros", micros] }, capMicros] } }, { $inc: { reservedMicros: micros } }, { session, new: true });
      if (!budget) return null;
      const [reservation] = await SupportReservation.create([{ month, reservedMicros: micros }], { session });
      return String(reservation._id);
    });
  } finally { await session.endSession(); }
}

export async function settleBudget(id: string, micros: number) {
  if (!Number.isSafeInteger(micros) || micros < 0) throw new Error("Invalid AI usage amount");
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const reservation = await SupportReservation.findOneAndUpdate({ _id: id, state: "reserved" }, { $set: { state: "settled", actualMicros: micros } }, { new: true, session });
      if (!reservation) return;
      await SupportBudget.updateOne({ month: reservation.month }, { $inc: { reservedMicros: -reservation.reservedMicros, chargedMicros: micros } }, { session });
    });
  } finally { await session.endSession(); }
}
