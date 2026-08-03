import { errorJson, parseJsonBody, successJson } from "@/lib/api";
import { adminNextWeekMenuOrderedUserIdsBodySchema } from "@/lib/contracts/admin-routes";
import { requireAdminMfa } from "@/lib/auth/guards";
import { getUserIdsWithNextWeekMenuOrders } from "@/lib/next-week-menu-email/next-week-order-users";

export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const bodyParsed = await parseJsonBody(request, adminNextWeekMenuOrderedUserIdsBodySchema);
    if (bodyParsed.error) {
      return bodyParsed.error;
    }

    const { userIds } = bodyParsed.data;
    const result = await getUserIdsWithNextWeekMenuOrders({
      userIds: userIds.length > 0 ? userIds : undefined,
    });

    return successJson({
      userIds: result.userIds,
      count: result.userIds.length,
      nextWeekMenuDates: result.nextWeekMenuDates,
      ordersChecked: result.ordersChecked,
    });
  } catch (error: unknown) {
    console.error("Error resolving next-week menu ordered users:", error);
    return errorJson("Failed to resolve users with next-week orders", 500);
  }
}
