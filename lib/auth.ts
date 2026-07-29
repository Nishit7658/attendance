import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { authConfig } from "./auth.config"

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const rawInput = (credentials.email as string).trim()

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: rawInput },
              { enrollmentNo: rawInput },
              { email: `${rawInput}@student` },
              { email: `${rawInput}@student.college.edu` },
              { email: `${rawInput}.college.edu` },
              { email: rawInput.includes("@") ? rawInput : `${rawInput}@faculty` },
            ],
          },
        })

        if (!user || !user.passwordHash) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
})
