import type { Metadata } from "next"

import TrackOrderPageContent from "@/features/orders/components/store/track-order-page-content"

export const metadata: Metadata = {
  title: "Track Order",
  description: "Track the current status of your Getty Medical Store order.",
}

type TrackOrderPageProps = {
  searchParams: Promise<{
    orderNumber?: string | string[]
  }>
}

export default async function TrackOrderPage({
  searchParams,
}: TrackOrderPageProps) {
  const resolvedSearchParams = await searchParams

  const orderNumber = getSingleValue(resolvedSearchParams.orderNumber)

  return <TrackOrderPageContent initialOrderNumber={orderNumber} />
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}
