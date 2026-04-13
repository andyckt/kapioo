import User from "@/models/User"

import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db"
import { createTestUser } from "../helpers/factories"

describe("test database smoke", () => {
  beforeAll(async () => {
    await setupTestDb()
  })

  beforeEach(async () => {
    await clearCollections()
  })

  afterAll(async () => {
    await teardownTestDb()
  })

  it("creates and reads back a user document", async () => {
    const createdUser = await createTestUser({
      name: "Smoke Test User",
      credits: 7,
    })

    const savedUser = await User.findById(createdUser._id).lean()

    expect(savedUser).toMatchObject({
      _id: createdUser._id,
      name: "Smoke Test User",
      credits: 7,
    })
  })
})
