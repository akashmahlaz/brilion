import Google from "@auth/core/providers/google";
import GitHub from "@auth/core/providers/github";
import LinkedIn from "@auth/core/providers/linkedin";
import MicrosoftEntraId from "@auth/core/providers/microsoft-entra-id";
import Credentials from "@auth/core/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { compare } from "bcryptjs";
import type { StartAuthJSConfig } from "start-authjs";
import { clientPromise } from "./db";
import { User } from "./models/user";
import { Account } from "./models/account";

export const authConfig: StartAuthJSConfig = {
  secret: process.env.AUTH_SECRET,
  adapter: MongoDBAdapter(clientPromise as any),
  session: { strategy: "jwt" as const },
  debug: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
    MicrosoftEntraId({
      clientId: process.env.MICROSOFT_ENTRA_ID_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET!,
      tenantId: process.env.MICROSOFT_ENTRA_ID_TENANT_ID!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const account = await Account.findOne({
          providerId: "credentials",
          userId: { $exists: true },
        }).populate("userId");

        if (!account) return null;

        // Find user by email, then verify password from account
        const user = await User.findOne({ email });
        if (!user) return null;

        const acct = await Account.findOne({
          providerId: "credentials",
          userId: user._id,
        });
        if (!acct?.password) return null;

        const valid = await compare(password, acct.password);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allow redirects to the same origin
      if (url.startsWith(baseUrl)) return url;
      // Allow relative URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allow frontend URL
      const frontendUrl = process.env.FRONTEND_URL;
      if (frontendUrl && url.startsWith(frontendUrl)) return url;
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Fetch full user data from DB
        const dbUser = await User.findById(user.id).lean();
        if (dbUser) {
          token.plan = (dbUser as any).plan;
          token.onboardingCompleted = (dbUser as any).onboardingCompleted;
          token.onboardingStep = (dbUser as any).onboardingStep;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).plan = token.plan;
        (session.user as any).onboardingCompleted = token.onboardingCompleted;
        (session.user as any).onboardingStep = token.onboardingStep;
      }
      return session;
    },
  },
  trustHost: true,
};
