"use client"

import WorkspaceNavigation from "@/components/shared/workspace-navigation"

export default function AdminNavigation({
  onNavigate,
}: {
  onNavigate?: () => void
}) {
  return <WorkspaceNavigation role="admin" onNavigate={onNavigate} />
}
