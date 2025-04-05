import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Transaction from '@/models/Transaction';
import mongoose from 'mongoose';

// GET handler - get transactions with optional userId filtering
export async function GET(request: Request) {
  try {
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