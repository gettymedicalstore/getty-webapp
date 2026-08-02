import { NextResponse } from "next/server"

import {
  encodeMockSession,
  MOCK_SESSION_COOKIE,
  type MockUser,
} from "@/features/auth/server/mock-session"
import { Role } from "@/lib/auth/roles"

type LoginRequest = {
  email?: unknown
  password?: unknown
  rememberMe?: unknown
}

const ADMIN_EMAILS = new Set(["admin@gettymedicalstore.com"])

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginRequest

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : ""

    const password = typeof body.password === "string" ? body.password : ""

    const rememberMe = body.rememberMe === true

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        {
          message: "Enter a valid email address.",
        },
        {
          status: 400,
        }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          message: "Password must contain at least 6 characters.",
        },
        {
          status: 400,
        }
      )
    }

    const user: MockUser = {
      id: crypto.randomUUID(),
      email,
      name: getDisplayName(email),
      phone: "",
      role: getMockUserRole(email),
    }

    const response = NextResponse.json(
      {
        message: "Login successful.",
        user,
      },
      {
        status: 200,
      }
    )

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

function getMockUserRole(email: string): Role {
  return ADMIN_EMAILS.has(email) ? Role.ADMIN : Role.CUSTOMER
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getDisplayName(email: string) {
  const localPart = email.split("@")[0] || "User"

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}
