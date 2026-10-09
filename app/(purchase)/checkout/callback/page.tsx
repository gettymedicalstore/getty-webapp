import Link from "next/link"
export default function PaymentReturn() {
  return (
    <section className="site-container py-12">
      <div className="mx-auto max-w-xl rounded-3xl border bg-white p-8">
        <h1 className="text-2xl font-semibold">Check your payment status</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          We can’t confirm a payment from this link. Contact support with your
          payment reference before making another payment. Your saved bag has
          been kept.
        </p>
        <div className="mt-6 flex gap-4">
          <Link href="/contact" className="text-primary font-semibold">
            Contact support
          </Link>
          <Link href="/cart" className="text-primary">
            Back to your bag
          </Link>
        </div>
      </div>
    </section>
  )
}
