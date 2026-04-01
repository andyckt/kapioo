import { errorJson, handleRouteError, parseJsonBody, successJson } from '@/lib/api';
import { emailOnlyBodySchema } from '@/lib/contracts/auth';
import connectToDatabase from '@/lib/db';
import { checkRateLimit } from '@/lib/security/rate-limit';
import User from '@/models/User';
import { sendPasswordResetEmail } from '@/lib/services/email';

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
      `password-reset:${ipAddress}:${String(data.email).toLowerCase()}`,
      5,
      15 * 60 * 1000
    );
    if (!rateLimitResult.allowed) {
      return errorJson('Too many password reset attempts. Please try again later.', 429);
    }
    
    await connectToDatabase();
    
    // Find user by email
    const user = await User.findOne({ email: data.email.toLowerCase() });
    
    // For security reasons, don't reveal whether the email exists or not
    // Just return success even if the user doesn't exist
    if (!user) {
      return successJson({
        message: 'If the email exists, a password reset code will be sent'
      });
    }
    
    // Generate password reset code
    const { code } = user.generatePasswordResetCode();
    
    await user.save();
    
    // Send password reset email with code
    try {
      await sendPasswordResetEmail(user.email, code, user.languagePreference || 'zh');
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      return errorJson('Failed to send password reset email', 500);
    }
    
    return successJson({
      message: 'Password reset code sent successfully'
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'POST /api/auth/request-password-reset');
  }
} 