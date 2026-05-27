import mongoose from "mongoose";

import type { CreateUserBody } from "@/lib/contracts/user";
import connectToDatabase from "@/lib/db";
import { generateUniqueUserID } from "@/lib/users/generate-user-id";
import { sanitizeUserDocument } from "@/lib/users/sanitize-user";
import User, { type IUser } from "@/models/User";
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/services/email";

export class CreateAccountError extends Error {
  status: number;
  details?: string;

  constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = "CreateAccountError";
    this.status = status;
    this.details = details;
  }
}

interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

export interface CreateAccountResult {
  user: IUser;
  sanitized: ReturnType<typeof sanitizeUserDocument<IUser>>;
}

export async function createAccount(data: CreateUserBody): Promise<CreateAccountResult> {
  await connectToDatabase();

  const normalizedEmail = data.email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail }).select("_id");

  if (existingUser) {
    throw new CreateAccountError("User with this email already exists", 409);
  }

  const userID = await generateUniqueUserID();

  const user = new User({
    userID,
    name: data.name,
    email: normalizedEmail,
    joined: data.joined || new Date(),
    status: data.status || "Active",
    credits: data.credits || 0,
    phone: data.phone || "",
    address: data.address || {},
    languagePreference: data.languagePreference || "zh",
    isVerified: data.isVerified === true,
  });

  await user.setPassword(data.password);

  if (!data.isVerified) {
    user.generateVerificationCode();
  }

  try {
    await user.save();
  } catch (error: unknown) {
    if (error instanceof mongoose.Error.ValidationError) {
      throw new CreateAccountError(
        "Validation error",
        400,
        Object.keys(error.errors).join(", ")
      );
    }

    const mongoError = error as MongoError;
    if (mongoError.code === 11000 && mongoError.keyValue) {
      const field = Object.keys(mongoError.keyValue)[0];
      throw new CreateAccountError("Duplicate key error", 409, `field:${field}`);
    }

    throw error;
  }

  if (!data.isVerified) {
    try {
      await sendVerificationEmail(
        user.email,
        user.verificationCode || "",
        user.languagePreference || "zh"
      );
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
    }
  } else {
    void sendWelcomeEmail(user.email, user.name, user.languagePreference || "zh").catch(
      (emailError) => {
        console.error("Welcome email failed (non-blocking):", emailError);
      }
    );
  }

  const sanitized = sanitizeUserDocument(user.toObject() as IUser);

  return { user, sanitized };
}
