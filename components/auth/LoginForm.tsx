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

  async function handleQuickLogin(testEmail: string, testPassword: string) {
    setEmail(testEmail)
    setPassword(testPassword)
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email: testEmail,
        password: testPassword,
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

      {/* Quick Login Shortcuts for Testing & Faculty Presentation */}
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-[11px] font-medium text-muted uppercase tracking-wider mb-3 text-center">
          Quick Demo Sign-In
        </p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            className="text-xs"
            disabled={loading}
            onClick={() => handleQuickLogin("admin@college.edu", "password123")}
          >
            Admin
          </Button>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            className="text-xs"
            disabled={loading}
            onClick={() => handleQuickLogin("hod@college.edu", "password123")}
          >
            HOD
          </Button>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            className="text-xs"
            disabled={loading}
            onClick={() => handleQuickLogin("240410107093@student.college.edu", "ce4093")}
          >
            Student (Nishit)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            className="text-xs"
            disabled={loading}
            onClick={() => handleQuickLogin("byp@faculty.college.edu", "bypce")}
          >
            Faculty (BYP)
          </Button>
        </div>

        {/* Faculty Select Dropdown */}
        <div className="mt-3">
          <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1 text-center">
            Sign In as Specific Faculty
          </label>
          <select
            className="w-full bg-bg border border-border rounded px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-primary"
            disabled={loading}
            onChange={(e) => {
              if (e.target.value) {
                const [email, pwd] = e.target.value.split("|");
                handleQuickLogin(email, pwd);
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>-- Select Faculty --</option>
            <option value="byp@faculty.college.edu|bypce">Dr. Brijesh Panchal (BYP) — bypce</option>
            <option value="nrs@faculty.college.edu|nrsce">Dr. Neha Soni (NRS) — nrsce</option>
            <option value="jbs@faculty.college.edu|jbsce">Prof. Jayna Shah (JBS) — jbsce</option>
            <option value="hvc@faculty.college.edu|hvce">Prof. Hetal Chauhan (HVC) — hvce</option>
            <option value="djp@faculty.college.edu|djpce">Prof. Divya Parmar (DJP) — djpce</option>
            <option value="mpp@faculty.college.edu|mppce">Dr. Minal Patel (MPP) — mppce</option>
            <option value="pjd@faculty.college.edu|pjdce">Prof. Prexa Desai (PJD) — pjdce</option>
            <option value="mhs@faculty.college.edu|mhsce">Prof. Milind Shah (MHS) — mhsce</option>
            <option value="amp@faculty.college.edu|ampce">Prof. Abhishek Patel (AMP) — ampce</option>
            <option value="smp@faculty.college.edu|smpce">Dr. Shrina Patel (SMP) — smpce</option>
            <option value="mcj@faculty.college.edu|mcjce">Prof. Mital Joshi (MCJ) — mcjce</option>
            <option value="nsv@faculty.college.edu|nsvce">Prof. Nisha Velani (NSV) — nsvce</option>
            <option value="pvb@faculty.college.edu|pvbce">Prof. Parul Bakaraniya (PVB) — pvbce</option>
            <option value="nbs@faculty.college.edu|nbsce">Prof. Nidhi Shah (NBS) — nbsce</option>
            <option value="knu@faculty.college.edu|knuce">Prof. Keyur Upadhyay (KNU) — knuce</option>
            <option value="sdb@faculty.college.edu|sdbce">Prof. Swati Bopaliya (SDB) — sdbce</option>
            <option value="kss@faculty.college.edu|kssce">Prof. Keyur Suthar (KSS) — kssce</option>
          </select>
        </div>
      </div>
    </div>
  )
}
