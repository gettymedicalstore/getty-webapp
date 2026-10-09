"use client"
import { useCallback, useMemo, useSyncExternalStore } from "react"
import { toast } from "sonner"
const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange)
  window.addEventListener("getty-storage", onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener("getty-storage", onChange)
  }
}
export function useDeviceStore<T>(key: string, fallback: T) {
  const snapshot = useSyncExternalStore(
    subscribe,
    useCallback(() => {
      try {
        return window.localStorage.getItem(key)
      } catch {
        return null
      }
    }, [key]),
    () => null
  )
  const value = useMemo(() => {
    try {
      return snapshot ? (JSON.parse(snapshot) as T) : fallback
    } catch {
      return fallback
    }
  }, [snapshot, fallback])
  const setValue = (next: T) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(next))
      window.dispatchEvent(new Event("getty-storage"))
      return true
    } catch {
      toast.error("Your changes could not be saved on this device.")
      return false
    }
  }
  return [value, setValue] as const
}
