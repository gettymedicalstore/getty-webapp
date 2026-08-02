"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import type { Cart } from "@/features/cart/types/cart"
import {
  checkoutSchema,
  type CheckoutFormSchema,
} from "../../schemas/checkout-schema"
import type { CheckoutCustomer } from "../../types/checkout"
import { formatCurrency } from "@/features/products/utils/format-currency"

export default function CheckoutPageContent({
  initialCart,
  customer,
}: {
  initialCart: Cart
  customer: CheckoutCustomer
}) {
  const nameParts = customer.name.trim().split(/\s+/)

  const form = useForm<CheckoutFormSchema>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      firstName: nameParts[0] ?? "",
      lastName: nameParts.slice(1).join(" "),
      email: customer.email,
      phone: customer.phone ?? "",
      addressLineOne: "",
      addressLineTwo: "",
      city: "",
      state: "",
      deliveryNote: "",
      paymentMethod: "card",
    },
  })

  async function submitCheckout(values: CheckoutFormSchema) {
    console.log(values)
    toast.success("Checkout details submitted successfully")
  }

  return (
    <section className="bg-[#f7f7f7] py-12">
      <div className="site-container">
        <h1 className="text-3xl font-extrabold">Checkout</h1>

        <form
          onSubmit={form.handleSubmit(submitCheckout)}
          className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]"
        >
          <div className="rounded-xl bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold">Delivery information</h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <input
                {...form.register("firstName")}
                placeholder="First name"
                className="form-input"
              />
              <input
                {...form.register("lastName")}
                placeholder="Last name"
                className="form-input"
              />
              <input
                type="email"
                {...form.register("email")}
                placeholder="Email address"
                className="form-input"
              />
              <input
                {...form.register("phone")}
                placeholder="Phone number"
                className="form-input"
              />
              <input
                {...form.register("addressLineOne")}
                placeholder="Address"
                className="form-input sm:col-span-2"
              />
              <input
                {...form.register("city")}
                placeholder="City"
                className="form-input"
              />
              <input
                {...form.register("state")}
                placeholder="State"
                className="form-input"
              />
            </div>
          </div>

          <aside className="h-fit rounded-xl bg-white p-6">
            <h2 className="text-lg font-bold">Order summary</h2>

            <div className="mt-5 grid gap-4">
              {initialCart.items.map((item) => (
                <div
                  key={item.productId}
                  className="flex justify-between gap-4 text-sm"
                >
                  <span className="text-black/55">
                    {item.product.name} × {item.quantity}
                  </span>

                  <strong>
                    {formatCurrency(item.product.price * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-between border-t border-black/10 pt-5">
              <strong>Total</strong>
              <strong className="text-xl">
                {formatCurrency(initialCart.total)}
              </strong>
            </div>

            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="bg-primary mt-6 flex h-12 w-full items-center justify-center rounded-md text-sm font-bold text-white disabled:opacity-50"
            >
              Place order
            </button>
          </aside>
        </form>
      </div>
    </section>
  )
}
