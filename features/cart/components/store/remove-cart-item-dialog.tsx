"use client"

import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"

type RemoveCartItemDialogProps = {
  open: boolean
  productName: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export default function RemoveCartItemDialog({
  open,
  productName,
  onOpenChange,
  onConfirm,
}: RemoveCartItemDialogProps) {
  function handleConfirm() {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-2rem)] max-w-sm rounded-xl border-0 p-5 shadow-2xl"
      >
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#FEE4E2] p-4 text-[#F04438]">
          <AlertTriangle className="size-8 text-[#D92D20]" />
        </div>

        <DialogTitle className="font-geist mt-3 text-center text-[18px]/[28px] font-semibold tracking-normal text-[#181D27]">
          Remove Item from Cart
        </DialogTitle>

        <DialogDescription className="font-geist text-center text-[14px] leading-5 font-normal text-[#535862]">
          Are you sure you want to remove{" "}
          <span className="font-semibold">{productName}</span> from your cart?
        </DialogDescription>

        <div className="mt-3 grid gap-2">
          <Button
            type="button"
            onClick={handleConfirm}
            className="h-10 rounded-xl bg-[#D92D20] text-[14px] leading-5 font-semibold text-white hover:bg-[#B42318]"
          >
            Remove Item
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 cursor-pointer rounded-xl text-[14px] leading-5"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
