"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { readSession, subscribeSession } from "../api/session-store"

export default function SessionCacheSync() {
  const client = useQueryClient()
  useEffect(() => {
    let sessionId = readSession().sessionId
    return subscribeSession(() => {
      const next = readSession().sessionId
      if (next !== sessionId) {
        sessionId = next
        client.clear()
      }
    })
  }, [client])
  return null
}
