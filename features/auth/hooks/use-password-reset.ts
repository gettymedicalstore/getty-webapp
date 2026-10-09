"use client"
import { useMutation } from "@tanstack/react-query"
import {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword,
} from "../api/password-reset"
import type {
  RequestPasswordResetOtpInput,
  RequestPasswordResetOtpResponse,
  VerifyPasswordResetOtpInput,
  VerifyPasswordResetOtpResponse,
  ResetPasswordInput,
  ResetPasswordResponse,
} from "../types/password-reset"
export function useRequestPasswordResetOtp() {
  return useMutation<
    RequestPasswordResetOtpResponse,
    Error,
    RequestPasswordResetOtpInput
  >({ mutationFn: requestPasswordResetOtp })
}
export function useVerifyPasswordResetOtp() {
  return useMutation<
    VerifyPasswordResetOtpResponse,
    Error,
    VerifyPasswordResetOtpInput
  >({ mutationFn: verifyPasswordResetOtp })
}
export function useResetPassword() {
  return useMutation<ResetPasswordResponse, Error, ResetPasswordInput>({
    mutationFn: resetPassword,
  })
}
