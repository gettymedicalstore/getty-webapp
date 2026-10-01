"use client"

import { X } from "lucide-react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"

import ForgotPasswordFlow from "./reset-password/forgot-password-flow"
import LoginForm from "./login-form"
import type { AuthDialogView } from "./auth-dialog-provider"

type AuthDialogProps = {
  open: boolean
  view: AuthDialogView
  onOpenChange: (open: boolean) => void
  onLoginSuccess: () => void | Promise<void>
  onShowForgotPassword: () => void
  onShowLogin: () => void
}

export default function AuthDialog({
  open,
  view,
  onOpenChange,
  onLoginSuccess,
  onShowForgotPassword,
  onShowLogin,
}: AuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-2rem)] max-w-none overflow-visible rounded-xl border border-[#E9EAEB] bg-white p-0 shadow-none sm:w-134 sm:max-w-none"
      >
        <DialogTitle className="sr-only">
          {view === "login" ? "Login to your account" : "Reset your password"}
        </DialogTitle>

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
          {view === "login"
            ? "Enter your email and password to continue."
            : "Verify your email and set a new password."}
        </DialogDescription>
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl">
          {view === "login" ? (
            <LoginForm
              onSuccess={onLoginSuccess}
              onForgotPassword={onShowForgotPassword}
            />
          ) : (
            <ForgotPasswordFlow onBackToLogin={onShowLogin} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
