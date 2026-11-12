"use client"

import { useRef, useState, type KeyboardEvent } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { ArrowUpRight, Bell, KeyRound, LifeBuoy } from "lucide-react"
import TeamProfiles from "@/features/admin/components/team-profiles"
import ChangePasswordDialog from "@/features/auth/components/change-password-dialog"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { preferencesFormSchema } from "@/lib/form-schemas"
import { useDeviceStore } from "@/lib/use-device-store"

const defaults = { orderUpdates: true, offers: false }
type SettingsView = "preferences" | "team"

export default function Settings() {
  const { data: session } = useAuthSession()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [view, setView] = useState<SettingsView>("preferences")
  const tabRefs = useRef<Record<SettingsView, HTMLButtonElement | null>>({
    preferences: null,
    team: null,
  })
  const canManageTeam = Boolean(
    session?.user &&
    ["admin", "superadmin"].includes(session.user.profileRole ?? "")
  )
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

  function moveTab(event: KeyboardEvent<HTMLButtonElement>) {
    let next: SettingsView | null = null
    if (event.key === "ArrowRight" || event.key === "ArrowLeft")
      next = view === "preferences" ? "team" : "preferences"
    if (event.key === "Home") next = "preferences"
    if (event.key === "End") next = "team"
    if (!next) return
    event.preventDefault()
    setView(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <div className="max-w-6xl min-w-0 space-y-6">
      {session?.user && (
        <ChangePasswordDialog
          open={passwordOpen}
          onOpenChange={setPasswordOpen}
        />
      )}

      {canManageTeam && (
        <div
          className="flex gap-6 overflow-x-auto border-b border-[#dfe8e1]"
          role="tablist"
          aria-label="Account settings"
        >
          {(
            [
              ["preferences", "Preferences"],
              ["team", "Organisation team"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              ref={(element) => {
                tabRefs.current[value] = element
              }}
              id={`settings-tab-${value}`}
              type="button"
              role="tab"
              aria-controls={`settings-panel-${value}`}
              aria-selected={view === value}
              tabIndex={view === value ? 0 : -1}
              onClick={() => setView(value)}
              onKeyDown={moveTab}
              className={`min-h-12 shrink-0 border-b-2 px-1 text-sm hover:text-[#174a31] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#07834e] ${
                view === value
                  ? "border-[#07834e] font-semibold text-[#174a31]"
                  : "border-transparent font-medium text-[#526457]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div
        id="settings-panel-preferences"
        role={canManageTeam ? "tabpanel" : undefined}
        aria-labelledby={canManageTeam ? "settings-tab-preferences" : undefined}
        hidden={canManageTeam && view !== "preferences"}
        className="max-w-4xl space-y-5"
      >
        <p className="text-sm leading-6 text-[#617166]">
          Manage your notifications and account security.
        </p>
        <section className="overflow-hidden rounded-2xl border border-[#dfe8e1] bg-white shadow-[0_8px_32px_-24px_rgba(13,61,39,0.32)]">
          <div className="flex items-start gap-3 px-5 pt-5 pb-2 sm:px-7 sm:pt-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf5ee] text-[#23824d]">
              <Bell aria-hidden className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold text-[#2b4032]">Notifications</h2>
              <p className="mt-1 text-sm leading-5 text-[#5e6f63]">
                Your choices are saved on this device.
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
                className="flex min-h-20 cursor-pointer items-center justify-between gap-5 py-4"
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

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e9eeea] px-5 py-5 sm:px-7">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf5ee] text-[#23824d]">
                <KeyRound aria-hidden className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold text-[#2b4032]">
                  Password and security
                </h2>
                <p className="mt-1 text-sm leading-5 text-[#5e6f63]">
                  Update your password to keep your account secure.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPasswordOpen(true)}
              aria-haspopup="dialog"
              className="inline-flex min-h-11 items-center rounded-lg border border-[#cce0d1] px-4 text-sm font-semibold text-[#087d49] transition hover:bg-[#eff7f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#07834e]"
            >
              Change password
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9eeea] bg-[#f8faf8] px-5 py-4 sm:px-7">
            <div className="flex items-center gap-2 text-sm text-[#5e6f63]">
              <LifeBuoy aria-hidden className="size-4 shrink-0" />
              Need help with your account or orders?
            </div>
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#087d49] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#07834e]"
            >
              Contact support <ArrowUpRight aria-hidden className="size-4" />
            </Link>
          </div>
        </section>
      </div>

      {canManageTeam && (
        <div
          id="settings-panel-team"
          role="tabpanel"
          aria-labelledby="settings-tab-team"
          hidden={view !== "team"}
          className="min-w-0"
        >
          <TeamProfiles />
        </div>
      )}
    </div>
  )
}
