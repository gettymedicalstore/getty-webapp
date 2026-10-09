"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Mail,
  Phone,
  RotateCcw,
  UserRound,
} from "lucide-react"
import ContentError from "@/components/shared/content-error"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { portalTenant } from "../api/portal"
import {
  isAccountDetailField,
  tenantDetailGroups,
  tenantFieldLabel,
  tenantTabs,
  tenantText,
  type TenantRecord,
} from "../utils/tenant-details"

function DetailValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "")
    return <span className="font-normal text-[#5e6f63]">Not provided</span>
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>
  if (typeof value === "string" || typeof value === "number")
    return (
      <span className="break-words whitespace-pre-wrap">{String(value)}</span>
    )
  if (Array.isArray(value))
    return value.length ? (
      <ul className="space-y-3">
        {value.map((item, index) => (
          <li
            key={index}
            className="rounded-lg border border-[#e5ece7] bg-[#fafcfb] p-3"
          >
            <DetailValue value={item} />
          </li>
        ))}
      </ul>
    ) : (
      <span className="font-normal text-[#5e6f63]">None provided</span>
    )
  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([key]) =>
      isAccountDetailField(key)
    )
    return entries.length ? (
      <dl className="space-y-3">
        {entries.map(([key, item]) => (
          <div key={key}>
            <dt className="text-xs font-normal text-[#5e6f63]">
              {tenantFieldLabel(key)}
            </dt>
            <dd className="mt-1">
              <DetailValue value={item} />
            </dd>
          </div>
        ))}
      </dl>
    ) : (
      <span className="font-normal text-[#5e6f63]">Not provided</span>
    )
  }
  return null
}

export function TenantInformation({
  title,
  description,
  entries,
}: {
  title: string
  description: string
  entries: [string, unknown][]
}) {
  return (
    <section className="min-w-0 rounded-xl border border-[#dfe6e2] bg-white shadow-[0_2px_8px_rgba(30,50,35,.025)]">
      <div className="border-b border-[#e7ece9] px-5 py-5 sm:px-7">
        <h2 className="text-lg font-semibold text-[#2b4032]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[#5e6f63]">{description}</p>
      </div>
      {entries.length ? (
        <dl className="grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2 sm:p-7">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className={cn(
                "min-w-0",
                typeof value === "object" && value !== null && "sm:col-span-2"
              )}
            >
              <dt className="text-xs text-[#5e6f63]">
                {tenantFieldLabel(key)}
              </dt>
              <dd className="mt-2 text-sm font-medium text-[#344d3a]">
                <DetailValue value={value} />
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="flex min-h-52 flex-col items-center justify-center px-6 py-9 text-center">
          <Building2 aria-hidden className="mb-4 size-7 text-[#93a699]" />
          <h3 className="text-sm font-medium text-[#344d3a]">
            No details provided yet
          </h3>
          <p className="mt-2 text-xs text-[#5e6f63]">
            This account has no {title.toLowerCase()} to display.
          </p>
        </div>
      )}
    </section>
  )
}

export default function TenantWorkspace({
  tenantId,
  kind,
}: {
  tenantId: string
  kind: "customers" | "vendors"
}) {
  const pathname = usePathname()
  const params = useSearchParams()
  const active =
    tenantTabs.find((tab) => tab.id === params.get("tab")) ?? tenantTabs[0]
  const query = useQuery({
    queryKey: ["managed-tenant", tenantId],
    queryFn: () => portalTenant(tenantId),
  })
  const label = kind === "customers" ? "Customer" : "Vendor"
  const listHref = `/admin/${kind}`
  const back = (
    <Link
      href={listHref}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#426653] hover:text-[#087d49]"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Back to {kind}
    </Link>
  )
  if (query.isPending) return <DashboardSkeleton />
  if (query.isError)
    return (
      <div className="space-y-5">
        {back}
        <ContentError
          title={`We couldn’t load this ${label.toLowerCase()}`}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      </div>
    )
  const data: TenantRecord = query.data
  const name = tenantText(data, "name") || `${label} details`
  const status = tenantText(data, "status")
  const groups = tenantDetailGroups(data)
  const verified = data.verified === true || data.isVerified === true
  const tabHref = (tab: string) => {
    const next = new URLSearchParams(params.toString())
    next.set("tab", tab)
    return `${pathname}?${next}`
  }
  return (
    <div className="min-w-0 space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-[#dce9df] bg-[#edf6f0] text-[#387654]">
            {kind === "customers" ? (
              <UserRound aria-hidden className="size-6" />
            ) : (
              <Building2 aria-hidden className="size-6" />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight break-words text-[#172f23] sm:text-3xl">
                {name}
              </h1>
              {verified && (
                <BadgeCheck
                  role="img"
                  aria-label="Verified organisation"
                  className="size-5 shrink-0 text-[#087d49]"
                />
              )}
              {status && (
                <span
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium capitalize",
                    ["active", "onboarded", "approved"].includes(
                      status.toLowerCase()
                    )
                      ? "bg-[#e5f4e9] text-[#226a42]"
                      : "bg-[#edf0f2] text-[#576570]"
                  )}
                >
                  {status.replaceAll("_", " ")}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-[#5e6f63]">{label} account</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          <RotateCcw
            aria-hidden
            className={cn("size-4", query.isFetching && "animate-spin")}
          />
          Refresh
        </Button>
      </div>
      <nav
        aria-label={`${label} sections`}
        className="flex [scrollbar-width:thin] gap-1 overflow-x-auto border-b border-[#dce5df] sm:gap-3"
      >
        {tenantTabs.map((tab) => (
          <Link
            key={tab.id}
            href={tabHref(tab.id)}
            scroll={false}
            aria-current={active.id === tab.id ? "page" : undefined}
            className={cn(
              "flex min-h-13 shrink-0 items-center border-b-2 px-3 text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-[#167b54] focus-visible:ring-inset",
              active.id === tab.id
                ? "border-[#098655] font-semibold text-[#12533c]"
                : "border-transparent text-[#5e6f63] hover:border-[#ccd8d0] hover:text-[#244b35]"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div key={`${tenantId}:${active.id}`} className="min-w-0">
        {active.id === "overview" ? (
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
            <aside className="min-w-0 rounded-xl border border-[#dfe6e2] bg-white p-5 sm:p-7">
              <h2 className="font-semibold text-[#2b4032]">Contact summary</h2>
              <dl className="mt-5 space-y-5">
                {[
                  { key: "email", label: "Email", icon: Mail },
                  { key: "phone", label: "Phone", icon: Phone },
                ].map(({ key, label: fieldLabel, icon: Icon }) => (
                  <div key={key}>
                    <dt className="flex items-center gap-2 text-xs text-[#5e6f63]">
                      <Icon aria-hidden className="size-4" />
                      {fieldLabel}
                    </dt>
                    <dd className="mt-2 text-sm font-medium break-words text-[#344d3a]">
                      <DetailValue value={data[key]} />
                    </dd>
                  </div>
                ))}
              </dl>
              <Link
                href={tabHref("contact")}
                scroll={false}
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#087d49]"
              >
                View contact details
                <ArrowUpRight aria-hidden className="size-4" />
              </Link>
            </aside>
            <TenantInformation
              title="Account overview"
              description={`Key information about this ${label.toLowerCase()} account.`}
              entries={[
                ["name", data.name],
                ["type", data.type ?? label],
                ["status", data.status],
                ["country", data.country],
                ["timezone", data.timezone],
                ["id", data.id],
              ]}
            />
          </div>
        ) : (
          <TenantInformation
            title={active.label}
            description={
              active.id === "contact"
                ? "Contact information and addresses for this account."
                : active.id === "business"
                  ? "Organisation, registration and business information."
                  : "Account identity, status and additional information."
            }
            entries={groups[active.id]}
          />
        )}
      </div>
      {back}
    </div>
  )
}
