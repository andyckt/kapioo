import { errorJson, handleRouteError, successJson, type RouteContext } from '@/lib/api';
import { requireSelfOrAdmin } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import { findUserByIdentifier } from '@/lib/api/users';
import User from '@/models/User';

// GET handler - fetch user's voucher balance
export async function GET(
  request: Request,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { id } = await params;
    const { actor, response } = await requireSelfOrAdmin(id);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    
    // Find the user
    const user = await findUserByIdentifier(id);
    
    if (!user) {
      return errorJson('User not found', 404);
    }
    
    return successJson({
      twoDishVoucher: user.twoDishVoucher,
      threeDishVoucher: user.threeDishVoucher
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/users/[id]/vouchers');
  }
}
