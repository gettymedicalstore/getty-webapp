"use client"

import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ErrorPage({
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <section className="flex min-h-[60dvh] items-center justify-center px-4 py-12">
      <div
        role="alert"
        className="w-full max-w-lg rounded-xl border bg-white p-6 text-center sm:p-10"
      >
        <AlertCircle className="text-primary mx-auto size-10" />
        <h1 className="mt-5 text-2xl font-semibold">
          This page could not be loaded
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Please try again. Your cart and saved products have been kept.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={unstable_retry} className="h-11">
            Try again
          </Button>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-lg border px-5 text-sm font-semibold"
          >
            Return to store
          </Link>
        </div>
      </div>
    </section>
  )
}
