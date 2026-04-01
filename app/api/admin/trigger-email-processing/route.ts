import { errorJson } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";

/**
 * Manual trigger endpoint for processing email jobs
 *
 * Since Hobby plan only allows daily cron (once per day at 9 AM),
 * this endpoint allows admins to manually trigger additional processing runs.
 *
 * The admin can call this endpoint multiple times to process the job faster.
 * Each call processes 30 users (~6 seconds).
 *
 * Usage:
 * - After creating a job, click "Process Now" button repeatedly
 * - Or set up a client-side interval to call this every 10 seconds
 */
export async function POST(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return errorJson("Email processing is not configured", 503);
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const cronUrl = `${baseUrl}/api/cron/process-next-week-email-jobs`;

    const cronResponse = await fetch(cronUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    const data: unknown = await cronResponse.json();

    return Response.json(data);
  } catch (error: unknown) {
    console.error("Error triggering email processing:", error);
    return errorJson("Failed to trigger email processing", 500);
  }
}
