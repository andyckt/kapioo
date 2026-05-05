import { MongoClient } from "mongodb"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error("ERROR: MONGODB_URI environment variable not set")
  process.exit(1)
}

const DB_NAME = process.env.MONGODB_DB || "kapioo"
const SOURCE_COLLECTION = "comboLibraryItems"
const DAILY_COLLECTION = "dailyComboLibraryItems"
const WEEKLY_COLLECTION = "weeklyComboLibraryItems"

type SharedComboLibraryItem = {
  comboLibraryId?: string
  productTypes?: string[]
  name?: string
  nameEn?: string
  internalName?: string
  description?: string
  typeADishes?: string[]
  typeBDishes?: string[]
  mainProtein?: string
  carb?: string
  vegetables?: string[]
  sauce?: string
  imageUrl?: string
  imageKey?: string
  calories?: number
  proteinGrams?: number
  carbsGrams?: number
  fatGrams?: number
  tags?: string[]
  allergens?: string[]
  dietaryTags?: string[]
  cuisineType?: string
  spiceLevel?: string
  portionSize?: string
  notesForAdmin?: string
  createdBy?: unknown
  updatedBy?: unknown
  createdAt?: Date
  updatedAt?: Date
}

function baseFields(doc: SharedComboLibraryItem) {
  const internalName = doc.internalName || doc.name
  return {
    name: internalName,
    internalName,
    description: doc.description,
    imageUrl: doc.imageUrl,
    imageKey: doc.imageKey,
    calories: doc.calories,
    tags: doc.tags ?? [],
    allergens: doc.allergens ?? [],
    createdBy: doc.createdBy,
    updatedBy: doc.updatedBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

async function main() {
  const client = new MongoClient(uri!)
  await client.connect()
  try {
    const db = client.db(DB_NAME)
    const source = db.collection<SharedComboLibraryItem>(SOURCE_COLLECTION)
    const daily = db.collection(DAILY_COLLECTION)
    const weekly = db.collection(WEEKLY_COLLECTION)
    const docs = await source.find({}).toArray()

    let dailyCount = 0
    let weeklyCount = 0

    for (const doc of docs) {
      const productTypes = doc.productTypes ?? []
      if (productTypes.includes("daily-delivery")) {
        await daily.updateOne(
          { dailyComboLibraryId: doc.comboLibraryId },
          {
            $setOnInsert: {
              ...baseFields(doc),
              dailyComboLibraryId: doc.comboLibraryId,
              typeADishes: doc.typeADishes ?? [],
              typeBDishes: doc.typeBDishes ?? [],
            },
          },
          { upsert: true }
        )
        dailyCount += 1
      }

      if (productTypes.includes("weekly-delivery")) {
        await weekly.updateOne(
          { weeklyComboLibraryId: doc.comboLibraryId },
          {
            $setOnInsert: {
              ...baseFields(doc),
              name: doc.name || doc.internalName,
              nameEn: doc.nameEn,
              weeklyComboLibraryId: doc.comboLibraryId,
            },
          },
          { upsert: true }
        )
        weeklyCount += 1
      }
    }

    console.log(`Copied ${dailyCount} Daily docs and ${weeklyCount} Weekly docs from ${SOURCE_COLLECTION}.`)
  } finally {
    await client.close()
  }
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
