import { errorJson, handleRouteError, parseJsonBody, successJson } from '@/lib/api';
import { emailOnlyBodySchema } from '@/lib/contracts/auth';
import connectToDatabase from '@/lib/db';
import { checkRateLimit } from '@/lib/security/rate-limit';
import User from '@/models/User';
import { sendVerificationEmail } from '@/lib/services/email';

export async function POST(request: Request) {
  try {
    const { data, error } = await parseJsonBody(request, emailOnlyBodySchema);
    if (error) {
      return error;
    }
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const rateLimitResult = checkRateLimit(
      `resend-verification:${ipAddress}:${String(data.email).toLowerCase()}`,
      5,
      15 * 60 * 1000
    );
    if (!rateLimitResult.allowed) {
      return errorJson('Too many verification attempts. Please try again later.', 429);
    }
    
    await connectToDatabase();
    
    // Find user by email
    const user = await User.findOne({ email: data.email.toLowerCase() });
    
    if (!user) {
      return errorJson('User not found', 404);
    }
    
    // Check if already verified
    if (user.isVerified) {
      return errorJson('Email is already verified', 400);
    }
    
    // Generate new verification code
    const { code } = user.generateVerificationCode();
    
    await user.save();
    
    // Send verification email with code
    await sendVerificationEmail(user.email, code, user.languagePreference || 'zh');
    
    return successJson({
      message: 'Verification email sent successfully'
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'POST /api/auth/resend-verification');
  }
} 