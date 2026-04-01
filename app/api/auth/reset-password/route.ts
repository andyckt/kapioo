import { errorJson, handleRouteError, parseJsonBody, successJson } from '@/lib/api';
import { resetPasswordBodySchema } from '@/lib/contracts/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

export async function POST(request: Request) {
  try {
    const { data, error } = await parseJsonBody(request, resetPasswordBodySchema);
    if (error) {
      return error;
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
    
    // Set the new password
    await user.setPassword(data.newPassword);
    
    // Clear the reset code
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    return successJson({
      message: 'Password has been reset successfully'
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'POST /api/auth/reset-password');
  }
} 