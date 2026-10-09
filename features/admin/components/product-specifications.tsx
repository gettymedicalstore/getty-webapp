"use client"
import {
  ValidatedForm,
  FormInputField,
} from "@/components/shared/form/validated-form"
import { specificationFormSchema } from "@/lib/form-schemas"
import type { z } from "zod"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Pencil, Plus, Trash2 } from "lucide-react"
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
  ProductPanelHeading,
  useProductMutation,
  valueText,
} from "./product-workspace-shared"

export default function ProductSpecifications({
  product,
}: {
  product: string
}) {
  const query = useQuery({
    queryKey: ["managed-product", product, "specifications"],
    queryFn: () => getProductResource(product, "specifications"),
  })
  const mutation = useProductMutation(product)
  const [editor, setEditor] = useState<{ record: ProductRecord | null } | null>(
    null
  )
  const [remove, setRemove] = useState<ProductRecord | null>(null)
  const record = editor?.record
  async function submit(values: z.output<typeof specificationFormSchema>) {
    await mutation.run(
      () =>
        saveProductResource(
          product,
          "specifications",
          record ? "PATCH" : "POST",
          {
            ...(record ? { id: record.id } : {}),
            name: values.name,
            value: values.value,
            unit: values.unit || null,
            ordinal: values.ordinal,
          }
        ),
      record ? "Specification updated." : "Specification added.",
      () => setEditor(null)
    )
  }
  if (editor)
    return (
      <FormCard
        title={record ? "Edit specification" : "Add specification"}
        description="Add a product-wide attribute, such as material or capacity."
      >
        <ValidatedForm
          schema={specificationFormSchema}
          onSubmit={submit}
          aria-busy={mutation.busy}
        >
          <fieldset
            disabled={mutation.busy}
            className="space-y-6 px-5 py-7 sm:px-7"
          >
            <FormInputField
              name="name"
              label="Specification name"
              hint="A short, descriptive name for this specification."
              placeholder="e.g. Material"
              required
              defaultValue={valueText(record?.name)}
            />
            <FormInputField
              name="value"
              label="Value"
              hint="The value for this specification."
              placeholder="e.g. Nitrile"
              required
              defaultValue={valueText(record?.value)}
            />
            <div className="grid gap-6 sm:grid-cols-2">
              <FormInputField
                name="unit"
                label="Unit (optional)"
                hint="For measurements, such as mL, cm or kg."
                placeholder="e.g. mL"
                defaultValue={valueText(record?.unit)}
              />
              <FormInputField
                name="ordinal"
                label="Display order"
                hint="Lower numbers appear first."
                type="number"
                min={0}
                step={1}
                required
                defaultValue={valueText(record?.ordinal, "0")}
              />
            </div>
            <FormError message={mutation.error} />
          </fieldset>
          <FormActions
            busy={mutation.busy}
            onCancel={() => setEditor(null)}
            label={record ? "Save changes" : "Add specification"}
          />
        </ValidatedForm>
      </FormCard>
    )
  return (
    <section>
      <ProductPanelHeading
        title="Specifications"
        description="Product attributes that help customers choose the right supplies."
        action={
          <Button
            className="rounded-lg text-sm"
            onClick={() => {
              mutation.setError("")
              setEditor({ record: null })
            }}
          >
            <Plus aria-hidden className="size-4" />
            Add specification
          </Button>
        }
      />
      {query.isPending ? (
        <TableSkeleton />
      ) : query.isError ? (
        <ContentError
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
          title="We couldn’t load specifications"
        />
      ) : (
        <RecordTable
          records={[...query.data].sort(
            (a, b) => Number(a.ordinal ?? 0) - Number(b.ordinal ?? 0)
          )}
          title="Specifications"
          columns={[
            { key: "name", label: "Name" },
            { key: "value", label: "Value" },
            { key: "unit", label: "Unit" },
            { key: "ordinal", label: "Order" },
          ]}
          actions={(item) => (
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Edit ${item.name}`}
                onClick={() => {
                  mutation.setError("")
                  setEditor({ record: item })
                }}
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
        name={valueText(remove?.name, "specification")}
        open={Boolean(remove)}
        onClose={() => setRemove(null)}
        busy={mutation.busy}
        error={mutation.error}
        onConfirm={() => {
          if (remove)
            void mutation.run(
              () => deleteProductResource(product, "specifications", remove.id),
              "Specification removed.",
              () => setRemove(null)
            )
        }}
      />
    </section>
  )
}
