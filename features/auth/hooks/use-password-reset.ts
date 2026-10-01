"use client"

import { useMutation } from "@tanstack/react-query"

import type {
  RequestPasswordResetOtpInput,
  RequestPasswordResetOtpResponse,
  ResetPasswordInput,
  ResetPasswordResponse,
  VerifyPasswordResetOtpInput,
  VerifyPasswordResetOtpResponse,
} from "../types/password-reset"

async function postJson<TResponse>(
  url: string,
  payload: unknown
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const result = (await response.json()) as TResponse & {
    message?: string
  }

  if (!response.ok) {
    throw new Error(result.message ?? "The request could not be completed.")
  }

  return result
}

export function useRequestPasswordResetOtp() {
  return useMutation<
    RequestPasswordResetOtpResponse,
    Error,
    RequestPasswordResetOtpInput
  >({
    mutationFn: (payload) =>
      postJson<RequestPasswordResetOtpResponse>(
        "/api/auth/password/request-otp",
        payload
      ),
  })
}

export function useVerifyPasswordResetOtp() {
  return useMutation<
    VerifyPasswordResetOtpResponse,
    Error,
    VerifyPasswordResetOtpInput
  >({
    mutationFn: (payload) =>
      postJson<VerifyPasswordResetOtpResponse>(
        "/api/auth/password/verify-otp",
        payload
      ),
  })
}

export function useResetPassword() {
  return useMutation<ResetPasswordResponse, Error, ResetPasswordInput>({
    mutationFn: (payload) =>
      postJson<ResetPasswordResponse>("/api/auth/password/reset", payload),
  })
}
