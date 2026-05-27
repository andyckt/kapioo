import {
  ApiError,
  errorJson,
  handleRouteError,
  parseJsonBody,
  successJson,
} from "@/lib/api";
import { attachAuthSessionCookie } from "@/lib/auth/session-cookie";
import { toAuthSessionUser } from "@/lib/auth/session-user";
import { registerBodySchema } from "@/lib/contracts/auth";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { CreateAccountError, createAccount } from "@/lib/users/create-account";
import { toClientAuthUser } from "@/lib/users/to-client-auth-user";

/**
 * Post–email-verification signup: create account and issue Auth.js session in one request.
 * Avoids a second credentials sign-in (duplicate password hash) and /api/auth/me round-trip.
 */
export async function POST(request: Request) {
  try {
    const { data, error } = await parseJsonBody(request, registerBodySchema);
    if (error) {
      return error;
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimitResult = checkRateLimit(
      `register:${ipAddress}:${data.email.toLowerCase()}`,
      10,
      15 * 60 * 1000
    );
    if (!rateLimitResult.allowed) {
      return errorJson("Too many registration attempts. Please try again later.", 429);
    }

    const { user } = await createAccount({
      ...data,
      isVerified: true,
    });

    const sessionUser = toAuthSessionUser(user);
    const clientUser = toClientAuthUser(user, sessionUser.role);

    const response = successJson({
      authenticated: true,
      user: clientUser,
    });

    return attachAuthSessionCookie(response, sessionUser, request);
  } catch (err: unknown) {
    if (err instanceof CreateAccountError) {
      return errorJson(err.message, err.status, err.details ? { details: err.details } : undefined);
    }

    if (err instanceof ApiError) {
      return handleRouteError(err, "POST /api/auth/register");
    }

    return handleRouteError(err, "POST /api/auth/register");
  }
}
