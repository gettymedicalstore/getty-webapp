import { NextResponse } from "next/server"

import { MOCK_SESSION_COOKIE } from "@/features/auth/server/mock-session"

export async function POST() {
  const response = NextResponse.json(
    {
      message: "Logout successful.",
    },
    {
      status: 200,
    }
  )

  response.cookies.delete(MOCK_SESSION_COOKIE)

  return response
}
