import { NextResponse } from 'next/server';
import {
  ApiError,
  errorJson,
  handleRouteError,
  parseJsonBody,
  parseSearchParams,
  successJson,
} from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { createUserBodySchema, usersQuerySchema } from '@/lib/contracts/user';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { withUserDisplayName } from '@/lib/users/display';
import { CreateAccountError, createAccount } from '@/lib/users/create-account';

// GET handler - return all users (with pagination and search)
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const { data: queryInput, error } = parseSearchParams(request, usersQuerySchema);
    if (error) {
      return error;
    }

    const page = queryInput.page ?? 1;
    const limit = queryInput.limit ?? 10;
    const search = queryInput.search ?? '';
    const searchType = queryInput.searchType ?? 'all';
    const skip = (page - 1) * limit;

    await connectToDatabase();
    
    // Build query based on search parameters
    let query: Record<string, unknown> = {};
    
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive search
      
      switch (searchType) {
        case 'name':
          query = { $or: [{ name: searchRegex }, { nickname: searchRegex }] };
          break;
        case 'email':
          query = { email: searchRegex };
          break;
        case 'userID':
          query = { userID: searchRegex };
          break;
        case 'phone':
          query = { phone: searchRegex };
          break;
        default: // 'all'
          query = {
            $or: [
              { name: searchRegex },
              { nickname: searchRegex },
              { email: searchRegex },
              { userID: searchRegex },
              { phone: searchRegex },
            ]
          };
          break;
      }
    }
    
    // Find users with pagination and search, excluding password and salt fields
    const users = await User.find(query)
      .select('-password -salt -verificationCode -resetPasswordCode -verificationExpires -resetPasswordExpires')
      .sort({ joined: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count for pagination with the same search query
    const totalUsers = await User.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      data: users.map((user) => withUserDisplayName(user)),
      pagination: {
        total: totalUsers,
        page,
        limit,
        pages: Math.ceil(totalUsers / limit)
      }
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/users');
  }
}

// POST handler - create a new user (admin / legacy callers; signup uses POST /api/auth/register)
export async function POST(request: Request) {
  try {
    const { data, error } = await parseJsonBody(request, createUserBodySchema);
    if (error) {
      return error;
    }

    const { sanitized } = await createAccount(data);
    return successJson(sanitized, 201);
  } catch (err: unknown) {
    if (err instanceof CreateAccountError) {
      return errorJson(err.message, err.status, err.details ? { details: err.details } : undefined);
    }

    if (err instanceof ApiError) {
      return handleRouteError(err, 'POST /api/users');
    }

    return handleRouteError(err, 'POST /api/users');
  }
}
