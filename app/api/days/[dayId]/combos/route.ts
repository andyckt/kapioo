import { handleRouteError, successJson, type RouteContext } from '@/lib/api';
import connectToDatabase from '@/lib/db';
import { rewriteS3UrlToCloudFront } from '@/lib/upload/menu-image';
import Combo from '@/models/Combo';

export async function GET(
  request: Request,
  { params }: RouteContext<{ dayId: string }>
) {
  try {
    await connectToDatabase();
    const { dayId } = await params;
    const combos = await Combo.find({ dayId });
    
    return successJson(combos.map((combo) => ({
      ...combo.toObject(),
      imageUrl: rewriteS3UrlToCloudFront(combo.imageUrl),
    })));
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/days/[dayId]/combos');
  }
}
