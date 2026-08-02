"use client"

import { useMutation } from "@tanstack/react-query"
import { Check, PackageSearch } from "lucide-react"
import { FormEvent, useState } from "react"

import { trackOrder } from "../../api/track-order"

export default function TrackOrderPageContent({
  initialOrderNumber,
}: {
  initialOrderNumber?: string
}) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber ?? "")
  const [email, setEmail] = useState("")

  const trackingMutation = useMutation({
    mutationFn: trackOrder,
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    trackingMutation.mutate({
      orderNumber: orderNumber.trim(),
      email: email.trim(),
    })
  }

  return (
    <section className="bg-[#f7f7f7] py-12 sm:py-16">
      <div className="site-container">
        <div className="mx-auto max-w-2xl text-center">
          <div className="bg-primary/10 text-primary mx-auto grid size-16 place-items-center rounded-full">
            <PackageSearch className="size-7" />
          </div>

          <h1 className="mt-5 text-3xl font-extrabold">Track your order</h1>
        </div>

        <form
          onSubmit={submit}
          className="mx-auto mt-8 grid max-w-2xl gap-4 rounded-xl bg-white p-6 sm:grid-cols-2"
        >
          <input
            required
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            placeholder="Order number"
            className="form-input"
          />

          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            className="form-input"
          />

          <button
            type="submit"
            disabled={trackingMutation.isPending}
            className="bg-primary h-12 rounded-md text-sm font-bold text-white disabled:opacity-50 sm:col-span-2"
          >
            {trackingMutation.isPending ? "Checking order..." : "Track order"}
          </button>
        </form>

        {trackingMutation.isSuccess && !trackingMutation.data && (
          <div className="border-destructive/20 bg-destructive/5 text-destructive mx-auto mt-6 max-w-2xl rounded-xl border p-5 text-sm">
            No matching order was found.
          </div>
        )}

        {trackingMutation.data && (
          <div className="mx-auto mt-8 max-w-2xl rounded-xl bg-white p-6 sm:p-8">
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
