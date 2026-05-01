type UserNameLike = {
  name?: unknown
  nickname?: unknown
  email?: unknown
  userID?: unknown
  _id?: unknown
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function getUserDisplayName(user: UserNameLike | null | undefined): string {
  if (!user) {
    return "Unknown user"
  }

  const name = cleanText(user.name)
  if (name) {
    return name
  }

  const nickname = cleanText(user.nickname)
  if (nickname) {
    return nickname
  }

  const email = cleanText(user.email)
  if (email) {
    return email.includes("@") ? email.split("@")[0] : email
  }

  const userId = cleanText(user.userID)
  if (userId) {
    return userId
  }

  return cleanText(user._id) || "Unknown user"
}

export function withUserDisplayName<TUser extends UserNameLike>(user: TUser): TUser & { name: string } {
  return {
    ...user,
    name: getUserDisplayName(user),
  }
}
