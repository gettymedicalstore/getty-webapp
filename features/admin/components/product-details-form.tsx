"use client"
import {
  ValidatedForm,
  FormInputField,
  FormSelect,
  FormTextarea,
} from "@/components/shared/form/validated-form"
import { productDetailsFormSchema } from "@/lib/form-schemas"
import type { z } from "zod"
import type { ReactNode } from "react"

import { useQuery } from "@tanstack/react-query"
import ContentError from "@/components/shared/content-error"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import {
  getProductResource,
  saveProductResource,
} from "../api/product-management"
import {
  FormActions,
  ProductPanelHeading,
  FormError,
  useProductMutation,
  valueText,
} from "./product-workspace-shared"

const shortFields = [
  {
    key: "manufacturer",
    label: "Manufacturer",
    placeholder: "Manufacturer name",
  },
  { key: "model", label: "Model", placeholder: "Model name or number" },
  {
    key: "origin",
    label: "Country of origin",
    placeholder: "Country where it was made",
  },
]
const longFields = [
  {
    key: "usage",
    label: "Intended use",
    placeholder: "Describe what this product is designed for.",
  },
  {
    key: "instructions",
    label: "Instructions",
    placeholder: "Include setup, use and cleaning instructions.",
  },
  {
    key: "warnings",
    label: "Warnings",
    placeholder: "List precautions, restrictions and safety information.",
  },
]
const booleanFields = [
  { key: "sterile", label: "Sterile" },
  { key: "disposable", label: "Disposable" },
  { key: "coldchain", label: "Requires cold storage" },
]
const numberFields = [
  { key: "shelflife", label: "Shelf life" },
  { key: "warranty", label: "Warranty" },
  { key: "dispatch", label: "Dispatch time" },
]

export default function ProductDetailsForm({ product }: { product: string }) {
  const query = useQuery({
    queryKey: ["managed-product", product, "detail"],
    queryFn: () => getProductResource(product, "detail"),
  })
  const mutation = useProductMutation(product)
  if (query.isPending) return <TableSkeleton />
  if (query.isError)
    return (
      <ContentError
        title="We couldn’t load product details"
        onRetry={() => query.refetch()}
        retrying={query.isFetching}
      />
    )
  const data = query.data
  async function submit(values: z.output<typeof productDetailsFormSchema>) {
    const fields: Record<string, unknown> = { ...values }
    for (const field of [...shortFields, ...longFields])
      fields[field.key] = values[field.key as keyof typeof values] || null
    for (const field of booleanFields)
      fields[field.key] =
        values[field.key as keyof typeof values] === ""
          ? null
          : values[field.key as keyof typeof values] === "true"
    await mutation.run(
      () =>
        saveProductResource(product, "detail", data ? "PATCH" : "POST", fields),
      "Product details saved."
    )
  }
  return (
    <div className="w-full max-w-5xl">
      <ProductPanelHeading
        title="Product details"
        description="Add manufacturer information, usage guidance and care requirements."
      />
      <ValidatedForm
        schema={productDetailsFormSchema}
        onSubmit={submit}
        aria-busy={mutation.busy}
        className="overflow-hidden rounded-xl border border-[#dfe6e2] bg-white shadow-[0_2px_8px_rgba(30,50,35,.025)]"
      >
        <fieldset
          disabled={mutation.busy}
          className="min-w-0 divide-y divide-[#e7ece9]"
        >
          <DetailsSection
            title="Product information"
            description="Identify the manufacturer and product model."
          >
            <div className="grid gap-5 md:grid-cols-3">
              {shortFields.map((field) => (
                <FormInputField
                  key={field.key}
                  name={field.key}
                  label={field.label}
                  placeholder={field.placeholder}
                  defaultValue={valueText(data?.[field.key])}
                  containerClassName="min-w-0"
                />
              ))}
            </div>
          </DetailsSection>
          <DetailsSection
            title="Usage and safety"
            description="Use the manufacturer’s guidance to help customers use this product safely."
          >
            <div className="grid gap-5 md:grid-cols-2">
              {longFields.map((field) => (
                <label
                  key={field.key}
                  className={`block min-w-0 space-y-2 text-sm font-medium text-[#414651] ${field.key === "usage" ? "md:col-span-2" : ""}`}
                >
                  <span>{field.label}</span>
                  <FormTextarea
                    name={field.key}
                    defaultValue={valueText(data?.[field.key])}
                    placeholder={field.placeholder}
                    rows={field.key === "usage" ? 3 : 4}
                    className="block min-h-28 w-full resize-y rounded-lg border border-[#dce2de] bg-white px-3.5 py-3 text-base leading-6 font-normal text-[#34453a] transition-[border-color,box-shadow] outline-none placeholder:text-[#8b938e] hover:border-[#bac7be] focus-visible:border-[#1b5944] focus-visible:ring-3 focus-visible:ring-[#1b5944]/10 disabled:opacity-50 aria-invalid:border-red-500 sm:text-sm"
                  />
                </label>
              ))}
            </div>
          </DetailsSection>
          <DetailsSection
            title="Care and handling"
            description="Specify storage requirements, product lifespan and dispatch time."
          >
            <div className="grid gap-x-5 gap-y-6 md:grid-cols-3">
              {booleanFields.map((field) => (
                <label
                  key={field.key}
                  className="block min-w-0 space-y-2 text-sm font-medium text-[#414651]"
                >
                  <span>{field.label}</span>
                  <span className="relative block">
                    <FormSelect
                      name={field.key}
                      className="h-13 w-full rounded-lg border border-[#dce2de] bg-white pl-3.5 text-base font-normal text-[#34453a] transition-[border-color,box-shadow] outline-none hover:border-[#bac7be] focus-visible:border-[#1b5944] focus-visible:ring-3 focus-visible:ring-[#1b5944]/10 disabled:opacity-50 aria-invalid:border-red-500 sm:text-sm"
                      defaultValue={
                        typeof data?.[field.key] === "boolean"
                          ? String(data[field.key])
                          : ""
                      }
                    >
                      <option value="">Not specified</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </FormSelect>
                  </span>
                </label>
              ))}
              {numberFields.map((field) => (
                <FormInputField
                  key={field.key}
                  name={field.key}
                  label={field.label}
                  type="number"
                  min={0}
                  placeholder="Not specified"
                  defaultValue={valueText(data?.[field.key])}
                  containerClassName="min-w-0"
                />
              ))}
            </div>
          </DetailsSection>
          {mutation.error && (
            <div className="px-5 py-5 sm:px-7">
              <FormError message={mutation.error} />
            </div>
          )}
        </fieldset>
        <FormActions busy={mutation.busy} />
      </ValidatedForm>
    </div>
  )
}

function DetailsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="px-5 py-6 sm:px-7 sm:py-7">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-[#2b4032]">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-[#5e6f63]">{description}</p>
      </div>
      {children}
    </section>
  )
}
