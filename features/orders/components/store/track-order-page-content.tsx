"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Check, LoaderCircle, PackageSearch } from "lucide-react"
import { trackingSchema } from "@/lib/form-schemas"
import {
  PublicTrackingError,
  trackOrder,
  type PublicTracking,
} from "../../api/track-order"

const stages = [
  "placed",
  "preparing",
  "ready",
  "dispatched",
  "delivered",
] as const
const labels: Record<PublicTracking["fulfilment"], string> = {
  placed: "Order placed",
  preparing: "Preparing your order",
  ready: "Packed and ready",
  dispatched: "On its way to you",
  delivered: "Delivered",
  cancelled: "Order cancelled",
  expired: "Order expired",
}
const terminal = new Set(["delivered", "cancelled", "expired"])
type Snapshot = { code: string; data: PublicTracking; updatedAt: number }

function formatTime(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function formatEstimate(
  estimate: NonNullable<PublicTracking["estimatedDelivery"]>
) {
  try {
    const formatter = new Intl.DateTimeFormat("en-NG", {
      timeZone: estimate.timezone,
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    const start = formatter.format(new Date(`${estimate.earliest}T12:00:00Z`))
    const end = formatter.format(new Date(`${estimate.latest}T12:00:00Z`))
    return start === end ? start : `${start} – ${end}`
  } catch {
    return `${estimate.earliest} – ${estimate.latest}`
  }
}

function countdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
}

export default function TrackOrderPageContent({
  initialOrderNumber,
}: {
  initialOrderNumber?: string
}) {
  const initial = trackingSchema.safeParse({
    orderNumber: initialOrderNumber ?? "",
  })
  const [input, setInput] = useState(
    initial.success ? initial.data.orderNumber : (initialOrderNumber ?? "")
  )
  const [inputError, setInputError] = useState(
    initialOrderNumber && !initial.success
      ? "Enter an order number such as 2611-K7P4."
      : ""
  )
  const [selectedCode, setSelectedCode] = useState(
    initial.success ? initial.data.orderNumber : ""
  )
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<PublicTrackingError | null>(null)
  const [now, setNow] = useState(Date.now())
  const [hasCooldown, setHasCooldown] = useState(false)
  const cooldowns = useRef(new Map<string, number>())
  const runSelected = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!selectedCode) return
    let disposed = false
    let inFlight = false
    let stopped = false
    let hasRequested = false
    let completedAt = 0
    let failures = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    let controller: AbortController | null = null

    function clearTimer() {
      if (timer) clearTimeout(timer)
      timer = null
    }
    function schedule(delay: number) {
      clearTimer()
      if (disposed || stopped || document.hidden || !navigator.onLine) return
      const remaining = Math.max(
        0,
        (cooldowns.current.get(selectedCode) ?? 0) - Date.now()
      )
      timer = setTimeout(run, Math.max(delay, remaining))
    }
    async function run(manual = false) {
      clearTimer()
      if (
        disposed ||
        inFlight ||
        stopped ||
        document.hidden ||
        !navigator.onLine
      )
        return
      const remaining = (cooldowns.current.get(selectedCode) ?? 0) - Date.now()
      if (remaining > 0) {
        schedule(remaining)
        return
      }
      inFlight = true
      const request = new AbortController()
      controller = request
      const showProgress = manual || !hasRequested
      hasRequested = true
      if (showProgress) {
        setLoading(true)
        setError(null)
      }
      try {
        const data = await trackOrder(
          { orderNumber: selectedCode },
          request.signal
        )
        if (disposed || request.signal.aborted) return
        completedAt = Date.now()
        failures = 0
        setError(null)
        setSnapshot({ code: selectedCode, data, updatedAt: completedAt })
        if (terminal.has(data.fulfilment)) stopped = true
      } catch (cause) {
        if (disposed || request.signal.aborted) return
        completedAt = Date.now()
        const nextError =
          cause instanceof PublicTrackingError
            ? cause
            : new PublicTrackingError(
                "Tracking is temporarily unavailable. Please try again shortly.",
                503
              )
        setError(nextError)
        if (nextError.status === 429) {
          cooldowns.current.set(
            selectedCode,
            completedAt + (nextError.retryAfterSeconds ?? 300) * 1000
          )
          setNow(completedAt)
          setHasCooldown(true)
        } else if (nextError.status >= 500) failures += 1
        else stopped = true
      } finally {
        inFlight = false
        controller = null
        if (!disposed) {
          if (showProgress) setLoading(false)
          if (request.signal.aborted) resume()
          else if (!stopped)
            schedule(
              failures
                ? Math.min(30_000 * 2 ** (failures - 1), 300_000)
                : 30_000
            )
        }
      }
    }
    function pause() {
      clearTimer()
      controller?.abort()
    }
    function resume() {
      if (disposed || stopped || document.hidden || !navigator.onLine) return
      schedule(
        completedAt ? Math.max(0, 30_000 - (Date.now() - completedAt)) : 0
      )
    }
    function onVisibilityChange() {
      if (document.hidden) pause()
      else resume()
    }
    runSelected.current = () => {
      stopped = false
      void run(true)
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("offline", pause)
    window.addEventListener("online", resume)
    schedule(0)
    return () => {
      disposed = true
      clearTimer()
      controller?.abort()
      runSelected.current = null
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("offline", pause)
      window.removeEventListener("online", resume)
    }
  }, [selectedCode])

  useEffect(() => {
    if (!hasCooldown) return
    const timer = setInterval(() => {
      const current = Date.now()
      for (const [code, until] of cooldowns.current) {
        if (until <= current) cooldowns.current.delete(code)
      }
      setNow(current)
      if (cooldowns.current.size === 0) setHasCooldown(false)
    }, 1000)
    return () => clearInterval(timer)
  }, [hasCooldown])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = trackingSchema.safeParse({ orderNumber: input })
    if (!parsed.success) {
      setInputError("Enter an order number such as 2611-K7P4.")
      return
    }
    const code = parsed.data.orderNumber
    setInput(code)
    setInputError("")
    const remaining = (cooldowns.current.get(code) ?? 0) - Date.now()
    if (remaining > 0) {
      setNow(Date.now())
      if (code === selectedCode)
        setError(
          new PublicTrackingError(
            "Tracking limit reached. Try again shortly.",
            429,
            Math.ceil(remaining / 1000)
          )
        )
      return
    }
    if (code === selectedCode) {
      runSelected.current?.()
      return
    }
    setSnapshot(null)
    setError(null)
    setSelectedCode(code)
    window.history.replaceState(
      window.history.state,
      "",
      `/track-order?code=${encodeURIComponent(code)}`
    )
  }

  const parsedInput = trackingSchema.safeParse({ orderNumber: input })
  const inputCode = parsedInput.success ? parsedInput.data.orderNumber : ""
  const inputCooldown = Math.max(
    0,
    (cooldowns.current.get(inputCode) ?? 0) - now
  )
  const activeCooldown = Math.max(
    0,
    (cooldowns.current.get(selectedCode) ?? 0) - now
  )
  const result = snapshot?.code === selectedCode ? snapshot : null
  const stale = Boolean(error && error.status >= 500 && result)
  const upcoming =
    result && !terminal.has(result.data.fulfilment)
      ? stages.slice(
          stages.indexOf(result.data.fulfilment as (typeof stages)[number]) + 1
        )
      : []

  return (
    <section className="bg-[#f7f9f5] py-10 sm:py-14 lg:py-18">
      <div className="site-container">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#dfe9df] bg-white px-6 py-8 sm:px-10 sm:py-10">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1e372a] sm:text-4xl">
            Track your order
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#64766a] sm:text-base">
            Enter the order number from your confirmation to see the latest
            delivery update. No account is needed.
          </p>
          <form onSubmit={submit} className="mt-8" noValidate>
            <label
              htmlFor="tracking-order-number"
              className="text-sm font-medium text-[#304a38]"
            >
              Order number
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input
                id="tracking-order-number"
                name="orderNumber"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value)
                  setInputError("")
                }}
                autoComplete="off"
                placeholder="e.g. 2611-K7P4"
                aria-invalid={Boolean(inputError)}
                aria-describedby={
                  inputError ? "tracking-order-error" : undefined
                }
                className="form-input h-12 min-w-0 flex-1 rounded-xl"
              />
              <button
                type="submit"
                disabled={
                  (loading && inputCode === selectedCode) || inputCooldown > 0
                }
                className="bg-primary hover:bg-primary-darker inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold whitespace-nowrap text-white transition disabled:opacity-50"
              >
                {loading && inputCode === selectedCode ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : (
                  <PackageSearch className="size-4" aria-hidden />
                )}
                {loading && inputCode === selectedCode
                  ? "Checking order…"
                  : "Track order"}
              </button>
            </div>
            {inputError && (
              <p
                id="tracking-order-error"
                role="alert"
                className="mt-2 text-sm text-red-700"
              >
                {inputError}
              </p>
            )}
          </form>
          <div
            aria-live="polite"
            aria-atomic="true"
            className="mt-4 text-sm leading-6"
          >
            {loading && (
              <p className="text-[#536b5a]">
                Checking the latest delivery update…
              </p>
            )}
            {inputCooldown > 0 && inputCode !== selectedCode && (
              <p className="text-amber-900">
                You can check {inputCode} again in{" "}
                {countdown(Math.ceil(inputCooldown / 1000))}.
              </p>
            )}
            {error && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                {error.message}{" "}
                {error.status === 429 &&
                  activeCooldown > 0 &&
                  `You can refresh tracking in ${countdown(Math.ceil(activeCooldown / 1000))}.`}
              </p>
            )}
          </div>
        </div>
        {result && (
          <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-[#dfe9df] bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/5 pb-5">
              <div>
                <strong className="text-lg text-[#233b2d]">
                  {result.data.orderCode}
                </strong>
                <p className="text-muted-foreground mt-1 text-sm">
                  Placed {formatTime(result.data.placed)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Last updated{" "}
                  {new Date(result.updatedAt).toLocaleTimeString("en-NG", {
                    timeStyle: "short",
                  })}
                  {stale && " · Last known update"}
                </p>
              </div>
              <span className="bg-primary/10 text-primary rounded-full px-3 py-1.5 text-sm font-semibold">
                {labels[result.data.fulfilment]}
              </span>
            </div>
            {result.data.estimatedDelivery &&
              !terminal.has(result.data.fulfilment) && (
                <p className="mt-5 rounded-xl bg-[#f1f7f1] px-4 py-3 text-sm text-[#304a38]">
                  Estimated delivery{" "}
                  {formatEstimate(result.data.estimatedDelivery)}
                </p>
              )}
            <h2 className="mt-7 text-lg font-semibold">Delivery progress</h2>
            {result.data.timeline.length === 0 && (
              <p className="text-muted-foreground mt-3 text-sm">
                No delivery milestones have been recorded yet.
              </p>
            )}
            <ol className="mt-6" aria-label="Delivery timeline">
              {result.data.timeline.map((event, index) => (
                <li
                  key={`${event.status}-${event.at}-${index}`}
                  className="relative flex gap-5 pb-7 last:pb-0"
                >
                  {(index < result.data.timeline.length - 1 ||
                    upcoming.length > 0) && (
                    <span
                      aria-hidden
                      className="bg-primary absolute top-9 bottom-0 left-[18px] w-0.5"
                    />
                  )}
                  <span
                    aria-hidden
                    className="bg-primary relative z-10 grid size-9 shrink-0 place-items-center rounded-full text-white"
                  >
                    <Check className="size-5" />
                  </span>
                  <div className="min-h-9 pt-0.5">
                    <span className="text-sm font-semibold text-[#1e5939]">
                      {labels[event.status]}
                    </span>
                    <time
                      dateTime={event.at}
                      className="mt-1 block text-sm text-[#596a5e]"
                    >
                      {formatTime(event.at)}
                    </time>
                  </div>
                </li>
              ))}
              {upcoming.map((stage, index) => (
                <li key={stage} className="relative flex gap-5 pb-7 last:pb-0">
                  {index < upcoming.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute top-9 bottom-0 left-[18px] w-0.5 bg-[#dfe6df]"
                    />
                  )}
                  <span
                    aria-hidden
                    className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2 border-[#dfe6df] bg-white"
                  >
                    <span className="size-2.5 rounded-full bg-[#c6d0c8]" />
                  </span>
                  <div className="min-h-9 pt-0.5">
                    <span className="text-sm font-medium text-[#66766b]">
                      {labels[stage]}
                    </span>
                    <span className="mt-1 block text-xs text-[#829187]">
                      Upcoming
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  )
}
