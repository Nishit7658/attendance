"use client"

import { useState, useRef, useEffect } from "react"
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

  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "System Update",
      message: "The new attendance system is now live and running smoothly.",
      time: "2 hours ago",
      isRead: false
    },
    {
      id: 2,
      title: "Weekly Report Ready",
      message: "Your attendance summary for the week is generated.",
      time: "1 day ago",
      isRead: false
    }
  ])

  const hasUnread = notifications.some((n) => !n.isRead)

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const markAsRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header
      role="banner"
      aria-label="Top bar"
      className={cn(
        "flex h-14 items-center gap-4 bg-[#0f172a] px-4 lg:px-6 sticky top-0 z-20 border-b border-border shadow-sm",
        className
      )}
    >
      <button
        onClick={onMenuClick}
        className="text-muted hover:text-white transition-colors lg:hidden"
        aria-label="Open menu"
        aria-controls="sidebar"
        aria-expanded={sidebarOpen}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1 flex items-center">
        {/* Placeholder for Search - typical in Pro Tools */}
        <div className="hidden md:flex items-center bg-black/20 border border-white/10 rounded px-3 py-1.5 w-64">
          <span className="text-xs text-muted">Search...</span>
        </div>
      </div>

      <div className="relative" ref={notificationRef}>
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className={cn(
            "relative p-2 text-muted hover:text-white transition-colors rounded hover:bg-white/5",
            showNotifications && "bg-white/5 text-white"
          )}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {hasUnread && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-success border border-[#0f172a]" />
          )}
        </button>

        {showNotifications && (
          <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-surface shadow-lg z-50 overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between border-b border-border bg-surface p-3">
              <h3 className="text-sm font-semibold text-ink">Notifications</h3>
              {hasUnread && (
                <button onClick={markAllRead} className="text-[11px] font-medium text-primary hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="flex flex-col max-h-[320px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted">No notifications</div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={cn(
                      "p-3 border-b border-border/50 hover:bg-surface-hover cursor-pointer transition-colors relative",
                      !notif.isRead && "bg-primary/5"
                    )}
                  >
                    {!notif.isRead && (
                      <span className="absolute left-2 top-4 h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                    <div className={cn("pl-3", !notif.isRead ? "" : "pl-1")}>
                      <p className={cn("text-sm font-medium", notif.isRead ? "text-muted" : "text-ink")}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">{notif.message}</p>
                      <p className="text-[10px] text-muted mt-1.5">{notif.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {userRole && (
        <span className="rounded bg-primary/20 px-2 py-0.5 text-[11px] font-bold tracking-wide text-primary uppercase">
          {userRole}
        </span>
      )}

      <div className="flex items-center gap-2 pl-3 border-l border-white/10 ml-1">
        <button
          className="flex items-center gap-2 group rounded hover:bg-white/5 p-1 transition-colors"
          aria-label="User menu"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/20 text-primary">
            <User className="h-4 w-4" />
          </div>
          <span className="hidden text-sm font-medium text-ink sm:block group-hover:text-white">
            {userName}
          </span>
        </button>

        <button
          onClick={() => signOut()}
          className="flex items-center justify-center p-1.5 rounded text-muted hover:bg-error/10 hover:text-error transition-colors"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
