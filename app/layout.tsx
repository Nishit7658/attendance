import type { Metadata } from "next"
import "./globals.css"
import "@/styles/design-tokens.css"
import { SessionProvider } from "@/components/auth/SessionProvider"

export const metadata: Metadata = {
  title: "Attendance System",
  description: "College Attendance Management System",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white text-[var(--color-ink)] antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
