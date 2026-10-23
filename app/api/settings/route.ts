import { ApiError, handleRouteError, parseJsonBody, successJson } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import { updateSettingBodySchema } from '@/lib/contracts/settings';
import connectToDatabase from '@/lib/db';
import { isPublicSettingsKey } from '@/lib/settings-access';
import Settings from '@/models/Settings';
import { logAuditEvent } from '@/lib/security/audit';

// GET all settings or a specific setting by key
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (!isPublicSettingsKey(key)) {
      const { actor, response } = await requireAdminMfa(request);
      if (!actor || response) {
        return response;
      }
    }

    await connectToDatabase();
    
    if (key) {
      // Get specific setting
      const setting = await Settings.findOne({ key });
      
      if (!setting) {
        // Return default values if setting doesn't exist
        if (key === 'cutoffTime' || key === 'cancellationTime') {
          return successJson({
            key,
            value: { hour: 11, minute: 59 },
          });
        }
        
        return handleRouteError(
          new ApiError('Setting not found', { status: 404 }),
          'GET /api/settings'
        );
      }
      
      return successJson(setting);
    } else {
      // Get all settings
      const settings = await Settings.find({});
      return successJson(settings);
    }
  } catch (error) {
    return handleRouteError(error, 'GET /api/settings');
  }
}

// POST or PUT to create/update a setting
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();
    const { data, error } = await parseJsonBody(request, updateSettingBodySchema);
    if (error) {
      return error;
    }
    
    const previous = data.key === "cancellationTime"
      ? await Settings.findOne({ key: data.key }).lean<{ value?: unknown }>()
      : null;

    // Update or create setting
    const setting = await Settings.findOneAndUpdate(
      { key: data.key },
      { 
        key: data.key,
        value: data.value,
        description: data.description 
      },
      { upsert: true, new: true, runValidators: true }
    );
    
    if (data.key === "cancellationTime") {
      await logAuditEvent({ actor, action: "settings.cancellation-time.update", targetType: "setting", targetId: data.key, request, metadata: { before: previous?.value ?? { hour: 11, minute: 59 }, after: data.value, timezone: "America/Toronto" } });
    }
    return successJson(setting);
  } catch (error) {
    return handleRouteError(error, 'POST /api/settings');
  }
}


