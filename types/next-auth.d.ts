import { DefaultSession } from "next-auth"
import { JWT as DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      needsPasswordChange?: boolean
    } & DefaultSession["user"]
  }

  interface User {
    role: string
    needsPasswordChange?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    role: string
    needsPasswordChange?: boolean
  }
}
