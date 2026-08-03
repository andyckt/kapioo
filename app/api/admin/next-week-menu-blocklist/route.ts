import { errorJson, parseJsonBody, successJson } from "@/lib/api";
import { adminNextWeekMenuBlocklistBodySchema } from "@/lib/contracts/admin-routes";
import { requireAdminMfa } from "@/lib/auth/guards";
import {
  addToNextWeekMenuBlocklist,
  getNextWeekMenuBlocklist,
  removeFromNextWeekMenuBlocklist,
} from "@/lib/next-week-menu-email/blocklist";

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const emails = await getNextWeekMenuBlocklist();

    return successJson({
      emails,
      count: emails.length,
    });
  } catch (error: unknown) {
    console.error("Error fetching next-week menu blocklist:", error);
    return errorJson("Failed to fetch email exclusion list", 500);
  }
}

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const bodyParsed = await parseJsonBody(request, adminNextWeekMenuBlocklistBodySchema);
    if (bodyParsed.error) {
      return bodyParsed.error;
    }

    const result = await addToNextWeekMenuBlocklist(bodyParsed.data.emails);

    return successJson(result);
  } catch (error: unknown) {
    console.error("Error adding to next-week menu blocklist:", error);
    return errorJson("Failed to add emails to exclusion list", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const bodyParsed = await parseJsonBody(request, adminNextWeekMenuBlocklistBodySchema);
    if (bodyParsed.error) {
      return bodyParsed.error;
    }

    const result = await removeFromNextWeekMenuBlocklist(bodyParsed.data.emails);

    return successJson(result);
  } catch (error: unknown) {
    console.error("Error removing from next-week menu blocklist:", error);
    return errorJson("Failed to remove emails from exclusion list", 500);
  }
}
