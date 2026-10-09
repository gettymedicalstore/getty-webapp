"use client"

import WorkspaceNavigation from "@/components/shared/workspace-navigation"

export default function CustomerNavigation({
  onNavigate,
}: {
  onNavigate?: () => void
}) {
  return <WorkspaceNavigation role="customer" onNavigate={onNavigate} />
}
