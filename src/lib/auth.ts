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

        const email = String(credentials.email).trim().toLowerCase();
        if (isRateLimited(`login:${email}`, 10, 15 * 60_000)) {
          throw new Error("Too many login attempts. Please wait 15 minutes.");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(String(credentials.password), user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: { params: { scope: "openid email profile" } },
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id ?? token.sub ?? "";
        token.role = (user as { role?: string }).role ?? "MEMBER";
      }
      if (!token.id && token.sub) token.id = token.sub;

      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpiresAt = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3600 * 1000;
      }

      // Never trust organizationId or orgRole supplied through client session.update().
      // Resolve membership from the database so removed members and changed roles
      // do not retain stale authorization claims in their JWT.
      if (token.id) {
        try {
          const [member, currentUser] = await Promise.all([
            prisma.organizationMember.findFirst({
              where: { userId: String(token.id) },
              orderBy: { joinedAt: "asc" },
              select: { organizationId: true, role: true },
            }),
            prisma.user.findUnique({
              where: { id: String(token.id) },
              select: { role: true },
            }),
          ]);
          token.organizationId = member?.organizationId ?? null;
          token.orgRole = member?.role ?? null;
          if (currentUser) token.role = currentUser.role;
        } catch {
          // Fail closed for workspace authorization if membership cannot be verified.
          token.organizationId = null;
          token.orgRole = null;
        }
      }

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
              client_id: process.env.GOOGLE_CLIENT_ID ?? "",
              client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
              grant_type: "refresh_token",
              refresh_token: token.refreshToken as string,
            }),
          });
          if (resp.ok) {
            const refreshed = await resp.json();
            token.accessToken = refreshed.access_token;
            token.accessTokenExpiresAt = Date.now() + (refreshed.expires_in ?? 3600) * 1000;
          }
        } catch {
          // Keep the previous token; integration actions must handle stale credentials.
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id ?? token.sub) as string;
        session.user.role = token.role as string;
        session.user.accessToken = token.accessToken as string | undefined;
        session.user.organizationId = token.organizationId as string | null | undefined;
        session.user.orgRole = token.orgRole as string | null | undefined;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
});
