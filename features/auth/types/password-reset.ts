export type RequestPasswordResetOtpInput = {
  email: string
}

export type RequestPasswordResetOtpResponse = {
  message: string
  challengeId: string
  maskedEmail: string
  expiresInSeconds: number
  developmentOtp?: string
}

export type VerifyPasswordResetOtpInput = {
  email: string
  challengeId: string
  otp: string
}

export type VerifyPasswordResetOtpResponse = {
  message: string
  resetToken: string
}

export type ResetPasswordInput = {
  resetToken: string
  password: string
  confirmPassword: string
}

export type ResetPasswordResponse = {
  message: string
}
