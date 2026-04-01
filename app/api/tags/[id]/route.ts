import { errorJson, handleRouteError, parseJsonBody, successJson, type RouteContext } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { tagBodySchema } from '@/lib/contracts/content';
import connectToDatabase from '@/lib/db';
import Tag from '@/models/Tag';

export async function GET(
  request: Request,
  { params }: RouteContext<{ id: string }>
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const tag = await Tag.findById(id);
    
    if (!tag) {
      return errorJson('Tag not found', 404);
    }
    
    return successJson(tag);
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/tags/[id]');
  }
}

export async function PUT(
  request: Request,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const { id } = await params;
    const { data, error } = await parseJsonBody(request, tagBodySchema);
    if (error) {
      return error;
    }
    
    // Check if tag with new name already exists (but is not this tag)
    const existingTag = await Tag.findOne({ name: data.name, _id: { $ne: id } });
    if (existingTag) {
      return errorJson('Tag name already in use', 409);
    }
    
    const tag = await Tag.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );
    
    if (!tag) {
      return errorJson('Tag not found', 404);
    }
    
    return successJson(tag);
  } catch (error: unknown) {
    return handleRouteError(error, 'PUT /api/tags/[id]');
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext<{ id: string }>
) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const { id } = await params;
    
    const tag = await Tag.findByIdAndDelete(id);
    
    if (!tag) {
      return errorJson('Tag not found', 404);
    }
    
    return successJson({});
  } catch (error: unknown) {
    return handleRouteError(error, 'DELETE /api/tags/[id]');
  }
}
