import { randomUUID } from "node:crypto"

import User, { type IUser } from "@/models/User"

type CreateUserOverrides = Partial<Pick<
  IUser,
  | "userID"
  | "name"
  | "nickname"
  | "role"
  | "email"
  | "status"
  | "sessionVersion"
  | "credits"
  | "twoDishVoucher"
  | "threeDishVoucher"
  | "weeklySIXmeals"
  | "weeklyEIGHTmeals"
  | "weeklyTENmeals"
  | "weeklyTWELVEmeals"
  | "weeklySIXTEENmeals"
  | "phone"
  | "languagePreference"
  | "address"
  | "addressGeo"
  | "addressVerified"
  | "addressVerifiedAt"
>>

export async function createTestUser(
  overrides: CreateUserOverrides = {},
  password = "Password123!"
) {
  const uniqueId = randomUUID()
  const user = new User({
    userID: overrides.userID ?? `user-${uniqueId}`,
    name: overrides.name ?? "Test User",
    nickname: overrides.nickname,
    role: overrides.role ?? "user",
    email: overrides.email ?? `test-${uniqueId}@example.com`,
    status: overrides.status ?? "Active",
    sessionVersion: overrides.sessionVersion ?? 1,
    credits: overrides.credits ?? 0,
    twoDishVoucher: overrides.twoDishVoucher ?? 0,
    threeDishVoucher: overrides.threeDishVoucher ?? 0,
    weeklySIXmeals: overrides.weeklySIXmeals ?? 0,
    weeklyEIGHTmeals: overrides.weeklyEIGHTmeals ?? 0,
    weeklyTENmeals: overrides.weeklyTENmeals ?? 0,
    weeklyTWELVEmeals: overrides.weeklyTWELVEmeals ?? 0,
    weeklySIXTEENmeals: overrides.weeklySIXTEENmeals ?? 0,
    phone: overrides.phone,
    languagePreference: overrides.languagePreference ?? "en",
    // Default: a verified Downtown Toronto address with coordinates
    // so that isAddressVerified() passes for integration tests.
    // Override via overrides.address / addressGeo / addressVerified as needed.
    address: overrides.address ?? {
      streetAddress: "123 King St W",
      province: "Downtown Toronto",
      postalCode: "M5V 1J1",
      country: "Canada",
    },
    addressGeo: overrides.addressGeo ?? {
      placeId: "test-place-id",
      formattedAddress: "123 King St W, Toronto, ON M5V 1J1, Canada",
      lat: 43.6447,
      lng: -79.3837,
      postalCode: "M5V 1J1",
      source: "google",
    },
    addressVerified: overrides.addressVerified ?? true,
    addressVerifiedAt: overrides.addressVerifiedAt ?? new Date(),
  })

  await user.setPassword(password)
  await user.save()
  return user
}

export async function createTestAdmin(
  overrides: Omit<CreateUserOverrides, "role"> = {},
  password = "Password123!"
) {
  return createTestUser(
    {
      ...overrides,
      role: "admin",
      name: overrides.name ?? "Admin User",
    },
    password
  )
}
