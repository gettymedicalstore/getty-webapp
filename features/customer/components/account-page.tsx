"use client"

import Link from "next/link"
import { Settings, MapPin, Building2, ArrowUpRight } from "lucide-react"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import ProfileForm from "./profile-form"

export default function AccountPage() {
  const user = useAuthSession().data?.user
  const vendor = user?.role === "supplier"
  const base = vendor ? "/supplier" : "/customer"
  return (
    <div className="max-w-6xl space-y-7">
      <ProfileForm title="Account" />
      {user && (
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#263c2e]">
              Manage your account
            </h2>
            <p className="mt-1 text-sm text-[#5e6f63]">
              Quick access to your preferences and organisation details.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href={`${base}/settings`}
              className="group flex min-h-27 items-center gap-4 rounded-2xl border border-[#dfe8e1] bg-white p-5 transition hover:border-[#abcbb4] hover:shadow-[0_12px_30px_-24px_rgba(13,61,39,0.4)]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#ecf5ee] text-[#18814d]">
                <Settings aria-hidden className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#2d4233]">
                  Preferences and security
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#5e6f63]">
                  Notifications and password
                </span>
              </span>
              <ArrowUpRight
                aria-hidden
                className="size-4 shrink-0 text-[#8aa491] transition group-hover:text-[#15814c]"
              />
            </Link>
            <Link
              href={vendor ? "/supplier/registration" : "/customer/addresses"}
              className="group flex min-h-27 items-center gap-4 rounded-2xl border border-[#dfe8e1] bg-white p-5 transition hover:border-[#abcbb4] hover:shadow-[0_12px_30px_-24px_rgba(13,61,39,0.4)]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#ecf5ee] text-[#18814d]">
                {vendor ? (
                  <Building2 aria-hidden className="size-5" />
                ) : (
                  <MapPin aria-hidden className="size-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#2d4233]">
                  {vendor ? "Business details" : "Delivery addresses"}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#5e6f63]">
                  {vendor
                    ? "Registration and documents"
                    : "Where your orders are delivered"}
                </span>
              </span>
              <ArrowUpRight
                aria-hidden
                className="size-4 shrink-0 text-[#8aa491] transition group-hover:text-[#15814c]"
              />
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
