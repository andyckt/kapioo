import { errorJson, handleRouteError, parseJsonBody, successJson } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { tagBodySchema } from '@/lib/contracts/content';
import connectToDatabase from '@/lib/db';
import Tag from '@/models/Tag';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const tags = await Tag.find({}).sort({ name: 1 });
    return successJson(tags);
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/tags');
  }
}

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const { data, error } = await parseJsonBody(request, tagBodySchema);
    if (error) {
      return error;
    }
    
    // Check if tag already exists
    const existingTag = await Tag.findOne({ name: data.name });
    if (existingTag) {
      return errorJson('Tag already exists', 409);
    }
    
    const tag = await Tag.create(data);
    return successJson(tag, 201);
  } catch (error: unknown) {
    return handleRouteError(error, 'POST /api/tags');
  }
}
