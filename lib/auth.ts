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
        const lowerInput = rawInput.toLowerCase()
        const cleanPrefix = lowerInput.replace(/@.*$/, "")

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: rawInput, mode: "insensitive" } },
              { email: { equals: lowerInput, mode: "insensitive" } },
              { email: { equals: `${cleanPrefix}@student`, mode: "insensitive" } },
              { email: { equals: `${cleanPrefix}@faculty`, mode: "insensitive" } },
              { email: { equals: `${cleanPrefix}@college.edu`, mode: "insensitive" } },
              { email: { equals: `${cleanPrefix}@student.college.edu`, mode: "insensitive" } },
              { email: { equals: `${cleanPrefix}@faculty.college.edu`, mode: "insensitive" } },
              { enrollmentNo: { equals: rawInput, mode: "insensitive" } },
              { enrollmentNo: { equals: cleanPrefix, mode: "insensitive" } },
            ],
          },
        })

        if (!user || !user.passwordHash) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValid) return null

        // Detect if they are using the default seeded password
        let needsPasswordChange = false
        const typedPassword = credentials.password as string
        
        if (user.role === "ADMIN" || user.role === "HOD") {
          if (typedPassword === "Admin@College2024!") needsPasswordChange = true
        } else if (user.role === "FACULTY") {
          if (typedPassword === `${cleanPrefix.toUpperCase()}@Faculty2024!`) needsPasswordChange = true
        } else if (user.role === "STUDENT") {
          const last4 = user.enrollmentNo ? user.enrollmentNo.slice(-4) : cleanPrefix.slice(-4)
          if (typedPassword === `Student@${last4}!`) needsPasswordChange = true
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          needsPasswordChange,
        }
      },
    }),
  ],
})
