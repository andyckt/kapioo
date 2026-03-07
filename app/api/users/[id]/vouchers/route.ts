import { NextRequest, NextResponse } from 'next/server';
import { requireSelfOrAdmin } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

// GET handler - fetch user's voucher balance
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = context.params.id;
    const { actor, response } = await requireSelfOrAdmin(id);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    
    // Find the user
    const user = await User.findById(id).select('twoDishVoucher threeDishVoucher');
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        twoDishVoucher: user.twoDishVoucher,
        threeDishVoucher: user.threeDishVoucher
      }
    });
  } catch (error) {
    console.error('Error fetching user voucher balance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user voucher balance' },
      { status: 500 }
    );
  }
}
