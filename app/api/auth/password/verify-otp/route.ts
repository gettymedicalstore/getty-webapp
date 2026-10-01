import { NextResponse } from "next/server"

import { verifyPasswordResetOtpSchema } from "@/features/auth/schemas/password-reset-schema"
import { verifyPasswordResetChallenge } from "@/features/auth/server/password-reset-repository"
import { createPasswordResetToken } from "@/lib/auth/reset-token"

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json()

    const validation = verifyPasswordResetOtpSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          message:
            validation.error.issues[0]?.message ??
            "The verification request is invalid.",
        },
        {
          status: 400,
        }
      )
    }

    const result = verifyPasswordResetChallenge(validation.data)

    if (!result.success) {
      return NextResponse.json(
        {
          message: result.message,
          remainingAttempts:
            "remainingAttempts" in result
              ? result.remainingAttempts
              : undefined,
        },
        {
          status: 400,
        }
      )
    }

    const resetToken = createPasswordResetToken({
      userId: result.challenge.userId,
      email: result.challenge.email,
      challengeId: result.challenge.id,
    })

    return NextResponse.json({
      message: "Verification code confirmed.",
      resetToken,
    })
  } catch (error) {
    console.error("Password OTP verification error:", error)

    return NextResponse.json(
      {
        message: "The verification code could not be confirmed.",
      },
      {
        status: 500,
      }
    )
  }
}
