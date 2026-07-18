"use client"

import { useState, type FormEvent } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password: password.trim(),
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password. Please try again.")
        setLoading(false)
        return
      }

      router.push("/")
      router.refresh()
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  async function handleQuickLogin(testEmail: string) {
    setEmail(testEmail)
    setPassword("password123")
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email: testEmail,
        password: "password123",
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password. Please try again.")
        setLoading(false)
        return
      }

      router.push("/")
      router.refresh()
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="w-full bg-surface p-8 sm:p-10 rounded-lg border border-border shadow-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink mb-2">
          Welcome back
        </h1>
        <p className="text-[13px] text-muted">
          Access your professional attendance dashboard
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded bg-error/10 border border-error/20 text-error text-[13px] font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4">
          <Input
            label="College Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@college.edu"
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>
        <Button 
          type="submit" 
          disabled={loading} 
          loading={loading} 
          className="w-full py-2.5 mt-2 text-[13px]"
        >
          {loading ? "Authenticating..." : "Sign in"}
        </Button>
      </form>

      {/* Quick Login Shortcuts for Testing */}
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-[11px] font-medium text-muted uppercase tracking-wider mb-3 text-center">
          Quick Test Login
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="text-xs"
            disabled={loading}
            onClick={() => handleQuickLogin("admin@college.edu")}
          >
            Admin
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="text-xs"
            disabled={loading}
            onClick={() => handleQuickLogin("hod@college.edu")}
          >
            HOD
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="text-xs"
            disabled={loading}
            onClick={() => handleQuickLogin("byp@college.edu")}
          >
            Faculty
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="text-xs"
            disabled={loading}
            onClick={() => handleQuickLogin("student@college.edu")}
          >
            Student
          </Button>
        </div>
      </div>
    </div>
  )
}
