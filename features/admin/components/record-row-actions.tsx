"use client"

import { useRef } from "react"
import { Menu } from "@base-ui/react/menu"
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

const itemClass =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm outline-none data-highlighted:bg-[#f0f5f2] data-highlighted:text-[#1b4d3e]"

export default function RecordRowActions({
  kind,
  name,
  disabled,
  dialogOpen,
  onPrimary,
  onDelete,
}: {
  kind: "product" | "tax"
  name: string
  disabled: boolean
  dialogOpen: boolean
  onPrimary: () => void
  onDelete: (trigger: HTMLButtonElement | null) => void
}) {
  const trigger = useRef<HTMLButtonElement>(null)

  return (
    <Menu.Root>
      <Menu.Trigger
        ref={trigger}
        aria-label={`Actions for ${name}`}
        disabled={disabled}
        className="mx-auto grid size-11 place-items-center rounded-lg border border-transparent text-[#65776a] transition outline-none hover:border-[#dfe7e1] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#1b5442] data-popup-open:border-[#dfe7e1] data-popup-open:bg-white"
      >
        <MoreHorizontal aria-hidden className="size-5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-50">
          <Menu.Popup
            finalFocus={!dialogOpen}
            className="w-52 origin-(--transform-origin) rounded-xl border border-[#e2e8e3] bg-white p-1.5 text-[#374d3e] shadow-[0_8px_32px_rgba(25,50,35,0.12)] outline-none"
          >
            <Menu.Item className={itemClass} onClick={onPrimary}>
              {kind === "product" ? (
                <Eye aria-hidden className="size-4" />
              ) : (
                <Pencil aria-hidden className="size-4" />
              )}
              {kind === "product" ? "Manage product" : "Edit tax"}
            </Menu.Item>
            <Menu.Separator className="my-1 h-px bg-[#e8ede9]" />
            <Menu.Item
              className={cn(
                itemClass,
                "text-[#b04436] data-highlighted:bg-[#fff3f1] data-highlighted:text-[#9f3326]"
              )}
              onClick={() => onDelete(trigger.current)}
            >
              <Trash2 aria-hidden className="size-4" />
              Delete {kind}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
