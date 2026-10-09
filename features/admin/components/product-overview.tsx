"use client"
import {
  ValidatedForm,
  FormInputField,
  FormSelect,
  FormTextarea,
} from "@/components/shared/form/validated-form"
import { productOverviewFormSchema } from "@/lib/form-schemas"
import type { z } from "zod"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { portalRecords } from "../api/portal"
import {
  saveProductOverview,
  type ManagedProduct,
} from "../api/product-management"
import {
  fieldClass,
  FormActions,
  FormCard,
  FormError,
  money,
  useProductMutation,
  valueText,
} from "./product-workspace-shared"

export default function ProductOverview({
  data,
  currency,
}: {
  data: ManagedProduct
  currency: string
}) {
  const [editing, setEditing] = useState(false)
  const product = data.product
  const variant = data.variants.find((item) => item.isDefault === true)
  const mutation = useProductMutation(product.id)
  const categories = useQuery({
    queryKey: ["portal", "categories"],
    queryFn: () => portalRecords("categories"),
    enabled: editing,
  })
  async function submit(values: z.output<typeof productOverviewFormSchema>) {
    await mutation.run(
      () =>
        saveProductOverview(
          product.id,
          {
            name: values.name,
            brand: values.brand,
            category: values.category,
            description: values.description,
            currency,
            price: values.price,
            quantity: values.quantity,
          },
          product.status.toLowerCase() === "draft" ? "draft" : undefined
        ),
      "Product updated.",
      () => setEditing(false)
    )
  }
  if (editing)
    return (
      <FormCard
        title="Edit product"
        description="Update the product’s catalogue information and default variant."
      >
        <ValidatedForm
          schema={productOverviewFormSchema}
          onSubmit={submit}
          aria-busy={mutation.busy}
        >
          <fieldset
            disabled={mutation.busy}
            className="space-y-5 px-5 py-7 sm:px-7"
          >
            <FormInputField
              name="name"
              label="Product name"
              required
              defaultValue={product.name}
            />
            <FormInputField
              name="brand"
              label="Brand (optional)"
              defaultValue={valueText(product.brand)}
            />
            <label className="block space-y-2 text-sm font-medium text-[#414651]">
              <span>Category</span>
              <FormSelect
                className={fieldClass}
                name="category"
                required
                disabled={!categories.isSuccess}
                defaultValue={valueText(
                  product.category,
                  data.category?.id ?? ""
                )}
              >
                <option value="" disabled>
                  {categories.isPending
                    ? "Loading categories…"
                    : "Select a category"}
                </option>
                {categories.data?.records.map((category) => (
                  <option key={category.id} value={category.id}>
                    {valueText(category.categoryPath, valueText(category.name))}
                  </option>
                ))}
              </FormSelect>
            </label>
            {categories.isError && (
              <div role="alert" className="text-sm text-red-700">
                Categories couldn’t be loaded.{" "}
                <button
                  type="button"
                  className="min-h-11 font-medium underline"
                  onClick={() => categories.refetch()}
                >
                  Try again
                </button>
              </div>
            )}
            <label className="block space-y-2 text-sm font-medium text-[#414651]">
              <span>Description</span>
              <FormTextarea
                name="description"
                required
                rows={4}
                defaultValue={valueText(product.description)}
                className="rounded-lg border-[#dce2de] text-base sm:text-sm"
              />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormInputField
                name="price"
                label={`Default price (${currency})`}
                required
                type="number"
                min={0}
                step="any"
                defaultValue={valueText(variant?.price)}
              />
              <FormInputField
                name="quantity"
                label="Default stock quantity"
                required
                type="number"
                min={0}
                step={1}
                defaultValue={valueText(variant?.quantity)}
              />
            </div>
            <FormError message={mutation.error} />
          </fieldset>
          <FormActions
            busy={mutation.busy}
            disabled={!categories.isSuccess}
            onCancel={() => setEditing(false)}
          />
        </ValidatedForm>
      </FormCard>
    )
  return (
    <section className="rounded-xl border border-[#dfe6e2] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8edea] px-5 py-4 sm:px-7">
        <h2 className="text-lg font-semibold text-[#283c30]">
          Product overview
        </h2>
        <Button
          variant="outline"
          className="h-11 rounded-lg text-sm"
          onClick={() => {
            mutation.setError("")
            setEditing(true)
          }}
        >
          <Pencil aria-hidden className="size-4" />
          Edit product
        </Button>
      </div>
      <div className="space-y-7 p-5 sm:p-7">
        <div>
          <h3 className="text-xs font-medium tracking-wide text-[#5e6f63] uppercase">
            Description
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 whitespace-pre-wrap text-[#405448]">
            {valueText(product.description, "No description has been added.")}
          </p>
        </div>
        <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
          {[
            ["Category", data.category?.name ?? "—"],
            ["Brand", valueText(product.brand, "—")],
            ["Default price", money(variant?.price, currency)],
            ["Available stock", valueText(variant?.availableQuantity, "—")],
            ["Variants", String(data.variants.length)],
            ["Default SKU", valueText(variant?.sku, "—")],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-[#5e6f63]">{label}</dt>
              <dd className="mt-2 text-sm font-medium break-words text-[#304638]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
