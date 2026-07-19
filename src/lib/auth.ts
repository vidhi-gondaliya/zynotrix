import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

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
      if (user) {
        token.id   = user.id ?? "";
        token.role = (user as { role?: string }).role ?? "MEMBER";
        // Look up org membership on initial sign-in
        const member = await prisma.organizationMember.findFirst({
          where: { userId: user.id ?? "" },
          select: { organizationId: true, role: true },
        });
        token.organizationId = member?.organizationId ?? null;
        token.orgRole        = member?.role ?? null;
      }
      if (account?.access_token) {
        token.accessToken = account.access_token;
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
        session.user.id             = token.id as string;
        session.user.role           = token.role as string;
        session.user.accessToken    = token.accessToken as string | undefined;
        session.user.organizationId = token.organizationId as string | null | undefined;
        session.user.orgRole        = token.orgRole as string | null | undefined;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
