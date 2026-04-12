'use client'

import { Sidebar } from './Sidebar'
import { DashboardTopbar } from './DashboardTopbar'
import { MobileNav } from './MobileNav'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-surface-2 overflow-hidden">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 md:ml-[228px] min-w-0 h-screen">
        <DashboardTopbar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileNav />
    </div>
  )
}
