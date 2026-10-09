"use client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import AdminNavigation from "../navigation/admin-navigation"
export default function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="top-0 left-0 flex h-dvh w-[85vw] max-w-sm translate-x-0 translate-y-0 flex-col overflow-y-auto rounded-none p-5 lg:hidden">
        <DialogHeader>
          <DialogTitle>Getty Medical</DialogTitle>
          <DialogDescription>Admin navigation</DialogDescription>
        </DialogHeader>
        <AdminNavigation onNavigate={onClose} />
      </DialogContent>
    </Dialog>
  )
}
