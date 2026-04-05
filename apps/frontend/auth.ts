import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { env } from "@/lib/grind/config/env";
import { syncGoogleAccountToDatabase } from "@/lib/grind/repository/live-auth";

export const authOptions: NextAuthOptions = {
  secret: env.authSecret,
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: env.googleClientId ?? "",
      clientSecret: env.googleClientSecret ?? "",
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          response_type: "code",
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events",
          ].join(" "),
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (typeof profile?.email === "string") {
        token.email = profile.email;
      }

      if (account?.provider === "google" && typeof token.email === "string") {
        const appUser = await syncGoogleAccountToDatabase({
          email: token.email,
          fullName: typeof profile?.name === "string" ? profile.name : undefined,
          googleAccountId: account.providerAccountId,
          scope: account.scope,
          refreshToken: account.refresh_token,
        });

        token.userId = appUser.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.userId === "string" ? token.userId : "";
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
