import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

// #region agent log
const dbg = (msg: string, hypothesisId: string, extra?: Record<string, unknown>) => {
  fetch('http://127.0.0.1:7408/ingest/168f9695-c59e-49d7-a32e-0ca3a9e2f0a4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a9f6fa'},body:JSON.stringify({sessionId:'a9f6fa',location:'reset-password/route.ts',message:msg,data:{hypothesisId,...extra},timestamp:Date.now(),hypothesisId})}).catch(()=>{});
};
// #endregion

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.code || !data.password || !data.email) {
      dbg('reset_validation_failed','A',{hasCode:!!data.code,hasPassword:!!data.password,hasEmail:!!data.email});
      return NextResponse.json(
        { success: false, error: 'Code, email, and new password are required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find user by email and reset code and ensure it hasn't expired
    const user = await User.findOne({
      email: data.email.toLowerCase(),
      resetPasswordCode: data.code,
      resetPasswordExpires: { $gt: new Date() }
    });
    
    if (!user) {
      dbg('reset_user_not_found','A');
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset code' },
        { status: 400 }
      );
    }
    
    dbg('reset_before_setPassword','A',{userId:String(user._id)});
    // Set the new password
    await user.setPassword(data.password);
    
    // Clear the reset code
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    dbg('reset_save_success','A',{userId:String(user._id)});
    
    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7408/ingest/168f9695-c59e-49d7-a32e-0ca3a9e2f0a4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a9f6fa'},body:JSON.stringify({sessionId:'a9f6fa',location:'reset-password/route.ts',message:'reset_error',data:{hypothesisId:'A',error:String(error)},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    );
  }
} 