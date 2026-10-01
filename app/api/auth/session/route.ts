import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  decodeMockSession,
  MOCK_SESSION_COOKIE,
  type MockUser,
} from "@/features/auth/server/mock-session"

export const dynamic = "force-dynamic"

type SessionResponse = {
  user: MockUser | null
  message?: string
}

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

    return NextResponse.json<SessionResponse>(
      {
        user: null,
        message: "Unable to load the current session.",
      },
      {
        status: 500,
        headers: getNoStoreHeaders(),
      }
    )
  }
}

function createSessionResponse(user: MockUser | null) {
  return NextResponse.json<SessionResponse>(
    {
      user,
    },
    {
      status: 200,
      headers: getNoStoreHeaders(),
    }
  )
}

function getNoStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  }
}
