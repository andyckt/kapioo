import { errorJson, handleRouteError, parseJsonBody, successJson } from '@/lib/api';
import { emailCodeBodySchema } from '@/lib/contracts/auth';
import connectToDatabase from '@/lib/db';
import { checkRateLimit } from '@/lib/security/rate-limit';
import User from '@/models/User';

export async function POST(request: Request) {
  try {
    const { data, error } = await parseJsonBody(request, emailCodeBodySchema);
    if (error) {
      return error;
    }
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const rateLimitResult = checkRateLimit(
      `verify-reset:${ipAddress}:${String(data.email).toLowerCase()}`,
      10,
      15 * 60 * 1000
    );
    if (!rateLimitResult.allowed) {
      return errorJson('Too many verification attempts. Please try again later.', 429);
    }
    
    await connectToDatabase();
    
    // Find user by email and reset code and ensure it hasn't expired
    const user = await User.findOne({
      email: data.email.toLowerCase(),
      resetPasswordCode: data.code,
      resetPasswordExpires: { $gt: new Date() }
    });
    
    if (!user) {
      return errorJson('Invalid or expired reset code', 400);
    }
    
    return successJson({
      message: 'Reset code is valid'
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'POST /api/auth/verify-reset-code');
  }
} 