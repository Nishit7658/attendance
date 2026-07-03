"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarCheck,
  BarChart3,
  Users,
  GraduationCap,
  Shield,
  ClipboardList,
  QrCode,
  BookOpen,
  Clock,
  ChevronLeft,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Role = "faculty" | "hod" | "admin" | "student"

interface NavItem {
  label: string
  icon: typeof LayoutDashboard
  href: string
}

const navConfig: Record<Role, { items: NavItem[] }> = {
  admin: {
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
      { label: "Courses", icon: BookOpen, href: "/admin/courses" },
      { label: "Timetables", icon: Clock, href: "/admin/timetables" },
      { label: "Users", icon: Users, href: "/admin/users" },
      { label: "Reports", icon: BarChart3, href: "/admin/reports" },
    ],
  },
  faculty: {
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/faculty/dashboard" },
      { label: "History", icon: Clock, href: "/faculty/history" },
    ],
  },
  hod: {
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/hod" },
      { label: "Faculty", icon: Users, href: "/hod/faculty" },
      { label: "Sessions", icon: CalendarCheck, href: "/hod/sessions" },
      { label: "Reports", icon: BarChart3, href: "/hod/reports" },
    ],
  },
  student: {
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/student" },
      { label: "Scan QR", icon: QrCode, href: "/student/scan" },
    ],
  },
}

export interface SidebarProps {
  role: Role
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ role, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const navItems = navConfig[role]?.items ?? []

  const RoleIcon =
    role === "admin" ? Shield : role === "hod" ? Users : role === "student" ? GraduationCap : ClipboardList

  return (
    <aside
      id="sidebar"
      className={cn(
        "flex h-full flex-col bg-white border-r border-slate-200 transition-transform duration-200 ease-in-out",
        "fixed inset-y-0 left-0 z-40",
        "lg:static lg:z-auto lg:transition-none lg:translate-x-0",
        isCollapsed ? "lg:w-16" : "lg:w-64",
        isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-slate-200 px-4",
          isCollapsed ? "lg:justify-center lg:px-0" : "lg:px-4"
        )}
      >
        {(!isCollapsed) && (
          <span className="flex items-center gap-2 text-lg font-semibold text-navy-800">
            <RoleIcon className="h-5 w-5 text-navy-700" />
            <span className="truncate">Attendance</span>
          </span>
        )}
        <button
          onClick={() => onClose?.()}
          className="ml-auto text-slate-400 hover:text-slate-700 transition-colors lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className={cn(
            "text-slate-400 hover:text-slate-700 transition-colors",
            "hidden lg:block",
            isCollapsed ? "mx-auto" : "ml-auto"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      <nav aria-label="Sidebar" className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onClose?.()}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-navy-50 text-navy-900 font-semibold"
                  : "text-slate-600 hover:bg-slate-200"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {(!isCollapsed) && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
