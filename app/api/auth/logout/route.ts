import { NextResponse } from "next/server"

import { MOCK_SESSION_COOKIE } from "@/features/auth/server/mock-session"

export async function POST() {
  const response = NextResponse.json({
    message: "Logout successful.",
  })

  response.cookies.set({
    name: MOCK_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })

  return response
}
