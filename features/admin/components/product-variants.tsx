"use client"
import {
  ValidatedForm,
  FormInputField,
  FormInput,
} from "@/components/shared/form/validated-form"
import { variantFormSchema } from "@/lib/form-schemas"
import type { z } from "zod"
import { useFieldArray, useFormContext } from "react-hook-form"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import RecordTable from "@/components/shared/record-table"
import ContentError from "@/components/shared/content-error"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import {
  getProductResource,
  saveProductResource,
  deleteProductResource,
  type ProductRecord,
} from "../api/product-management"
import {
  DeleteProductItem,
  FormActions,
  FormCard,
  FormError,
  money,
  ProductPanelHeading,
  useProductMutation,
  valueText,
} from "./product-workspace-shared"

export default function ProductVariants({
  product,
  currency,
}: {
  product: string
  currency: string
}) {
  const query = useQuery({
    queryKey: ["managed-product", product, "variants"],
    queryFn: () => getProductResource(product, "variants"),
  })
  const mutation = useProductMutation(product)
  const [editor, setEditor] = useState<{ record: ProductRecord | null } | null>(
    null
  )
  const [remove, setRemove] = useState<ProductRecord | null>(null)
  const record = editor?.record
  function edit(record: ProductRecord | null) {
    mutation.setError("")
    setEditor({ record })
  }
  async function submit(values: z.output<typeof variantFormSchema>) {
    await mutation.run(
      () =>
        saveProductResource(product, "variants", record ? "PATCH" : "POST", {
          ...(record
            ? {
                id: record.id,
                barcode: values.barcode || null,
                weightKg: values.weightKg,
                lengthCm: values.lengthCm,
                widthCm: values.widthCm,
                heightCm: values.heightCm,
              }
            : {}),
          name: values.name,
          sku: values.sku,
          price: values.price,
          saleUnit: values.saleUnit,
          unitsPerPack: values.unitsPerPack,
          minimumOrderQuantity: values.minimumOrderQuantity,
          isDefault: values.isDefault,
          active: values.active,
          options: Object.fromEntries(
            values.options.map((option) => [option.name, option.value])
          ),
        }),
      record ? "Variant updated." : "Variant added.",
      () => setEditor(null)
    )
  }
  if (editor)
    return (
      <FormCard
        title={record ? "Edit variant" : "Add variant"}
        description="Set the size, packaging and price for a version of this product."
      >
        <ValidatedForm
          schema={variantFormSchema}
          defaultValues={{
            options:
              record?.options && typeof record.options === "object"
                ? Object.entries(record.options).map(([name, value]) => ({
                    name,
                    value: valueText(value),
                  }))
                : [],
          }}
          onSubmit={submit}
          aria-busy={mutation.busy}
        >
          <fieldset
            disabled={mutation.busy}
            className="space-y-6 px-5 py-7 sm:px-7"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FormInputField
                name="name"
                label="Variant name"
                placeholder="e.g. Medium — Box of 100"
                required
                defaultValue={valueText(record?.name)}
              />
              <FormInputField
                name="sku"
                label="SKU"
                placeholder="e.g. NITRILE-M-100"
                required
                defaultValue={valueText(record?.sku)}
              />
              <FormInputField
                name="price"
                label={`Price (${currency})`}
                type="number"
                min={0}
                step="any"
                required
                defaultValue={valueText(record?.price)}
              />
              <FormInputField
                name="saleUnit"
                label="Sale unit"
                placeholder="e.g. box"
                required
                defaultValue={valueText(record?.saleUnit, "piece")}
              />
              <FormInputField
                name="unitsPerPack"
                label="Units per pack"
                type="number"
                min={1}
                step={1}
                required
                defaultValue={valueText(record?.unitsPerPack, "1")}
              />
              <FormInputField
                name="minimumOrderQuantity"
                label="Minimum order quantity"
                type="number"
                min={1}
                step={1}
                required
                defaultValue={valueText(record?.minimumOrderQuantity, "1")}
              />
            </div>
            <VariantOptions />
            {record && (
              <div className="grid gap-5 sm:grid-cols-2">
                <FormInputField
                  name="barcode"
                  label="Barcode (optional)"
                  defaultValue={valueText(record.barcode)}
                />
                {[
                  { key: "weightKg", label: "Weight (kg)" },
                  { key: "lengthCm", label: "Length (cm)" },
                  { key: "widthCm", label: "Width (cm)" },
                  { key: "heightCm", label: "Height (cm)" },
                ].map((field) => (
                  <FormInputField
                    key={field.key}
                    name={field.key}
                    label={field.label}
                    type="number"
                    min={0}
                    step="any"
                    defaultValue={valueText(record[field.key])}
                  />
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-x-7 gap-y-3">
              {[
                {
                  key: "active",
                  label: "Available for sale",
                  checked: record ? record.active === true : true,
                },
                {
                  key: "isDefault",
                  label: "Default variant",
                  checked: record?.isDefault === true,
                },
              ].map((field) => (
                <label
                  key={field.key}
                  className="flex min-h-11 items-center gap-3 text-sm text-[#3b5043]"
                >
                  <FormInput
                    type="checkbox"
                    name={field.key}
                    defaultChecked={field.checked}
                    className="size-5 accent-[#087f52]"
                  />
                  {field.label}
                </label>
              ))}
            </div>
            <FormError message={mutation.error} />
          </fieldset>
          <FormActions
            busy={mutation.busy}
            onCancel={() => setEditor(null)}
            label={record ? "Save changes" : "Add variant"}
          />
        </ValidatedForm>
      </FormCard>
    )
  return (
    <section>
      <ProductPanelHeading
        title="Variants"
        description="Manage packaging, options and prices. Stock adjustments are available in Inventory."
        action={
          <Button className="rounded-lg text-sm" onClick={() => edit(null)}>
            <Plus aria-hidden className="size-4" />
            Add variant
          </Button>
        }
      />
      {query.isPending ? (
        <TableSkeleton />
      ) : query.isError ? (
        <ContentError
          title="We couldn’t load variants"
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <RecordTable
          records={query.data.map((item) => ({
            ...item,
            priceLabel: money(item.price, currency),
            status: item.active ? "Active" : "Inactive",
            defaultLabel: item.isDefault ? "Default" : "—",
          }))}
          title="Variants"
          columns={[
            { key: "name", label: "Variant" },
            { key: "sku", label: "SKU" },
            { key: "priceLabel", label: "Price" },
            { key: "availableQuantity", label: "Available stock" },
            { key: "defaultLabel", label: "Default" },
            { key: "status", label: "Status" },
          ]}
          actions={(item) => (
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Edit ${item.name}`}
                onClick={() => edit(item)}
              >
                <Pencil aria-hidden className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remove ${item.name}`}
                onClick={() => {
                  mutation.setError("")
                  setRemove(item)
                }}
              >
                <Trash2 aria-hidden className="size-4" />
              </Button>
            </div>
          )}
        />
      )}
      <DeleteProductItem
        name={valueText(remove?.name, "variant")}
        open={Boolean(remove)}
        onClose={() => setRemove(null)}
        busy={mutation.busy}
        error={mutation.error}
        onConfirm={() => {
          if (remove)
            void mutation.run(
              () => deleteProductResource(product, "variants", remove.id),
              "Variant removed.",
              () => setRemove(null)
            )
        }}
      />
    </section>
  )
}

function VariantOptions() {
  const { control } = useFormContext<z.input<typeof variantFormSchema>>()
  const { fields, append, remove } = useFieldArray({ control, name: "options" })
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-[#414651]">Options</p>
      {fields.map((option, index) => (
        <div key={option.id} className="flex items-start gap-2">
          <FormInputField
            name={`options.${index}.name`}
            label={`Option ${index + 1}`}
            placeholder="e.g. Size"
            required
          />
          <FormInputField
            name={`options.${index}.value`}
            label="Value"
            placeholder="e.g. Medium"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-7"
            aria-label={`Remove option ${index + 1}`}
            onClick={() => remove(index)}
          >
            <X aria-hidden className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="rounded-lg text-sm"
        onClick={() => append({ name: "", value: "" })}
      >
        <Plus aria-hidden className="size-4" />
        Add option
      </Button>
    </div>
  )
}
