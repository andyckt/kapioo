import { handleRouteError, successJson } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import { logAuditEvent } from '@/lib/security/audit';
import User from '@/models/User';

// GET handler - return all users without pagination for export
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    
    // Find all users, excluding password and sensitive fields
    const users = await User.find({})
      .select('-password -salt -verificationCode -resetPasswordCode -verificationExpires -resetPasswordExpires')
      .sort({ joined: -1 });

    await logAuditEvent({
      actor,
      action: 'users.export',
      targetType: 'user-export',
      metadata: {
        exportedCount: users.length,
      },
      request,
    });
    
    return successJson(users);
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/users/export');
  }
}
