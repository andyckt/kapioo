import { errorJson, handleRouteError, parseJsonBody, successJson } from '@/lib/api';
import { phoneOnlyBodySchema } from '@/lib/contracts/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

// POST handler - verify phone number
export async function POST(request: Request) {
  try {
    const { data, error } = await parseJsonBody(request, phoneOnlyBodySchema);
    if (error) {
      return error;
    }
    
    await connectToDatabase();
    
    // Find user by phone
    const user = await User.findOne({
      phone: data.phone,
    });
    
    if (!user) {
      return errorJson('Phone number not found', 404);
    }
    
    // Check if the user is active
    if (user.status !== 'Active') {
      return errorJson('Account is not active', 403);
    }
    
    // Return success and userID for password reset
    return successJson({
      userId: user.userID,
      message: 'Phone number verified successfully'
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'POST /api/auth/verify-phone');
  }
} 