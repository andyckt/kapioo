import { errorJson, handleRouteError, parseJsonBody, successJson } from '@/lib/api';
import { userIdBodySchema } from '@/lib/contracts/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { sendVerificationEmail } from '@/lib/services/email';

export async function POST(request: Request) {
  try {
    const { data, error } = await parseJsonBody(request, userIdBodySchema);
    if (error) {
      return error;
    }
    
    await connectToDatabase();
    
    // Find user by ID
    const user = await User.findOne({ 
      $or: [
        { _id: data.userId },
        { userID: data.userId }
      ]
    });
    
    if (!user) {
      return errorJson('User not found', 404);
    }
    
    // Check if already verified
    if (user.isVerified) {
      return errorJson('Email is already verified', 400);
    }
    
    // Generate verification code
    const { code } = user.generateVerificationCode();
    
    await user.save();
    
    // Send verification email with code
    await sendVerificationEmail(user.email, code, user.languagePreference || 'zh');
    
    return successJson({
      message: 'Verification email sent successfully'
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'POST /api/auth/send-verification');
  }
} 