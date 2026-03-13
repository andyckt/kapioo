import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import connectToDatabase from "@/lib/db";
import { AUTH_SECRET } from "@/lib/env";
import { resolveUserRole } from "@/lib/auth/session";
import User from "@/models/User";
import { checkRateLimit } from "@/lib/security/rate-limit";

const credentialsSchema = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Kapioo Credentials",
      credentials: {
        login: { label: "User ID or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials, request) {
        const logReason = (reason: string) => {
          console.warn("[auth][authorize] CredentialsSignin reason:", reason);
        };
        // #region agent log
        const dbg = (reason: string, hypothesisId: string, extra?: Record<string, unknown>) => {
          fetch('http://127.0.0.1:7408/ingest/168f9695-c59e-49d7-a32e-0ca3a9e2f0a4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a9f6fa'},body:JSON.stringify({sessionId:'a9f6fa',location:'auth.ts:authorize',message:reason,data:{reason,hypothesisId,...extra},timestamp:Date.now(),hypothesisId})}).catch(()=>{});
        };
        // #endregion

        try {
          const parsed = credentialsSchema.safeParse(rawCredentials);
          if (!parsed.success) {
            dbg('invalid_schema','B');
            logReason("invalid_schema");
            return null;
          }

          const { login, password } = parsed.data;
          const ipAddress =
            request?.headers?.get("x-forwarded-for") ||
            request?.headers?.get("x-real-ip") ||
            "unknown";
          const rateLimitResult = checkRateLimit(
            `login:${ipAddress}:${login.toLowerCase()}`,
            10,
            15 * 60 * 1000
          );
          if (!rateLimitResult.allowed) {
            dbg('rate_limit_exceeded','E',{retryAfterMs:rateLimitResult.retryAfterMs});
            logReason("rate_limit_exceeded");
            console.warn("[auth][authorize] Rate limit details:", {
              retryAfterMs: rateLimitResult.retryAfterMs,
            });
            return null;
          }

          await connectToDatabase();

          const user = await User.findOne({
            $or: [
              { userID: login },
              { email: login.toLowerCase() },
            ],
          });

          if (!user) {
            dbg('user_not_found','B');
            logReason("user_not_found");
            return null;
          }

          if (user.status !== "Active") {
            dbg('user_inactive','B');
            logReason("user_inactive");
            return null;
          }

          const isPasswordValid = await user.comparePassword(password);
          if (!isPasswordValid) {
            dbg('invalid_password','B',{iterations:user.passwordIterations});
            logReason("invalid_password");
            return null;
          }

          const role = resolveUserRole(user);
          if (user.role !== role) {
            user.role = role;
            await user.save();
          }

          dbg('login_success','B',{userId:String(user._id)});
          return {
            id: String(user._id),
            name: user.name,
            email: user.email,
            role,
            sessionVersion: Number(user.sessionVersion || 1),
            languagePreference: user.languagePreference || "zh",
            isVerified: Boolean(user.isVerified),
          } as any;
        } catch (err) {
          // #region agent log
          fetch('http://127.0.0.1:7408/ingest/168f9695-c59e-49d7-a32e-0ca3a9e2f0a4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a9f6fa'},body:JSON.stringify({sessionId:'a9f6fa',location:'auth.ts:authorize',message:'internal_error',data:{hypothesisId:'B',error:String(err)},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          console.error("[auth][authorize] Unexpected error:", err);
          logReason("internal_error");
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as any).role;
        token.sessionVersion = (user as any).sessionVersion;
        token.languagePreference = (user as any).languagePreference;
        token.isVerified = (user as any).isVerified;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.role = (token.role as "user" | "admin" | undefined) || "user";
        session.user.sessionVersion = Number(token.sessionVersion || 1);
        session.user.languagePreference =
          (token.languagePreference as "zh" | "en" | undefined) || "zh";
        session.user.isVerified = Boolean(token.isVerified);
      }

      return session;
    },
  },
});

