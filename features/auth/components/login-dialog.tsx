"use client"

import { X } from "lucide-react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"

import LoginForm from "./login-form"

type LoginDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void | Promise<void>
}

export default function LoginDialog({
  open,
  onOpenChange,
  onSuccess,
}: LoginDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-2rem)] max-w-none overflow-visible rounded-xl border border-[#E9EAEB] bg-white p-0 shadow-none sm:w-134 sm:max-w-none"
      >
        <DialogTitle className="sr-only">Login to your account</DialogTitle>

        <div className="absolute top-12 right-0 sm:top-0 sm:-right-20">
          <DialogClose
            render={
              <button
                type="button"
                aria-label="Close login dialog"
                className="z-100 flex size-12 cursor-pointer items-center justify-center rounded-full bg-[#A4A7AE] p-3 text-[#414651] focus-visible:ring-offset-transparent focus-visible:outline-none"
              />
            }
          >
            <X
              aria-hidden="true"
              className="size-6 text-white"
              strokeWidth={2}
            />
          </DialogClose>
        </div>

        <DialogDescription className="sr-only">
          Enter your email address and password to continue.
        </DialogDescription>

        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl">
          <LoginForm onSuccess={onSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
