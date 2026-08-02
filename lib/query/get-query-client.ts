import { QueryClient } from "@tanstack/react-query"
import { cache } from "react"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  })
}

export const getQueryClient = cache(makeQueryClient)
