"use client"
import {
  ValidatedForm,
  FormSelect,
} from "@/components/shared/form/validated-form"
import { taxAssignmentFormSchema } from "@/lib/form-schemas"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import RecordTable from "@/components/shared/record-table"
import ContentError from "@/components/shared/content-error"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { portalRecords } from "../api/portal"
import {
  getProductResource,
  saveProductResource,
  deleteProductResource,
  type ProductRecord,
  type ProductReadScope,
} from "../api/product-management"
import {
  DeleteProductItem,
  fieldClass,
  FormActions,
  FormCard,
  FormError,
  ProductPanelHeading,
  useProductMutation,
  valueText,
} from "./product-workspace-shared"

export default function ProductTaxAssignments({
  product,
  readScope = "tenant",
  canManage = true,
}: {
  product: string
  readScope?: ProductReadScope
  canManage?: boolean
}) {
  const query = useQuery({
    queryKey: ["managed-product", product, readScope, "taxes"],
    queryFn: () => getProductResource(product, "taxes", readScope),
  })
  const [open, setOpen] = useState(false)
  const [remove, setRemove] = useState<ProductRecord | null>(null)
  const taxes = useQuery({
    queryKey: ["portal", "taxes"],
    queryFn: () => portalRecords("taxes"),
    enabled: open && canManage,
  })
  const mutation = useProductMutation(product)
  const available =
    taxes.data?.records.filter(
      (tax) => !query.data?.some((assigned) => assigned.id === tax.id)
    ) ?? []
  async function submit({ tax }: { tax: string }) {
    if (!canManage) return
    await mutation.run(
      () => saveProductResource(product, "taxes", "POST", { tax }),
      "Tax assigned.",
      () => setOpen(false)
    )
  }
  if (open && canManage)
    return (
      <FormCard
        title="Assign tax"
        description="Choose a tax rate to apply to this product."
      >
        <ValidatedForm
          schema={taxAssignmentFormSchema}
          onSubmit={submit}
          aria-busy={mutation.busy}
        >
          <div className="space-y-5 px-5 py-7 sm:px-7">
            {taxes.isPending ? (
              <TableSkeleton />
            ) : taxes.isError ? (
              <ContentError
                title="We couldn’t load available taxes"
                onRetry={() => taxes.refetch()}
              />
            ) : available.length ? (
              <label className="block space-y-2 text-sm font-medium text-[#414651]">
                <span>Tax rate</span>
                <FormSelect
                  name="tax"
                  className={fieldClass}
                  required
                  defaultValue=""
                  disabled={mutation.busy}
                >
                  <option value="" disabled>
                    Select a tax
                  </option>
                  {available.map((tax) => (
                    <option key={tax.id} value={tax.id}>
                      {valueText(tax.name)} ({valueText(tax.rate)}%)
                    </option>
                  ))}
                </FormSelect>
              </label>
            ) : (
              <p className="text-sm text-[#68776d]">
                No unassigned tax rates are available. Create a rate in Taxes
                first.
              </p>
            )}
            <FormError message={mutation.error} />
          </div>
          <FormActions
            busy={mutation.busy}
            disabled={!available.length || !taxes.isSuccess}
            onCancel={() => setOpen(false)}
            label="Assign tax"
          />
        </ValidatedForm>
      </FormCard>
    )
  return (
    <section>
      <ProductPanelHeading
        action={
          canManage && (
            <Button
              className="rounded-lg text-sm"
              disabled={!query.isSuccess}
              onClick={() => {
                mutation.setError("")
                setOpen(true)
              }}
            >
              <Plus aria-hidden className="size-4" />
              Assign tax
            </Button>
          )
        }
      />
      {query.isPending ? (
        <TableSkeleton />
      ) : query.isError ? (
        <ContentError
          title="We couldn’t load assigned taxes"
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <RecordTable
          records={query.data}
          title="Assigned taxes"
          columns={[
            { key: "name", label: "Tax" },
            { key: "rate", label: "Rate (%)" },
          ]}
          actions={
            canManage
              ? (item) => (
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
                )
              : undefined
          }
        />
      )}
      <DeleteProductItem
        name={valueText(remove?.name, "tax assignment")}
        open={canManage && Boolean(remove)}
        onClose={() => setRemove(null)}
        busy={mutation.busy}
        error={mutation.error}
        onConfirm={() => {
          if (canManage && remove)
            void mutation.run(
              () => deleteProductResource(product, "taxes", remove.id),
              "Tax removed from product.",
              () => setRemove(null)
            )
        }}
      />
    </section>
  )
}
