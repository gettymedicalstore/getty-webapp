import { NextResponse } from "next/server"

import { requestPasswordResetOtpSchema } from "@/features/auth/schemas/password-reset-schema"
import { findMockUserByEmail } from "@/features/auth/server/mock-user-repository"
import {
  createPasswordResetChallenge,
  createPublicChallengeId,
} from "@/features/auth/server/password-reset-repository"

const GENERIC_MESSAGE =
  "If an account exists for this email, a verification code has been sent."

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json()

    const validation = requestPasswordResetOtpSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          message:
            validation.error.issues[0]?.message ??
            "Enter a valid email address.",
        },
        {
          status: 400,
        }
      )
    }

    const email = validation.data.email
    const user = await findMockUserByEmail(email)

    /*
     * A production system should return the same message whether or not
     * the account exists to reduce email-account enumeration.
     */
    if (!user || !user.active) {
      await artificialDelay()

      return NextResponse.json({
        message: GENERIC_MESSAGE,
        challengeId: crypto.randomUUID(),
        maskedEmail: maskEmail(email),
        expiresInSeconds: 600,
      })
    }

    const { challenge, otp, expiresInSeconds } = createPasswordResetChallenge({
      userId: user.id,
      email: user.email,
    })

    /*
     * Replace this terminal log with your email provider.
     */
    console.info("")
    console.info("====================================")
    console.info("GETTY PASSWORD RESET OTP")
    console.info(`Email: ${user.email}`)
    console.info(`OTP: ${otp}`)
    console.info("Expires in 10 minutes")
    console.info("====================================")
    console.info("")

    return NextResponse.json({
      message: GENERIC_MESSAGE,
      challengeId: createPublicChallengeId(challenge.id),
      maskedEmail: maskEmail(user.email),
      expiresInSeconds,

      ...(process.env.NODE_ENV === "development"
        ? {
            developmentOtp: otp,
          }
        : {}),
    })
  } catch (error) {
    console.error("Password OTP request error:", error)

    return NextResponse.json(
      {
        message: "The verification code could not be sent. Please try again.",
      },
      {
        status: 500,
      }
    )
  }
}

function maskEmail(email: string) {
  const [localPart, domain] = email.trim().toLowerCase().split("@")

  if (!localPart || !domain) {
    return email
  }

  if (localPart.length <= 2) {
    return `${localPart.slice(0, 1)}***@${domain}`
  }

  return `${localPart.slice(0, 2)}***@${domain}`
}

async function artificialDelay() {
  await new Promise((resolve) => {
    setTimeout(resolve, 350)
  })
}
