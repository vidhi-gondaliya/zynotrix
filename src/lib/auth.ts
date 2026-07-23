import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { isRateLimited } from "./rate-limit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // 10 failed attempts per email per 15 minutes
        if (isRateLimited(`login:${(credentials.email as string).toLowerCase()}`, 10, 15 * 60_000)) {
          throw new Error("Too many login attempts. Please wait 15 minutes.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                scope:
                  "openid email profile https://www.googleapis.com/auth/calendar.events",
              },
            },
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, account, trigger, session: sessionData }) {
      // Always ensure token.id is set (token.sub is the built-in NextAuth user id)
      if (!token.id && token.sub) token.id = token.sub;

      if (user) {
        token.id   = user.id ?? token.sub ?? "";
        token.role = (user as { role?: string }).role ?? "MEMBER";
        // Look up org membership on initial sign-in
        try {
          const member = await prisma.organizationMember.findFirst({
            where: { userId: user.id ?? "" },
            select: { organizationId: true, role: true },
          });
          token.organizationId = member?.organizationId ?? null;
          token.orgRole        = member?.role ?? null;
        } catch {
          token.organizationId = null;
          token.orgRole        = null;
        }
      }
      if (account?.access_token) {
        token.accessToken  = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpiresAt = account.expires_at
          ? account.expires_at * 1000          // convert seconds → ms
          : Date.now() + 3600 * 1000;          // default 1 hour
      }

      // Refresh Google access token when it has expired
      if (
        token.refreshToken &&
        token.accessTokenExpiresAt &&
        Date.now() > (token.accessTokenExpiresAt as number)
      ) {
        try {
          const resp = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id:     process.env.GOOGLE_CLIENT_ID ?? "",
              client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
              grant_type:    "refresh_token",
              refresh_token: token.refreshToken as string,
            }),
          });
          if (resp.ok) {
            const refreshed = await resp.json();
            token.accessToken = refreshed.access_token;
            token.accessTokenExpiresAt = Date.now() + (refreshed.expires_in ?? 3600) * 1000;
          }
        } catch {
          // If refresh fails, token remains stale — Google Meet links will regenerate on next sign-in
        }
      }
      // Allow frontend to update org in session after workspace creation
      if (trigger === "update" && sessionData) {
        if (sessionData.organizationId !== undefined) token.organizationId = sessionData.organizationId;
        if (sessionData.orgRole !== undefined)        token.orgRole        = sessionData.orgRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // token.id set by our jwt callback; token.sub is NextAuth's built-in fallback
        session.user.id             = (token.id ?? token.sub) as string;
        session.user.role           = token.role as string;
        session.user.accessToken    = token.accessToken as string | undefined;
        session.user.organizationId = token.organizationId as string | null | undefined;
        session.user.orgRole        = token.orgRole as string | null | undefined;
      }
      return session;
    },
  },
  // Support both NEXTAUTH_SECRET (legacy) and AUTH_SECRET (Auth.js v5 default)
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
});
