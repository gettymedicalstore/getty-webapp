import { NextResponse } from "next/server"

import {
  encodeMockSession,
  MOCK_SESSION_COOKIE,
  type MockUser,
} from "@/features/auth/server/mock-session"
import { findMockUserByEmail } from "@/features/auth/server/mock-user-repository"
import { verifyPassword } from "@/lib/auth/password"

type LoginRequest = {
  email?: unknown
  password?: unknown
  rememberMe?: unknown
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginRequest

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : ""

    const password = typeof body.password === "string" ? body.password : ""

    const rememberMe = body.rememberMe === true

    if (!email || !isValidEmail(email)) {
      return invalidCredentials()
    }

    if (!password) {
      return invalidCredentials()
    }

    const userRecord = await findMockUserByEmail(email)

    if (!userRecord || !userRecord.active) {
      return invalidCredentials()
    }

    const passwordMatches = await verifyPassword(
      password,
      userRecord.passwordHash
    )

    if (!passwordMatches) {
      return invalidCredentials()
    }

    const user: MockUser = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      phone: userRecord.phone,
      role: userRecord.role,
    }

    const response = NextResponse.json({
      message: "Login successful.",
      user,
    })

    response.cookies.set({
      name: MOCK_SESSION_COOKIE,
      value: encodeMockSession(user),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
    })

    return response
  } catch (error) {
    console.error("Login route error:", error)

    return NextResponse.json(
      {
        message: "Unable to complete the login request.",
      },
      {
        status: 500,
      }
    )
  }
}

function invalidCredentials() {
  return NextResponse.json(
    {
      message: "The email address or password is incorrect.",
    },
    {
      status: 401,
    }
  )
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
