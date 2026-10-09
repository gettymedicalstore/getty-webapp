"use client"
import {
  ValidatedForm,
  FormInput,
} from "@/components/shared/form/validated-form"
import { trackingSchema } from "@/lib/form-schemas"

import { useMutation } from "@tanstack/react-query"
import {
  ArrowRight,
  Check,
  CircleHelp,
  LoaderCircle,
  PackageSearch,
} from "lucide-react"
import Link from "next/link"

import { trackOrder, type TrackOrderInput } from "../../api/track-order"

export default function TrackOrderPageContent({
  initialOrderNumber,
}: {
  initialOrderNumber?: string
}) {
  const trackingMutation = useMutation({
    mutationFn: trackOrder,
  })

  function submit(values: TrackOrderInput) {
    trackingMutation.mutate(values)
  }

  return (
    <section className="bg-[#f7f9f5] py-10 sm:py-14 lg:py-18">
      <div className="site-container">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[#dfe9df] bg-white shadow-[0_20px_60px_-48px_rgba(18,63,48,0.45)]">
          <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="bg-[#eef6ef] px-6 py-9 sm:px-10 sm:py-12 lg:px-12 lg:py-16">
              <span className="text-primary inline-flex size-14 items-center justify-center rounded-2xl border border-[#d2e7d5] bg-white">
                <PackageSearch
                  className="size-7"
                  strokeWidth={1.7}
                  aria-hidden
                />
              </span>
              <p className="mt-10 text-xs font-semibold tracking-[0.14em] text-[#4f7559] uppercase">
                Order updates
              </p>
              <h1 className="mt-3 max-w-sm text-3xl font-semibold tracking-tight text-[#1e372a] sm:text-4xl">
                Track your order
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-[#536b5a] sm:text-base">
                Enter your order number to find the latest update.
              </p>
              <div className="mt-10 border-t border-[#d4e4d7] pt-6">
                <p className="flex items-start gap-3 text-sm leading-6 text-[#496350]">
                  <CircleHelp className="mt-0.5 size-5 shrink-0" aria-hidden />
                  Need help with an order? Our support team can help you find
                  it.
                </p>
                <Link
                  href="/contact"
                  className="text-primary mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold hover:underline"
                >
                  Contact support <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
            <div className="flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-12 lg:px-12">
              <h2 className="text-xl font-semibold tracking-tight text-[#233b2d]">
                Find an order
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#64766a]">
                You’ll find the order number in your confirmation email.
              </p>
              <ValidatedForm
                schema={trackingSchema}
                onSubmit={submit}
                className="mt-8 space-y-5"
              >
                <div>
                  <label
                    htmlFor="tracking-order-number"
                    className="text-sm font-medium text-[#304a38]"
                  >
                    Order number
                  </label>
                  <FormInput
                    id="tracking-order-number"
                    required
                    name="orderNumber"
                    defaultValue={initialOrderNumber ?? ""}
                    onChange={() => {
                      trackingMutation.reset()
                    }}
                    autoComplete="off"
                    placeholder="e.g. GET-123456"
                    className="form-input mt-2 h-12 w-full rounded-xl"
                  />
                </div>
                <button
                  type="submit"
                  disabled={trackingMutation.isPending}
                  className="bg-primary hover:bg-primary-darker inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition disabled:opacity-50"
                >
                  {trackingMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <PackageSearch className="size-4" aria-hidden />
                  )}
                  {trackingMutation.isPending
                    ? "Checking order…"
                    : "Track order"}
                </button>
              </ValidatedForm>
              {trackingMutation.isError && (
                <div
                  role="alert"
                  className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
                >
                  {trackingMutation.error.message}{" "}
                  <Link
                    href="/contact"
                    className="font-semibold underline underline-offset-2"
                  >
                    Contact support
                  </Link>
                </div>
              )}
              {trackingMutation.isSuccess && !trackingMutation.data && (
                <div
                  role="status"
                  className="mt-6 rounded-xl border border-[#dce6de] bg-[#f6f9f6] p-4 text-sm text-[#3e5846]"
                >
                  No matching order was found. Check the details and try again.
                </div>
              )}
            </div>
          </div>
        </div>
        {trackingMutation.data && (
          <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-[#dfe9df] bg-white p-6 sm:p-8">
            <div className="flex justify-between border-b border-black/5 pb-5">
              <strong>{trackingMutation.data.orderNumber}</strong>
              <span className="bg-primary/10 text-primary rounded-full px-3 py-1.5 text-xs font-bold capitalize">
                {trackingMutation.data.status}
              </span>
            </div>

            <div className="mt-7 grid gap-5">
              {trackingMutation.data.timeline.map((item) => (
                <div key={item.status} className="flex gap-4">
                  <div
                    className={`grid size-8 shrink-0 place-items-center rounded-full ${
                      item.completed
                        ? "bg-primary text-white"
                        : "bg-black/5 text-black/30"
                    }`}
                  >
                    <Check className="size-4" />
                  </div>

                  <p className="text-sm font-bold">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
