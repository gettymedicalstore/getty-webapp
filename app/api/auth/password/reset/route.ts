import { NextResponse } from "next/server"

import { resetPasswordSchema } from "@/features/auth/schemas/password-reset-schema"
import {
  findMockUserById,
  updateMockUserPassword,
} from "@/features/auth/server/mock-user-repository"
import { consumePasswordResetChallenge } from "@/features/auth/server/password-reset-repository"
import { MOCK_SESSION_COOKIE } from "@/features/auth/server/mock-session"
import { hashPassword } from "@/lib/auth/password"
import { verifyPasswordResetToken } from "@/lib/auth/reset-token"

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json()

    const validation = resetPasswordSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          message:
            validation.error.issues[0]?.message ??
            "The new password is invalid.",
        },
        {
          status: 400,
        }
      )
    }

    const tokenPayload = verifyPasswordResetToken(validation.data.resetToken)

    if (!tokenPayload) {
      return NextResponse.json(
        {
          message: "Your password reset token is invalid or has expired.",
        },
        {
          status: 400,
        }
      )
    }

    const challengeResult = consumePasswordResetChallenge({
      challengeId: tokenPayload.challengeId,
      userId: tokenPayload.userId,
      email: tokenPayload.email,
    })

    if (!challengeResult.success) {
      return NextResponse.json(
        {
          message: challengeResult.message,
        },
        {
          status: 400,
        }
      )
    }

    const user = await findMockUserById(tokenPayload.userId)

    if (!user || user.email.trim().toLowerCase() !== tokenPayload.email) {
      return NextResponse.json(
        {
          message:
            "The account associated with this reset token could not be found.",
        },
        {
          status: 404,
        }
      )
    }

    const passwordHash = await hashPassword(validation.data.password)

    const updatedUser = await updateMockUserPassword({
      userId: user.id,
      passwordHash,
    })

    if (!updatedUser) {
      return NextResponse.json(
        {
          message: "The password could not be updated.",
        },
        {
          status: 500,
        }
      )
    }

    const response = NextResponse.json({
      message: "Your password has been reset successfully.",
    })

    /*
     * Force the user to log in again using the new password.
     */
    response.cookies.delete(MOCK_SESSION_COOKIE)

    return response
  } catch (error) {
    console.error("Password reset error:", error)

    return NextResponse.json(
      {
        message: "Your password could not be reset. Please try again.",
      },
      {
        status: 500,
      }
    )
  }
}
