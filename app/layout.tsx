import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import "@/styles/design-tokens.css"
import { SessionProvider } from "@/components/auth/SessionProvider"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" })
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" })

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
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="bg-bg text-ink font-sans antialiased selection:bg-primary/20 selection:text-primary">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
