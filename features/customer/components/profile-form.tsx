"use client"

import Link from "next/link"
import { BadgeCheck, Building2, Mail, Phone, UserRound } from "lucide-react"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import PageHeading from "@/components/shared/page-heading"
import { FormSkeleton } from "@/components/shared/loading-skeletons"
import { accountRoleLabel } from "@/lib/auth/navigation"

export default function ProfileForm({ title = "Profile" }: { title?: string }) {
  const session = useAuthSession()
  const user = session.data?.user

  if (session.isPending) return <FormSkeleton />
  if (!user) return null

  const initials =
    user.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  const role = accountRoleLabel(user.role)

  return (
    <div className="space-y-6">
      <PageHeading
        title={title}
        description="Your profile and organisation details in one place."
      />

      <section className="overflow-hidden rounded-2xl border border-[#dfe8e1] bg-white shadow-[0_8px_32px_-24px_rgba(13,61,39,0.32)]">
        <div className="flex flex-col gap-5 border-b border-[#e8eee9] bg-[#f8fbf8] px-5 py-6 sm:flex-row sm:items-center sm:px-7">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl border border-[#d4e7da] bg-[#e7f3e9] text-xl font-semibold text-[#18683f]">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 text-xl font-semibold tracking-tight break-words text-[#243a2b]">
                {user.name}
              </h2>
              {user.tenantStatus === "verified" && (
                <span
                  role="img"
                  aria-label="Verified organisation"
                  title="Verified organisation"
                  className="inline-flex size-6 items-center justify-center rounded-full bg-[#dff2e5] text-[#14834e]"
                >
                  <BadgeCheck aria-hidden className="size-4" />
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-[#5e6f63]">
              {role}
              {user.tenant ? ` · ${user.tenant}` : ""}
            </p>
          </div>
          <span className="w-fit rounded-full border border-[#dce9df] bg-white px-3 py-1 text-xs font-semibold text-[#496c51]">
            {user.status === "active"
              ? "Active account"
              : user.status || "Account"}
          </span>
        </div>

        <div className="px-5 py-6 sm:px-7 sm:py-7">
          <h3 className="text-base font-semibold text-[#2c4133]">
            Account information
          </h3>
          <dl className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
            <Detail icon={Mail} label="Email address" value={user.email} />
            <Detail
              icon={Phone}
              label="Phone number"
              value={user.phone || "Not supplied"}
            />
            <Detail
              icon={Building2}
              label="Organisation"
              value={user.tenant || "Not supplied"}
            />
            <Detail icon={UserRound} label="Account type" value={role} />
            <Detail
              label="Profile status"
              value={user.status || "Not supplied"}
            />
            <Detail
              label="Organisation status"
              value={user.tenantStatus || "Not supplied"}
            />
          </dl>
        </div>

        <div className="flex flex-col gap-1 border-t border-[#e8eee9] bg-[#fbfcfb] px-5 py-4 text-sm text-[#66766a] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1 sm:px-7">
          <span>Need to correct these details?</span>
          <Link
            href="/contact"
            className="font-semibold text-[#087d49] hover:underline"
          >
            Contact support <span aria-hidden>↗</span>
          </Link>
        </div>
      </section>
    </div>
  )
}

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon?: typeof Mail
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-2 text-xs font-medium text-[#5e6f63]">
        {Icon && <Icon aria-hidden className="size-4" strokeWidth={1.8} />}
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-medium break-words text-[#2f4034]">
        {value}
      </dd>
    </div>
  )
}
