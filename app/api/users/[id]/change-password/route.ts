import { errorJson, handleRouteError, parseJsonBody, successJson, type RouteContext } from '@/lib/api';
import { requireSelfOrAdmin } from '@/lib/auth/guards';
import { changePasswordBodySchema } from '@/lib/contracts/user';
import connectToDatabase from '@/lib/db';
import { findUserByIdentifier } from '@/lib/api/users';
import User from '@/models/User';

// POST handler - change user password
export async function POST(request: Request, { params }: RouteContext<{ id: string }>) {
  let id = '';
  try {
    ({ id } = await params);
    const { actor, response } = await requireSelfOrAdmin(id);
    if (!actor || response) {
      return response;
    }
    const { data, error } = await parseJsonBody(request, changePasswordBodySchema);
    if (error) {
      return error;
    }
    const { currentPassword, newPassword } = data;
    
    // Validate inputs
    if (!newPassword || (!currentPassword && actor.role !== 'admin')) {
      return errorJson('Current password and new password are required', 400);
    }
    
    await connectToDatabase();
    
    // Find user
    const user = await findUserByIdentifier(id);
    
    if (!user) {
      return errorJson('User not found', 404);
    }
    
    // Verify current password
    if (actor.role !== 'admin') {
      const isPasswordValid = await user.comparePassword(currentPassword);
      
      if (!isPasswordValid) {
        return errorJson('Current password is incorrect', 400);
      }
    }
    
    // Set new password
    await user.setPassword(newPassword);
    user.sessionVersion = Number(user.sessionVersion || 1) + 1;
    await user.save();
    
    return successJson({ 
      message: 'Password updated successfully' 
    });
  } catch (error: unknown) {
    return handleRouteError(error, `POST /api/users/${id || '[id]'}/change-password`);
  }
} 