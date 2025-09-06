import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';

// GET handler - return user's subscription history (simplified for testing)
export async function GET(request: Request) {
  try {
    console.log('Fetching user subscription history...');
    await connectToDatabase();
    
    // For testing purposes, return mock subscription history
    const mockSubscriptions = [
      {
        id: 'subscription-001',
        items: [
          { dayId: 'sunday', optionId: 'sunday-option1', quantity: 1 },
          { dayId: 'tuesday', optionId: 'tuesday-option2', quantity: 2 }
        ],
        status: 'completed',
        totalItems: 3,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
      },
      {
        id: 'subscription-002',
        items: [
          { dayId: 'sunday', optionId: 'sunday-option3', quantity: 1 },
          { dayId: 'tuesday', optionId: 'tuesday-option1', quantity: 1 }
        ],
        status: 'active',
        totalItems: 2,
        createdAt: new Date().toISOString() // today
      }
    ];
    
    return NextResponse.json(
      { 
        success: true, 
        data: mockSubscriptions,
        message: 'Subscription history retrieved successfully (testing mode)'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user subscription history:', error);
    
    // Log more detailed information for debugging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch subscription history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}