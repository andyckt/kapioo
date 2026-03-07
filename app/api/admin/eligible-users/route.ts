import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

// GET handler - get list of eligible users for email sending
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const idsOnly = url.searchParams.get('idsOnly') === 'true'; // New parameter
    const skip = (page - 1) * limit;
    
    await connectToDatabase();
    
    // Build query for eligible users
    const query: any = {
      isVerified: true,
      emailStatus: { $ne: 'bounced' },
      email: { $exists: true, $ne: '', $ne: null },
      'emailPreferences.nextWeekMenuUpdates': { $ne: false }
    };
    
    // Add search filter if provided
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { userID: searchRegex },
        { name: searchRegex },
        { email: searchRegex }
      ];
    }
    
    // If idsOnly requested, return all IDs without pagination
    if (idsOnly) {
      const allUserIds = await User.find(query)
        .select('_id')
        .lean();
      
      return NextResponse.json({
        success: true,
        data: {
          ids: allUserIds.map((u: any) => u._id.toString()),
          total: allUserIds.length
        }
      });
    }
    
    // Fetch users with pagination
    const users = await User.find(query)
      .select('_id userID name email')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      data: {
        users,
        page,
        limit,
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching eligible users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
