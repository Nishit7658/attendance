"use client"

import { useState } from "react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { usePathname } from "next/navigation"

type Role = "faculty" | "hod" | "admin" | "student"

interface AppShellProps {
  children: React.ReactNode
  role: Role
}

export default function AppShell({ children, role }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="relative flex min-h-screen bg-bg overflow-hidden text-ink font-sans" data-main-content>
      {/* 
        Instant render container. 
        Removed all Framer Motion staggered animations for a snappy Pro Tool feel.
      */}
      <div className="relative z-10 flex flex-1 h-screen min-w-0">
        <Sidebar 
          role={role} 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
        
        <div className="flex flex-1 flex-col min-w-0 bg-bg">
          <Topbar 
            onMenuClick={() => setSidebarOpen(true)} 
            sidebarOpen={sidebarOpen} 
            className="z-40"
          />
          
          <main 
            id="main-content" 
            className="flex-1 overflow-auto p-4 md:p-6 lg:p-8"
          >
            <div className="mx-auto max-w-7xl h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
