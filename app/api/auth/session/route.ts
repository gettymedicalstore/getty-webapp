import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  decodeMockSession,
  MOCK_SESSION_COOKIE,
} from "@/features/auth/server/mock-session"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const cookieStore = await cookies()

    const sessionValue = cookieStore.get(MOCK_SESSION_COOKIE)?.value

    if (!sessionValue) {
      return createSessionResponse(null)
    }

    const user = decodeMockSession(sessionValue)

    if (!user) {
      const response = createSessionResponse(null)

      response.cookies.delete(MOCK_SESSION_COOKIE)

      return response
    }

    return createSessionResponse(user)
  } catch (error) {
    console.error("Session route error:", error)

    return NextResponse.json(
      {
        user: null,
        message: "Unable to load the current session.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  }
}

function createSessionResponse(user: ReturnType<typeof decodeMockSession>) {
  return NextResponse.json(
    {
      user,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  )
}
