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
  Upload,
  Settings,
  CalendarRange,
  Tag,
  Table,
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
      { label: "Import", icon: Upload, href: "/admin/import" },
      { label: "Events", icon: CalendarRange, href: "/admin/events" },
      { label: "Saved Groups", icon: Tag, href: "/admin/saved-groups" },
      { label: "Settings", icon: Settings, href: "/admin/settings" },
    ],
  },
  faculty: {
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/faculty/dashboard" },
      { label: "Timetable", icon: Table, href: "/faculty/timetable" },
      { label: "History", icon: Clock, href: "/faculty/history" },
    ],
  },
  hod: {
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/hod" },
      { label: "Timetable", icon: Table, href: "/hod/timetable" },
      { label: "Faculty", icon: Users, href: "/hod/faculty" },
      { label: "Sessions", icon: CalendarCheck, href: "/hod/sessions" },
      { label: "Reports", icon: BarChart3, href: "/hod/reports" },
    ],
  },
  student: {
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/student" },
      { label: "Timetable", icon: Table, href: "/student/timetable" },
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
  const RoleIcon = role === "admin" ? Shield : role === "hod" ? Users : role === "student" ? GraduationCap : ClipboardList

  return (
    <aside
      id="sidebar"
      className={cn(
        "flex h-full flex-col bg-[#141517] border-r border-border transition-[width] duration-200 ease-in-out z-40",
        "fixed inset-y-0 left-0",
        "lg:static lg:translate-x-0",
        isCollapsed ? "lg:w-16" : "lg:w-64",
        isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center px-4",
          isCollapsed && "lg:justify-center lg:px-0"
        )}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-3 text-lg font-semibold text-white">
            <RoleIcon className="h-5 w-5 text-primary" />
            <span className="tracking-tight">Register</span>
          </div>
        )}
        <button
          onClick={() => onClose?.()}
          className="ml-auto text-muted hover:text-white transition-colors lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className={cn(
            "text-muted hover:text-white transition-colors",
            "hidden lg:block",
            isCollapsed ? "mx-auto" : "ml-auto"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav aria-label="Sidebar" className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
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
                "flex items-center gap-3 rounded px-2.5 py-2 text-[13px] font-medium transition-colors group",
                isActive
                  ? "bg-surface text-white"
                  : "text-muted hover:bg-surface/50 hover:text-white"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 shrink-0", 
                isActive ? "text-primary" : "text-muted group-hover:text-white"
              )} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
