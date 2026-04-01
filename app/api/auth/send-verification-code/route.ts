import { errorJson, handleRouteError, parseJsonBody, successJson } from '@/lib/api';
import { sendVerificationBodySchema } from '@/lib/contracts/auth';
import connectToDatabase from '@/lib/db';
import { checkRateLimit } from '@/lib/security/rate-limit';
import User from '@/models/User';
import { sendVerificationEmail } from '@/lib/services/email';

export async function POST(request: Request) {
  try {
    const { data, error } = await parseJsonBody(request, sendVerificationBodySchema);
    if (error) {
      return error;
    }
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const rateLimitResult = checkRateLimit(
      `send-verification:${ipAddress}:${String(data.email).toLowerCase()}`,
      5,
      15 * 60 * 1000
    );
    if (!rateLimitResult.allowed) {
      return errorJson('Too many verification requests. Please try again later.', 429);
    }
    
    await connectToDatabase();
    
    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    
    if (existingUser) {
      return errorJson('User with this email already exists', 409);
    }
    
    // Send verification email with the provided code
    try {
      // Use language from request or default to 'zh'
      const language = data.language || 'zh';
      await sendVerificationEmail(data.email, data.code, language);
      console.log('Verification email sent successfully to:', data.email);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      return errorJson('Failed to send verification email', 500);
    }
    
    return successJson({
      message: 'Verification email sent successfully'
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'POST /api/auth/send-verification-code');
  }
}
