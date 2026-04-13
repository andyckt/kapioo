import path from "node:path"

import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"

let mongoReplicaSet: MongoMemoryReplSet | null = null

export async function setupTestDb() {
  if (!mongoReplicaSet) {
    mongoReplicaSet = await MongoMemoryReplSet.create({
      binary: {
        downloadDir: path.join(process.cwd(), ".cache", "mongodb-binaries"),
        version: "8.0.7",
      },
      replSet: {
        count: 1,
      },
    })
  }

  const mongoUri = mongoReplicaSet.getUri()
  process.env.MONGODB_URI = mongoUri

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri)
  }

  return mongoUri
}

export async function clearCollections() {
  if (mongoose.connection.readyState === 0) {
    return
  }

  const collections = Object.values(mongoose.connection.collections)
  await Promise.all(collections.map((collection) => collection.deleteMany({})))
}

export async function teardownTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }

  if (mongoReplicaSet) {
    await mongoReplicaSet.stop()
    mongoReplicaSet = null
  }
}
