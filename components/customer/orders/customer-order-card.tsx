import Image from "next/image"
import Link from "next/link"

import OrderStatusBadge from "./order-status-badge"

type CustomerOrderCardProps = {
  order: {
    id: string
    number: string
    placedAt: string
    status: string
    total: number
    currency?: string
    itemCount: number
    previewImage?: string
  }
}

export default function CustomerOrderCard({ order }: CustomerOrderCardProps) {
  const currency = order.currency ?? "NGN"

  return (
    <article className="bg-background rounded-xl border p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex gap-4">
          <div className="bg-muted relative size-20 overflow-hidden rounded-lg">
            {order.previewImage ? (
              <Image
                src={order.previewImage}
                alt=""
                fill
                sizes="80px"
                className="object-contain p-2"
              />
            ) : null}
          </div>

          <div>
            <p className="text-muted-foreground text-xs">Order number</p>

            <h3 className="mt-1 font-semibold">{order.number}</h3>

            <p className="text-muted-foreground mt-2 text-xs">
              {order.itemCount} item
              {order.itemCount === 1 ? "" : "s"} · {order.placedAt}
            </p>
          </div>
        </div>

        <div className="flex flex-row items-center justify-between gap-4 sm:flex-col sm:items-end">
          <OrderStatusBadge status={order.status} />

          <p className="font-semibold">
            {new Intl.NumberFormat("en-NG", {
              style: "currency",
              currency,
              maximumFractionDigits: 0,
            }).format(order.total)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-end border-t pt-4">
        <Link
          href={`/customer/orders/${order.id}`}
          className="text-primary text-sm font-semibold hover:underline"
        >
          View order details
        </Link>
      </div>
    </article>
  )
}
