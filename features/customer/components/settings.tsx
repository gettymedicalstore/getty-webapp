"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { preferencesFormSchema } from "@/lib/form-schemas"

import Link from "next/link"
import { useState } from "react"
import {
  ArrowUpRight,
  Bell,
  KeyRound,
  LifeBuoy,
  ShieldCheck,
} from "lucide-react"
import CreateAccount from "@/features/admin/components/create-account"
import ChangePasswordDialog from "@/features/auth/components/change-password-dialog"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { useDeviceStore } from "@/lib/use-device-store"
import PageHeading from "@/components/shared/page-heading"

const defaults = { orderUpdates: true, offers: false }

export default function Settings() {
  const { data: session } = useAuthSession()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [saved, setPreferences] = useDeviceStore(
    `getty-preferences:${session?.user?.id ?? "guest"}`,
    defaults
  )
  const preferences = saved && typeof saved === "object" ? saved : defaults
  const form = useForm({
    resolver: zodResolver(preferencesFormSchema),
    values: {
      orderUpdates: Boolean(preferences.orderUpdates),
      offers: Boolean(preferences.offers),
    },
    shouldUseNativeValidation: false,
  })

  return (
    <div className="max-w-6xl space-y-7">
      {session?.user && (
        <ChangePasswordDialog
          open={passwordOpen}
          onOpenChange={setPasswordOpen}
        />
      )}
      <PageHeading
        title="Account settings"
        description="Choose how Getty contacts you and manage account access."
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.85fr)]">
        <section className="overflow-hidden rounded-2xl border border-[#dfe8e1] bg-white shadow-[0_8px_32px_-24px_rgba(13,61,39,0.32)]">
          <div className="flex items-start gap-3 border-b border-[#e9eeea] px-5 py-5 sm:px-7 sm:py-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf5ee] text-[#23824d]">
              <Bell aria-hidden className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold text-[#2b4032]">Notifications</h2>
              <p className="mt-1 text-sm leading-5 text-[#5e6f63]">
                These preferences are saved on this device.
              </p>
            </div>
          </div>
          <form
            noValidate
            onSubmit={form.handleSubmit((values) => {
              setPreferences(values)
            })}
            className="divide-y divide-[#eef2ee] px-5 sm:px-7"
          >
            {[
              {
                key: "orderUpdates" as const,
                title: "Order updates",
                description: "Updates about orders and deliveries.",
              },
              {
                key: "offers" as const,
                title: "Offers and product news",
                description: "New products, offers and store news.",
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex min-h-22 cursor-pointer items-center justify-between gap-5 py-5"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#34473a]">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#5e6f63]">
                    {item.description}
                  </span>
                </span>
                <span className="relative shrink-0">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    {...form.register(item.key, {
                      onChange: () => {
                        void form.handleSubmit((values) => {
                          setPreferences(values)
                        })()
                      },
                    })}
                  />
                  <span
                    aria-hidden
                    className="block h-7 w-12 rounded-full bg-[#d9e0da] transition-colors peer-checked:bg-[#07834e] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-[#07834e]"
                  />
                  <span
                    aria-hidden
                    className="absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"
                  />
                </span>
              </label>
            ))}
          </form>
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-[#dfe8e1] bg-white p-5 sm:p-6">
            <span className="grid size-10 place-items-center rounded-xl bg-[#edf5ee] text-[#23824d]">
              <KeyRound aria-hidden className="size-5" />
            </span>
            <h2 className="mt-4 font-semibold text-[#2b4032]">
              Password and security
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-[#5e6f63]">
              Update your password to keep your account secure.
            </p>
            <button
              type="button"
              onClick={() => setPasswordOpen(true)}
              aria-haspopup="dialog"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#cce0d1] px-4 text-sm font-semibold text-[#087d49] transition hover:bg-[#eff7f0]"
            >
              Change password <KeyRound aria-hidden className="size-4" />
            </button>
          </section>

          <section className="rounded-2xl border border-[#dfe8e1] bg-white p-5 sm:p-6">
            <span className="grid size-10 place-items-center rounded-xl bg-[#edf5ee] text-[#23824d]">
              <LifeBuoy aria-hidden className="size-5" />
            </span>
            <h2 className="mt-4 font-semibold text-[#2b4032]">Need help?</h2>
            <p className="mt-1.5 text-sm leading-6 text-[#5e6f63]">
              Our team can help with account or order questions.
            </p>
            <Link
              href="/contact"
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#087d49] hover:underline"
            >
              Contact support <ArrowUpRight aria-hidden className="size-4" />
            </Link>
          </section>
        </div>
      </div>

      {session?.user?.tenantType === "consumer" &&
        ["admin", "superadmin"].includes(session.user.profileRole ?? "") && (
          <section className="flex flex-col gap-4 rounded-2xl border border-[#dfe8e1] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf5ee] text-[#23824d]">
                <ShieldCheck aria-hidden className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold text-[#2b4032]">
                  Organisation team
                </h2>
                <p className="mt-1 text-sm text-[#5e6f63]">
                  Invite someone to help manage your organisation.
                </p>
              </div>
            </div>
            <CreateAccount kind="profile" />
          </section>
        )}
    </div>
  )
}
