"use client"

import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"

type PaymentResultErrorProps = {
  title: string
  description: string
  reference?: string
}

export default function PaymentResultError({
  title,
  description,
  reference,
}: PaymentResultErrorProps) {
  const router = useRouter()

  return (
    <section className="flex min-h-[65vh] items-center justify-center bg-[#F7F7F7] px-4 py-16">
      <div className="w-full max-w-xl rounded-2xl border border-[#E9EAEB] bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-50">
          <AlertCircle aria-hidden="true" className="size-8 text-red-600" />
        </div>

        <h1 className="mt-6 text-3xl font-semibold text-[#181D27]">{title}</h1>

        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[#717680]">
          {description}
        </p>

        {reference && (
          <p className="mt-4 text-xs break-all text-[#717680]">
            Payment reference:{" "}
            <span className="font-medium text-[#414651]">{reference}</span>
          </p>
        )}

        <Button
          type="button"
          onClick={() => router.replace("/cart")}
          className="mt-8 h-12 w-full rounded-lg bg-[#058A51] font-semibold text-white hover:bg-[#027A48]"
        >
          Return to cart
        </Button>
      </div>
    </section>
  )
}
