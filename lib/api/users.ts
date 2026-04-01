import mongoose from "mongoose";

import User from "@/models/User";

export function buildUserIdentifierQuery(identifier: string) {
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    return {
      $or: [{ _id: new mongoose.Types.ObjectId(identifier) }, { userID: identifier }],
    };
  }

  return { userID: identifier };
}

export async function findUserByIdentifier(identifier: string) {
  return User.findOne(buildUserIdentifierQuery(identifier));
}

export function sanitizeUserDocument<T extends Record<string, unknown>>(user: T) {
  const userResponse = { ...user };
  delete userResponse.password;
  delete userResponse.salt;
  delete userResponse.resetPasswordCode;
  delete userResponse.resetPasswordExpires;
  delete userResponse.verificationCode;
  delete userResponse.verificationExpires;
  delete userResponse.adminMfaCodeHash;
  delete userResponse.adminMfaCodeExpires;
  delete userResponse.adminMfaCodeSentAt;
  return userResponse;
}
