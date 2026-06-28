import { z } from "zod";

import { errorJson, handleRouteError, parseJsonBody, successJson, type RouteContext } from "@/lib/api";
import { requireSelfOrAdmin } from "@/lib/auth/guards";
import { addressSchema, verifiedAddressGeoSchema } from "@/lib/contracts/common";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";

const verifyAddressBodySchema = z.object({
  address: addressSchema.extend({
    streetAddress: z.string().trim().min(1, "Street address is required"),
    province: z.string().trim().min(1, "Area is required"),
    postalCode: z.string().trim().min(1, "Postal code is required"),
    country: z.string().trim().default("Canada"),
  }),
  addressGeo: verifiedAddressGeoSchema,
  deliveryNotes: z.string().trim().max(1000).optional(),
});

function stripSensitiveUserFields(user: unknown) {
  const userResponse = user && typeof user === "object" ? { ...(user as Record<string, unknown>) } : {};
  delete userResponse.password;
  delete userResponse.salt;
  delete userResponse.resetPasswordCode;
  delete userResponse.resetPasswordExpires;
  delete userResponse.verificationCode;
  delete userResponse.verificationExpires;
  delete userResponse.adminMfaCodeHash;
  delete userResponse.adminMfaCodeExpires;
  userResponse.area =
    typeof userResponse.address === "object" &&
    userResponse.address !== null &&
    "province" in userResponse.address
      ? (userResponse.address as { province?: string }).province || ""
      : "";
  return userResponse;
}

export async function POST(request: Request, { params }: RouteContext<{ id: string }>) {
  try {
    const { id } = await params;
    const { actor, response } = await requireSelfOrAdmin(id);
    if (!actor || response) {
      return response;
    }

    const { data, error } = await parseJsonBody(request, verifyAddressBodySchema);
    if (error) {
      return error;
    }

    await connectToDatabase();

    const user = await User.findOne({
      $or: [{ _id: id }, { userID: id }],
    });

    if (!user) {
      return errorJson("User not found", 404);
    }

    if (!user.legacyAddress && user.address) {
      user.legacyAddress = user.address;
    }

    user.address = {
      ...data.address,
      country: data.address.country || "Canada",
    };
    user.addressGeo = data.addressGeo;
    user.deliveryNotes = data.deliveryNotes || "";
    user.addressVerified = true;
    user.addressVerifiedAt = new Date();

    await user.save();

    return successJson(stripSensitiveUserFields(user.toObject()));
  } catch (error) {
    return handleRouteError(error, "POST /api/users/[id]/verify-address");
  }
}
