import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import {
  applyBalanceMutations,
  type ApplyBalanceMutationsResult,
  BalanceMutationError,
  findBalanceMutationUser,
} from '@/lib/balances/mutations';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';

// Interface for route params
interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST handler - add credits to a user account
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { id } = await params;
    const { credits, description = 'Added Credits' } = await request.json();
    
    // Validate input
    if (!credits || typeof credits !== 'number' || credits <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid credit amount is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();

    const session = await mongoose.startSession();
    try {
      const resultRef: { current: ApplyBalanceMutationsResult | null } = { current: null };

      await session.withTransaction(async () => {
        const user = await findBalanceMutationUser(id, session);
        if (!user) {
          throw new BalanceMutationError('User not found', {
            status: 404,
            code: 'USER_NOT_FOUND',
          });
        }

        resultRef.current = await applyBalanceMutations({
          user,
          mutations: [{ field: 'credits', amount: credits, operation: 'add' }],
          description,
          session,
          actor,
          request,
          auditAction: 'balance.add',
          auditTargetType: 'user-balance',
          auditMetadata: {
            field: 'credits',
            amount: credits,
            operation: 'add',
            source: 'legacy-add-credits-route',
          },
        });
      });

      if (!resultRef.current) {
        throw new Error('Credit mutation did not complete');
      }
      const result = resultRef.current;
    
      return NextResponse.json({ 
        success: true, 
        data: {
          credits: result.user.credits,
          transaction: result.transaction
        }
      });
    } finally {
      await session.endSession();
    }
  } catch (error: any) {
    if (error instanceof BalanceMutationError) {
      return NextResponse.json(
        { success: false, error: error.message, details: error.details },
        { status: error.status }
      );
    }

    console.error('Error adding credits to user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add credits', details: error.message },
      { status: 500 }
    );
  }
} 