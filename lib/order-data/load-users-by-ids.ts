import User from "@/models/User";

import type { UserLeanForOrderData } from "@/lib/order-data/types";

export async function loadUsersByIds(userIds: string[]): Promise<Map<string, UserLeanForOrderData>> {
  const uniqueIds = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  const userMap = new Map<string, UserLeanForOrderData>();

  if (uniqueIds.length === 0) {
    return userMap;
  }

  const users = (await User.find({ _id: { $in: uniqueIds } })
    .select("name email phone addressGeo")
    .lean()) as UserLeanForOrderData[];

  for (const user of users) {
    userMap.set(String(user._id), user);
  }

  return userMap;
}
