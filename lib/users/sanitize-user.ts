import type { IUser } from "@/models/User";

type UserLike = IUser | Record<string, unknown>;

export function sanitizeUserDocument<T extends UserLike>(user: T): T {
  const userResponse = { ...user } as T & Record<string, unknown>;

  delete userResponse.password;
  delete userResponse.salt;
  delete userResponse.verificationCode;
  delete userResponse.verificationExpires;
  delete userResponse.resetPasswordCode;
  delete userResponse.resetPasswordExpires;
  delete userResponse.adminMfaCodeHash;
  delete userResponse.adminMfaCodeExpires;
  delete userResponse.adminMfaCodeSentAt;

  return userResponse as T;
}
