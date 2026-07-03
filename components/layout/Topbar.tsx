"use client"

import { useSession, signOut } from "next-auth/react"
import { Bell, LogOut, Menu, User } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TopbarProps {
  onMenuClick?: () => void
  sidebarOpen?: boolean
  className?: string
}

export function Topbar({ onMenuClick, sidebarOpen, className }: TopbarProps) {
  const { data: session } = useSession()
  const userName = session?.user?.name || "User"
  const userRole = session?.user?.role || ""

  return (
    <header
      role="banner"
      aria-label="Top bar"
      className={cn(
        "flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 lg:px-6",
        className
      )}
    >
      <button
        onClick={onMenuClick}
        className="text-slate-400 hover:text-slate-700 transition-colors lg:hidden"
        aria-label="Open menu"
        aria-controls="sidebar"
        aria-expanded={sidebarOpen}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <button
        className="relative text-slate-400 hover:text-slate-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
      </button>

      {userRole && (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 capitalize">
          {userRole}
        </span>
      )}

      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-2"
          aria-label="User menu"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <User className="h-4 w-4" />
          </div>
          <span className="hidden text-sm font-medium text-slate-900 sm:block">
            {userName}
          </span>
        </button>
      </div>

      <button
        onClick={() => signOut()}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors"
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Log out</span>
      </button>
    </header>
  )
}
