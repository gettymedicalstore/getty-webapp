import Link from "next/link"
export const dynamic = "force-dynamic"
export default function RegisterPage() {
  return (
    <section>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Become a Getty supplier
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#535862]">
          Our team sets up supplier accounts. Contact us to get started. Once
          your account is created, your welcome email will include login
          credentials.
        </p>
        <div className="mt-6 flex gap-4">
          <Link
            className="bg-primary rounded-lg px-4 py-3 text-sm font-semibold text-white"
            href="/contact"
          >
            Contact Getty
          </Link>
          <Link className="rounded-lg border px-4 py-3 text-sm" href="/login">
            Log in
          </Link>
        </div>
      </div>
    </section>
  )
}
