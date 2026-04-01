import { errorJson, handleRouteError, parseJsonBody, successJson } from '@/lib/api';
import { emailCodeBodySchema } from '@/lib/contracts/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

export async function POST(request: Request) {
  try {
    const { data, error } = await parseJsonBody(request, emailCodeBodySchema);
    if (error) {
      return error;
    }
    
    await connectToDatabase();
    
    // Find user by email and verification code and ensure it hasn't expired
    const user = await User.findOne({
      email: data.email.toLowerCase(),
      verificationCode: data.code,
      verificationExpires: { $gt: new Date() }
    });
    
    if (!user) {
      return errorJson('Invalid or expired verification code', 400);
    }
    
    // Mark user as verified
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    
    await user.save();
    
    // Return user data without sensitive fields
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.salt;
    delete userResponse.resetPasswordCode;
    delete userResponse.resetPasswordExpires;
    
    return successJson({
      message: 'Email successfully verified',
      user: userResponse
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'POST /api/auth/verify-email');
  }
} 