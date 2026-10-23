import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

// Read-only unless --apply is provided. Never changes orders or balances.
async function main() {
  loadEnvConfig(process.cwd());
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  if (args.some(arg => arg.startsWith("--from-cutoff="))) throw new Error("Setup no longer changes existing deadlines. Update them separately in Admin Settings.");
  const expectedDatabase = args.find(arg => arg.startsWith("--database="))?.split("=")[1];
  if (!expectedDatabase) throw new Error("Specify --database=<expected database name>.");
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing.");
  mongoose.set("autoCreate", false);
  mongoose.set("autoIndex", false);
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  try {
    const db = mongoose.connection.db!;
    if (db.databaseName !== expectedDatabase) throw new Error("Database name does not match the requested target.");
    const hello = await db.command({ hello: 1 });
    if (!(hello.setName || hello.msg === "isdbgrid") || hello.logicalSessionTimeoutMinutes == null) {
      throw new Error("The database must support transactions before enabling self-service.");
    }
    const [changes, groups, rates, transactions, audit, settings] = await Promise.all([
      import("../models/CustomerOrderChange").then(m => m.default),
      import("../models/WeeklyEntitlementGroup").then(m => m.default),
      import("../models/Support").then(m => m.SupportRate),
      import("../models/Transaction").then(m => m.default),
      import("../models/AuditLog").then(m => m.default),
      import("../models/Settings").then(m => m.default),
    ]);
    const models = [changes, groups, rates, transactions, audit, settings];
    if (apply) {
      for (const model of models) {
        await model.createCollection();
        await model.createIndexes(); // Adds declared indexes; never drops existing ones.
      }
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          for (const [key, description] of [
            ["cutoffTime", "Ordering and address changes: day before delivery, Toronto time."],
            ["cancellationTime", "Customer cancellation deadline: day before delivery, Toronto time."],
          ]) {
            const current = await settings.findOne({ key }).session(session);
            if (current) continue; // Never overwrite either administrator-selected deadline.
            await settings.create([{ key, value: { hour: 11, minute: 59 }, description }], { session });
            await audit.create([{
              actorRole: "system", action: "self-service.setup.deadline",
              targetType: "setting", targetId: key,
              metadata: { before: null, after: { hour: 11, minute: 59 }, timezone: "America/Toronto", reason: "Initialize independent deadline; existing settings are preserved." },
            }], { session });
          }
        });
      } finally { await session.endSession(); }
    }
    const current = await settings.findOne({ key: "cutoffTime" }).lean<{ value?: unknown }>();
    const cancellation = await settings.findOne({ key: "cancellationTime" }).lean<{ value?: unknown }>();
    console.log(JSON.stringify({
      mode: apply ? "setup completed" : "read-only check",
      database: db.databaseName, transactionsSupported: true, cutoff: current?.value ?? null,
      cancellationTime: cancellation?.value ?? { hour: 11, minute: 59 }, cancellationTimeStored: Boolean(cancellation),
      collections: await Promise.all(models.map(async model => ({
        name: model.collection.collectionName,
        indexes: await model.collection.indexes().then(items => items.map(i => ({
          key: i.key, unique: i.unique === true, ttl: i.expireAfterSeconds ?? null,
        }))).catch(() => "collection missing"),
      }))),
    }, null, 2));
  } finally { await mongoose.disconnect(); }
}
main().catch(error => {
  // Avoid printing connection strings or credentials in errors.
  console.error("Self-service setup failed:", String(error.message).replace(/mongodb(?:\+srv)?:\/\/[^\s]+/g, "[redacted]"));
  process.exitCode = 1;
});
