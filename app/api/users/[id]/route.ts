import { errorJson, handleRouteError, parseJsonBody, successJson, type RouteContext } from '@/lib/api';
import connectToDatabase from '@/lib/db';
import { updateUserBodySchema } from '@/lib/contracts/user';
import { requireAdminMfa, requireSelfOrAdmin } from '@/lib/auth/guards';
import { resolveServiceability } from '@/lib/zones/service-areas';
import User from '@/models/User';

// Address-specific fields that must go through /verify-address for non-admins
const ADDRESS_FIELDS = new Set(['address', 'addressGeo', 'addressVerified', 'addressVerifiedAt', 'legacyAddress']);

// GET handler - return a specific user by ID
export async function GET(request: Request, { params }: RouteContext<{ id: string }>) {
  let id = '';
  try {
    ({ id } = await params);
    const { actor, response } = await requireSelfOrAdmin(id);
    if (!actor || response) {
      return response;
    }
    
    await connectToDatabase();
    
    // Find user excluding sensitive fields
    const user = await User.findOne({ 
      $or: [{ _id: id }, { userID: id }] 
    }).select('-password -salt -resetPasswordCode -resetPasswordExpires -verificationCode -verificationExpires -adminMfaCodeHash -adminMfaCodeExpires');
    
    if (!user) {
      return errorJson('User not found', 404);
    }
    
    return successJson(user);
  } catch (error: unknown) {
    return handleRouteError(error, `GET /api/users/${id || '[id]'}`);
  }
}

// PATCH handler - update a user
export async function PATCH(request: Request, { params }: RouteContext<{ id: string }>) {
  try {
    const { id } = await params;
    const { actor, response } = await requireSelfOrAdmin(id);
    if (!actor || response) {
      return response;
    }
    const { data, error } = await parseJsonBody(request, updateUserBodySchema);
    if (error) {
      return error;
    }

    if ('password' in data) {
      return errorJson('Use the dedicated change-password route to update passwords', 400);
    }
    
    await connectToDatabase();
    
    // Find user
    const user = await User.findOne({ 
      $or: [{ _id: id }, { userID: id }] 
    });
    
    if (!user) {
      return errorJson('User not found', 404);
    }
    
    // Handle email update - check if new email is already in use
    if (data.email && data.email !== user.email) {
      const existingUserWithEmail = await User.findOne({ email: data.email });
      if (existingUserWithEmail) {
        return errorJson('Email is already in use', 409);
      }
    }
    
    const isAdmin = actor.role === 'admin';
    const allowedSelfFields = new Set([
      'name',
      'nickname',
      'email',
      'phone',
      'languagePreference',
      'emailPreferences',
      // Note: address changes for non-admins must go through /verify-address
    ]);

    if (!isAdmin) {
      // Reject any attempt to modify address-related fields directly
      const addressKeys = Object.keys(data).filter((k) => ADDRESS_FIELDS.has(k));
      if (addressKeys.length > 0) {
        return errorJson(
          'Address changes must be made through the address verification flow.',
          400
        );
      }

      Object.keys(data).forEach((key) => {
        if (!allowedSelfFields.has(key)) {
          delete data[key as keyof typeof data];
        }
      });
    }

    // For admin address updates: compute and return a serviceability warning
    let serviceabilityWarning: string | null = null;
    if (isAdmin && data.address) {
      const addr = data.address as { province?: string; postalCode?: string };
      const svc = resolveServiceability({
        areaLabel: addr.province,
        postalCode: addr.postalCode,
      });
      if (!svc.isServed) {
        serviceabilityWarning = `Address area "${addr.province}" is not in any Kapioo service zone.`;
      } else if (!svc.canDaily && !svc.canWeekly) {
        serviceabilityWarning = `Address area "${addr.province}" has no active coverage.`;
      }
    }

    // Handle userID update - admin only
    if (data.userID && data.userID !== user.userID) {
      if (!isAdmin) {
        return errorJson('Only admins can change user ID', 403);
      }

      const existingUserWithID = await User.findOne({ userID: data.userID });
      if (existingUserWithID) {
        return errorJson('User ID is already in use', 409);
      }
    }
    
    // Update user fields
    Object.keys(data).forEach((key) => {
      if (
        key !== 'password' &&
        key !== 'salt' &&
        key !== 'sessionVersion' &&
        key !== 'role' &&
        key !== 'adminMfaCodeHash' &&
        key !== 'adminMfaCodeExpires'
      ) {
        user.set(key, data[key as keyof typeof data]);
      }
    });
    
    await user.save();
    
    // Return updated user without password and salt
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.salt;
    delete userResponse.resetPasswordCode;
    delete userResponse.resetPasswordExpires;
    delete userResponse.verificationCode;
    delete userResponse.verificationExpires;
    delete userResponse.adminMfaCodeHash;
    delete userResponse.adminMfaCodeExpires;
    
    return successJson({ ...userResponse, serviceabilityWarning });
  } catch (error: unknown) {
    return handleRouteError(error, 'PATCH /api/users/[id]');
  }
}

// DELETE handler - delete a user
export async function DELETE(request: Request, { params }: RouteContext<{ id: string }>) {
  let id = '';
  try {
    ({ id } = await params);
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }
    
    await connectToDatabase();
    
    // Find and delete user
    const user = await User.findOneAndDelete({ 
      $or: [{ _id: id }, { userID: id }] 
    });
    
    if (!user) {
      return errorJson('User not found', 404);
    }
    
    return successJson({ 
      message: 'User deleted successfully' 
    });
  } catch (error: unknown) {
    return handleRouteError(error, `DELETE /api/users/${id || '[id]'}`);
  }
} 