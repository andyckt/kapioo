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
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
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
          console.warn("Login rate limit exceeded", {
            login,
            ipAddress,
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

        if (!user || user.status !== "Active") {
          return null;
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
          return null;
        }

        const role = resolveUserRole(user);
        if (user.role !== role) {
          user.role = role;
          await user.save();
        }

        return {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role,
          sessionVersion: Number(user.sessionVersion || 1),
          languagePreference: user.languagePreference || "zh",
          isVerified: Boolean(user.isVerified),
        } as any;
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

