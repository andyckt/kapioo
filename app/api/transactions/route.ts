import { NextResponse } from 'next/server';
import { requireAdminMfa, requireUser } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import Transaction from '@/models/Transaction';
import mongoose from 'mongoose';

// GET handler - get transactions with optional userId filtering
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireUser();
    if (!actor || response) {
      return response;
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Database connected');
    
    // Build query
    const query: any = {};
    if (userId) {
      const isSelf =
        String(actor.user._id) === String(userId) ||
        String(actor.user.userID) === String(userId);
      if (!isSelf && actor.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'You do not have access to these transactions' },
          { status: 403 }
        );
      }

      if (!isSelf && actor.role === 'admin') {
        const { response: adminMfaResponse } = await requireAdminMfa(request);
        if (adminMfaResponse) {
          return adminMfaResponse;
        }
      }

      // Try to match userId in both ObjectId and string formats
      if (mongoose.Types.ObjectId.isValid(userId)) {
        query['$or'] = [
          { userId: new mongoose.Types.ObjectId(userId) },
          { userId: userId }
        ];
      } else {
        query.userId = userId;
      }
      console.log('Using userId query:', JSON.stringify(query));
    } else if (actor.role !== 'admin') {
      query['$or'] = [
        { userId: actor.user._id },
        { userId: String(actor.user._id) }
      ];
    } else {
      const { response: adminMfaResponse } = await requireAdminMfa(request);
      if (adminMfaResponse) {
        return adminMfaResponse;
      }
    }
    
    console.log('Executing transaction query:', JSON.stringify(query));
    console.log('Transaction model defined?', !!Transaction);
    
    try {
      // Find transactions with pagination
      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 }) // Sort by most recent first
        .skip(skip)
        .limit(limit);
      
      console.log(`Found ${transactions.length} transactions`);
      
      // Get total count for pagination
      const totalTransactions = await Transaction.countDocuments(query);
      
      return NextResponse.json({ 
        success: true, 
        data: {
          transactions,
          page,
          limit,
          total: totalTransactions,
          pages: Math.ceil(totalTransactions / limit)
        }
      });
    } catch (dbError: any) {
      console.error('Database error when fetching transactions:', dbError);
      return NextResponse.json(
        { success: false, error: 'Database error when fetching transactions', details: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions', details: error.message },
      { status: 500 }
    );
  }
} 