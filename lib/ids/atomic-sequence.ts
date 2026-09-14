import type { Model } from "mongoose";

import AtomicCounter from "@/models/AtomicCounter";

export async function allocateSequentialId(
  counterId: string,
  prefix: string,
  baseNumber: number,
  sourceModel: Model<any>
) {
  const idField = counterId.startsWith("transaction-") ? "transactionId" : "requestId";
  let counter = await AtomicCounter.findById(counterId);

  if (!counter) {
    const existingIds = await sourceModel
      .find({ [idField]: new RegExp(`^${prefix}\\d+$`) })
      .select(idField)
      .lean();
    const highestNumber = existingIds.reduce((highest, document) => {
      const rawId = String((document as Record<string, unknown>)[idField] || "");
      const value = Number.parseInt(rawId.slice(prefix.length), 10);
      return Number.isFinite(value) ? Math.max(highest, value) : highest;
    }, baseNumber - 1);
    const initialValue = Number.isFinite(highestNumber) ? highestNumber : baseNumber - 1;

    try {
      await AtomicCounter.create({ _id: counterId, value: initialValue });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }

  counter = await AtomicCounter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { value: 1 } },
    { new: true }
  );
  if (!counter) throw new Error(`Failed to allocate ${counterId}`);
  return `${prefix}${counter.value}`;
}
