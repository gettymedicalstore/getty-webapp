"use client"
import { useState } from "react"
import { useController } from "react-hook-form"
import type { z } from "zod"
import { registrationDraftSchema } from "@/lib/form-schemas"
import {
  ValidatedForm,
  FormInputField,
  FormInput,
  FormSelect,
  FieldError,
} from "@/components/shared/form/validated-form"
import Link from "next/link"
import { ArrowLeft, FileText, Info, UploadCloud, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useDeviceStore } from "@/lib/use-device-store"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import PageHeading from "@/components/shared/page-heading"
const empty: Record<string, string> = {}
export default function SupplierRegistration() {
  const { data: session } = useAuthSession(),
    [draft, setDraft] = useDeviceStore(
      `getty-supplier-registration:${session?.user?.id ?? "guest"}`,
      empty
    )
  const [license, setLicense] = useState<File | null>(null),
    [certificate, setCertificate] = useState<File | null>(null)
  const details = draft && typeof draft === "object" ? draft : empty
  function saveDraft(values: z.output<typeof registrationDraftSchema>) {
    const text: Record<string, string> = {}
    for (const [key, value] of Object.entries(values)) {
      if (key === "license" || key === "certificate") continue
      text[key] =
        typeof value === "boolean" ? (value ? "on" : "") : String(value)
    }
    if (setDraft(text))
      toast.success(
        "Draft saved on this device. Documents must be selected again when you return."
      )
  }
  return (
    <div className="max-w-6xl space-y-6">
      <Link
        href="/supplier"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[#627568] hover:text-[#087d49]"
      >
        <ArrowLeft aria-hidden className="size-4" /> Back to dashboard
      </Link>
      <PageHeading
        title="Complete registration"
        description="Add your business details and documents to prepare your vendor account."
      />
      <ValidatedForm
        schema={registrationDraftSchema}
        key={JSON.stringify(details)}
        onSubmit={saveDraft}
        className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]"
      >
        <section className="rounded-2xl border border-[#dfe8e1] bg-white p-5 shadow-[0_8px_32px_-24px_rgba(13,61,39,0.32)] sm:p-7">
          <h2 className="text-base font-semibold text-[#294330]">
            Company details
          </h2>
          <p className="mt-1 text-sm text-[#5e6f63]">
            Tell us about the registered business.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <FormInputField
              name="registrationNumber"
              label="Company registration number"
              placeholder="e.g. RC 123456789"
              defaultValue={details.registrationNumber}
              required
            />
            <div>
              <label
                htmlFor="business-type"
                className="mb-2 block text-sm font-medium text-[#414651]"
              >
                Business type
              </label>
              <div className="relative">
                <FormSelect
                  id="business-type"
                  name="businessType"
                  className="form-input h-13 border-[#dce2de] bg-white text-sm"
                  defaultValue={details.businessType ?? ""}
                  required
                >
                  <option value="">Select business type</option>
                  {[
                    "Manufacturer",
                    "Wholesaler",
                    "Distributor",
                    "Retailer",
                  ].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </FormSelect>
              </div>
            </div>
            <FormInputField
              name="year"
              label="Year of establishment"
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              defaultValue={details.year}
              required
            />
            <FormInputField
              name="website"
              label="Company website (optional)"
              type="url"
              placeholder="https://yourcompany.com"
              defaultValue={details.website}
            />
          </div>
          <h2 className="mt-8 border-t border-[#e8eee9] pt-7 text-base font-semibold text-[#294330]">
            Primary contact
          </h2>
          <p className="mt-1 text-sm text-[#5e6f63]">
            Who should we contact about your account?
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <FormInputField
              name="contactName"
              label="Primary contact name"
              containerClassName="sm:col-span-2"
              defaultValue={details.contactName}
              required
            />
            <FormInputField
              name="email"
              label="Email address"
              type="email"
              defaultValue={details.email ?? session?.user?.email}
              required
            />
            <FormInputField
              name="phone"
              label="Phone number"
              type="tel"
              minLength={10}
              defaultValue={details.phone ?? session?.user?.phone}
              required
            />
          </div>
          <h2 className="mt-8 border-t border-[#e8eee9] pt-7 text-base font-semibold text-[#294330]">
            Product information
          </h2>
          <p className="mt-1 text-sm text-[#5e6f63]">
            Help us understand the supplies you offer.
          </p>
          <div className="mt-5 space-y-5">
            <div className="space-y-2">
              <label
                className="block text-sm font-medium text-[#414651]"
                htmlFor="supply-type"
              >
                Type of medical supplies
              </label>
              <div className="relative">
                <FormSelect
                  id="supply-type"
                  name="supplyType"
                  className="form-input h-13 border-[#dce2de] bg-white text-sm"
                  defaultValue={details.supplyType ?? ""}
                  required
                >
                  <option value="">Select medical supplies type</option>
                  {[
                    "Pharmaceuticals",
                    "Surgical equipment",
                    "Medical consumables",
                    "Diagnostic equipment",
                    "Hospital equipment",
                    "Other",
                  ].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </FormSelect>
              </div>
            </div>
            <FormInputField
              name="capacity"
              label="Estimated inventory capacity"
              type="number"
              min="1"
              defaultValue={details.capacity}
              required
            />
            <FormInputField
              name="brands"
              label="Brands you supply (optional)"
              defaultValue={details.brands}
            />
            <label className="flex items-start gap-3 rounded-xl border border-[#e7eee8] bg-[#fbfcfb] px-4 py-3 text-sm leading-6 text-[#45584a]">
              <FormInput
                type="checkbox"
                name="genuine"
                required
                defaultChecked={details.genuine === "on"}
                className="accent-primary mt-1 size-5 shrink-0"
              />
              <span>
                I confirm that all products are genuine and compliant.
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-[#e7eee8] bg-[#fbfcfb] px-4 py-3 text-sm leading-6 text-[#45584a]">
              <FormInput
                type="checkbox"
                name="terms"
                required
                defaultChecked={details.terms === "on"}
                className="accent-primary mt-1 size-5 shrink-0"
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="text-primary underline">
                  terms and conditions
                </Link>
                .
              </span>
            </label>
          </div>
        </section>
        <section className="space-y-5 rounded-2xl border border-[#dfe8e1] bg-white p-5 shadow-[0_8px_32px_-24px_rgba(13,61,39,0.32)] sm:p-7">
          <div>
            <h2 className="text-base font-semibold text-[#294330]">
              Company documents
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#5e6f63]">
              Select PDF or image files. Each file can be up to 5 MB.
            </p>
          </div>
          <RegistrationDocument
            name="license"
            title="Regulatory license"
            initialFile={license}
            onSelect={setLicense}
          />
          <RegistrationDocument
            name="certificate"
            title="CAC certificate (optional)"
            initialFile={certificate}
            onSelect={setCertificate}
          />
          <div
            role="status"
            className="flex gap-3 rounded-xl border border-[#eddfbd] bg-[#fffaf0] p-4 text-sm leading-6 text-[#765923]"
          >
            <Info aria-hidden className="mt-0.5 size-5 shrink-0" />
            <p>
              Online submission is not available yet. Save your details on this
              device, then{" "}
              <Link
                href="/contact"
                className="font-semibold underline underline-offset-2"
              >
                contact support
              </Link>{" "}
              to complete registration. Documents must be selected again when
              you return.
            </p>
          </div>
        </section>
        <div className="flex flex-col-reverse gap-3 rounded-2xl border border-[#dfe8e1] bg-white p-4 sm:flex-row sm:items-center sm:justify-end xl:col-span-2">
          <Link
            href="/supplier"
            className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-[#617267] hover:bg-[#f3f7f3]"
          >
            Cancel
          </Link>
          <Button type="submit" className="h-11 px-6">
            Save draft
          </Button>
        </div>
      </ValidatedForm>
    </div>
  )
}

function RegistrationDocument({
  name,
  title,
  initialFile,
  onSelect,
}: {
  name: "license" | "certificate"
  title: string
  initialFile: File | null
  onSelect: (file: File | null) => void
}) {
  const { field, fieldState } = useController({
    name,
    defaultValue: initialFile,
  })
  const file = field.value as File | null
  function select(next: File | null) {
    field.onChange(next)
    onSelect(next)
  }
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[#414651]">{title}</p>
      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          select(event.dataTransfer.files[0] ?? null)
        }}
        className="flex min-h-39 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#cbdccf] bg-[#fafcf9] px-4 text-center transition focus-within:ring-2 focus-within:ring-[#15814c] hover:border-[#81b590] hover:bg-[#f4faf5]"
      >
        <span className="grid size-10 place-items-center rounded-xl bg-[#ecf5ee] text-[#25834f]">
          <UploadCloud aria-hidden className="size-5" />
        </span>
        <span className="mt-3 text-sm font-semibold text-[#2d4534]">
          Choose a file{" "}
          <span className="font-normal text-[#5e6f63]">or drag it here</span>
        </span>
        <span className="mt-1 text-xs text-[#5e6f63]">PDF, PNG or JPG</span>
        <input
          ref={(element) => field.ref(element)}
          name={name}
          className="sr-only"
          type="file"
          aria-label={title}
          aria-invalid={Boolean(fieldState.error)}
          accept="application/pdf,image/png,image/jpeg"
          onBlur={field.onBlur}
          onChange={(event) => {
            select(event.target.files?.[0] ?? null)
            event.target.value = ""
          }}
        />
      </label>
      <FieldError message={fieldState.error?.message} />
      {file && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-[#dbe9df] bg-[#f7fbf7] px-3 py-1.5 text-sm">
          <span className="flex min-w-0 items-center gap-2 text-[#3b5842]">
            <FileText aria-hidden className="size-4 shrink-0" />
            <span className="min-w-0 truncate">{file.name}</span>
          </span>
          <button
            type="button"
            className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-[#eaf2eb]"
            aria-label={`Remove ${title}`}
            onClick={() => select(null)}
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
