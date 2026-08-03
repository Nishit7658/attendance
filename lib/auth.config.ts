import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        if (user.id) token.id = user.id
        if (user.role) token.role = user.role
        if (user.needsPasswordChange !== undefined) token.needsPasswordChange = user.needsPasswordChange
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id || token.sub) as string
        session.user.role = token.role as string
        session.user.needsPasswordChange = token.needsPasswordChange as boolean
      }
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
