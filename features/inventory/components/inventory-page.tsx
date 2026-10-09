"use client"
import {
  ValidatedForm,
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/shared/form/validated-form"
import {
  stockFormSchema,
  thresholdFormSchema,
  inventoryFilterSchema,
} from "@/lib/form-schemas"
import { useFormContext } from "react-hook-form"

import { TableSkeleton } from "@/components/shared/loading-skeletons"
import ContentError from "@/components/shared/content-error"
import { useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Menu } from "@base-ui/react/menu"
import {
  ArrowDownUp,
  ChevronDown,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import { toast } from "sonner"
import PageHeading from "@/components/shared/page-heading"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { inventoryRequest as apiRequest } from "../api/inventory"
import {
  StockInputSchema,
  ThresholdInputSchema,
  type InventoryVariant,
  type InventoryPage,
  type StockPage,
} from "@/lib/api/getty-contract"
type Selection = { variant: InventoryVariant; kind: "stock" | "threshold" }
export default function InventoryPageContent() {
  const dialogReturnFocus = useRef<HTMLButtonElement | null>(null)
  const client = useQueryClient(),
    [tab, setTab] = useState<"variants" | "stocks">("variants"),
    [filter, setFilter] = useState<{
      search: string
      status: "" | "in" | "low" | "out"
    }>({ search: "", status: "" }),
    [page, setPage] = useState({ cursor: 0, navigation: "next" }),
    [selection, setSelection] = useState<Selection | null>(null),
    [adjustmentType, setAdjustmentType] = useState<
      "correction" | "receipt" | "removal"
    >("correction"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState<{
      fingerprint: string
      request: string
    } | null>(null)
  const query = new URLSearchParams({
    cursor: String(page.cursor),
    navigation: page.navigation,
    limit: "20",
  })
  if (tab === "variants") {
    if (filter.search) query.set("search", filter.search)
    if (filter.status) query.set("status", filter.status)
  }
  const variants = useQuery({
    queryKey: ["inventory", "variants", page, filter],
    enabled: tab === "variants",
    queryFn: () =>
      apiRequest<InventoryPage>(`/getty/v1/inventory/variants?${query}`),
  })
  const stocks = useQuery({
    queryKey: ["inventory", "stocks", page],
    enabled: tab === "stocks",
    queryFn: () => apiRequest<StockPage>(`/getty/v1/inventory/stocks?${query}`),
  })
  const current = tab === "variants" ? variants : stocks
  function open(
    variant: InventoryVariant,
    kind: Selection["kind"],
    trigger: HTMLButtonElement | null
  ) {
    dialogReturnFocus.current = trigger
    setSelection({ variant, kind })
    setAdjustmentType("correction")
    setError("")
    setRetry(null)
  }
  async function submit(values: Record<string, unknown>) {
    if (!selection || busy) return
    const { variant, kind } = selection
    const fields =
      kind === "stock"
        ? {
            product: variant.product,
            variant: variant.id,
            type: String(values.type),
            quantity:
              Number(values.quantity) +
              (values.type === "correction" ? variant.reserved : 0),
            reason: String(values.reason ?? "").trim() || null,
          }
        : {
            product: variant.product,
            variant: variant.id,
            threshold: Number(values.threshold),
          }
    const fingerprint = JSON.stringify(fields)
    const request =
      retry?.fingerprint === fingerprint ? retry.request : crypto.randomUUID()
    const parsed = (
      kind === "stock" ? StockInputSchema : ThresholdInputSchema
    ).safeParse({ ...fields, request })
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? "Check the adjustment details."
      )
      return
    }
    // Keep the same request ID and body after any uncertain network/server outcome.
    if (kind === "stock") setRetry({ fingerprint, request })
    setBusy(true)
    setError("")
    try {
      await apiRequest(
        `/getty/v1/inventory/${kind === "stock" ? "stocks" : "threshold"}`,
        {
          method: kind === "stock" ? "POST" : "PATCH",
          body: JSON.stringify(parsed.data),
        }
      )
      toast.success(
        kind === "stock"
          ? "Stock adjustment saved."
          : "Low-stock threshold saved."
      )
      setSelection(null)
      setRetry(null)
      await client.invalidateQueries({ queryKey: ["inventory"] })
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to save. Retry the same adjustment."
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="min-w-0 space-y-5">
      <PageHeading
        title="Inventory"
        description="Manage stock in sale units and packs. Reserved stock remains held for checkout."
      />
      <section
        className="min-w-0 overflow-hidden rounded-xl border border-[#e2e8e3] bg-white shadow-[0_2px_8px_rgba(25,45,32,.035)]"
        aria-label="Inventory records"
      >
        <div className="flex gap-6 border-b border-[#e9edea] px-5 sm:gap-8">
          {(["variants", "stocks"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              className={`min-h-14 border-b-2 pt-0.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1b5442] ${tab === t ? "border-[#0b6146] text-[#174d3b]" : "border-transparent text-[#5e6f63] hover:text-[#294b38]"}`}
              onClick={() => {
                setTab(t)
                setPage({ cursor: 0, navigation: "next" })
              }}
            >
              {t === "variants" ? "Stock balances" : "Movement history"}
            </button>
          ))}
        </div>
        {tab === "variants" && (
          <ValidatedForm
            schema={inventoryFilterSchema}
            autoSubmit={300}
            defaultValues={filter}
            onSubmit={(values) => {
              setFilter(values)
              setPage({ cursor: 0, navigation: "next" })
            }}
            className="flex flex-col gap-3 border-b border-[#e9edea] px-4 py-4 sm:px-5 md:flex-row md:flex-wrap md:items-center"
          >
            <div className="relative w-full md:w-80">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#809087]"
              />
              <FormInput
                name="search"
                aria-label="Search products or SKU"
                className="h-11 w-full rounded-lg border border-[#dfe7e1] bg-white pr-3 pl-10 text-base text-[#263e30] outline-none placeholder:text-[#8b988f] focus-visible:border-[#1b5442] focus-visible:ring-2 focus-visible:ring-[#d7e8dc] sm:text-sm"
                placeholder="Search product or SKU…"
                maxLength={200}
              />
            </div>
            <div className="relative w-full md:w-44">
              <FormSelect
                name="status"
                className="h-11 w-full appearance-none rounded-lg border border-[#dfe7e1] bg-white pr-10 pl-3 text-base text-[#263e30] outline-none focus-visible:border-[#1b5442] focus-visible:ring-2 focus-visible:ring-[#d7e8dc] sm:text-sm"
                aria-label="Stock status"
              >
                <option value="">All stock</option>
                <option value="in">In stock</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
              </FormSelect>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-[#718178]"
              />
            </div>
          </ValidatedForm>
        )}
        {current.isPending ? (
          <div className="p-5">
            <TableSkeleton />
          </div>
        ) : current.isError ? (
          <div className="p-5">
            <ContentError
              title="Inventory is temporarily unavailable"
              onRetry={() => void current.refetch()}
            />
          </div>
        ) : (
          <>
            <div
              className="overflow-x-auto overscroll-x-contain"
              role="region"
              aria-label={`${tab === "variants" ? "Stock balances" : "Movement history"} table`}
              tabIndex={0}
            >
              <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                <caption className="sr-only">
                  {tab === "variants" ? "Stock balances" : "Movement history"}
                </caption>
                <thead className="bg-[#f8faf9] text-xs text-[#5e6f63]">
                  <tr>
                    {(tab === "variants"
                      ? [
                          "Product / option",
                          "SKU / pack",
                          "On hand",
                          "Reserved",
                          "Available",
                          "Threshold",
                          "Status",
                          "Actions",
                        ]
                      : [
                          "Date",
                          "Product / option",
                          "Type",
                          "Change",
                          "Reserved change",
                          "Balance / held",
                          "Reason",
                        ]
                    ).map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="border-b border-[#e9edea] px-5 py-3.5 font-medium whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tab === "variants"
                    ? variants.data?.records.map((v) => (
                        <tr
                          key={v.id}
                          className="transition-colors hover:bg-[#fafcf9]"
                        >
                          <td className="border-b border-[#eff2ef] px-5 py-4">
                            <p className="font-medium text-[#293c30]">
                              {v.productName}
                            </p>
                            <p className="mt-1 text-xs text-[#738177]">
                              {v.name} · {v.productStatus}
                              {v.active ? "" : " · disabled"}
                            </p>
                          </td>
                          <td className="max-w-60 border-b border-[#eff2ef] px-5 py-4 text-[#526357]">
                            <span className="break-all">{v.sku}</span>
                            <p className="mt-1 text-xs text-[#738177]">
                              {v.saleUnit} · {v.unitsPerPack} per pack
                            </p>
                          </td>
                          <td className="border-b border-[#eff2ef] px-5 py-4 text-[#526357] tabular-nums">
                            {v.quantity}
                          </td>
                          <td className="border-b border-[#eff2ef] px-5 py-4 text-[#526357] tabular-nums">
                            {v.reserved}
                          </td>
                          <td className="border-b border-[#eff2ef] px-5 py-4 font-medium text-[#293c30] tabular-nums">
                            {v.availableQuantity}
                          </td>
                          <td className="border-b border-[#eff2ef] px-5 py-4 text-[#526357] tabular-nums">
                            {v.threshold}
                          </td>
                          <td className="border-b border-[#eff2ef] px-5 py-4">
                            <StockStatus value={v.stockStatus} />
                          </td>
                          <td className="border-b border-[#eff2ef] px-5 py-4 text-center">
                            <InventoryRowActions
                              name={v.productName}
                              dialogOpen={Boolean(selection)}
                              onAction={(kind, trigger) =>
                                open(v, kind, trigger)
                              }
                            />
                          </td>
                        </tr>
                      ))
                    : stocks.data?.records.map((m) => (
                        <tr
                          key={m.id}
                          className="transition-colors hover:bg-[#fafcf9] [&>td]:border-b [&>td]:border-[#eff2ef] [&>td]:px-5 [&>td]:py-4 [&>td]:text-[#526357]"
                        >
                          <td>{new Date(m.entry).toLocaleString("en-NG")}</td>
                          <td>
                            {m.productName}
                            <p className="mt-1 text-xs text-[#738177]">
                              {m.variantName} · {m.sku}
                            </p>
                          </td>
                          <td className="capitalize">{m.type}</td>
                          <td>
                            {m.quantity > 0 ? "+" : ""}
                            {m.quantity}
                          </td>
                          <td>{m.reserved}</td>
                          <td>
                            {m.balance} / {m.held}
                          </td>
                          <td className="max-w-xs break-words">
                            {m.reason ?? "—"}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
            {current.data.records.length === 0 && (
              <p className="px-5 py-12 text-center text-sm text-[#68776d]">
                No inventory records match these filters.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9edea] px-4 py-3 sm:px-5">
              <p className="text-xs text-[#68776d]">
                {tab === "variants" ? "Stock balances" : "Movements"} ·{" "}
                {current.data.records.length} on this page
              </p>
              <div className="flex gap-2">
                <button
                  disabled={!current.data.isPrevious}
                  className="min-h-11 rounded-lg border border-[#dfe7e1] px-4 py-2 text-sm font-medium text-[#334a39] hover:bg-[#f3f8f4] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() =>
                    setPage({
                      cursor: current.data.previousCursor,
                      navigation: "previous",
                    })
                  }
                >
                  Previous
                </button>
                <button
                  disabled={!current.data.isNext}
                  className="min-h-11 rounded-lg border border-[#dfe7e1] px-4 py-2 text-sm font-medium text-[#334a39] hover:bg-[#f3f8f4] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() =>
                    setPage({
                      cursor: current.data.nextCursor,
                      navigation: "next",
                    })
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
      <Dialog
        open={Boolean(selection)}
        onOpenChange={(open) => {
          if (!open && !busy) setSelection(null)
        }}
      >
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto"
          finalFocus={() =>
            dialogReturnFocus.current?.isConnected
              ? dialogReturnFocus.current
              : null
          }
        >
          <DialogTitle>
            {selection?.kind === "stock"
              ? "Adjust stock"
              : "Set low-stock threshold"}
          </DialogTitle>
          <DialogDescription>
            {selection?.variant.productName} · {selection?.variant.name}.
            Quantities count {selection?.variant.saleUnit} packs.
          </DialogDescription>
          <ValidatedForm<Record<string, unknown>, Record<string, unknown>>
            schema={
              selection?.kind === "stock"
                ? stockFormSchema
                : thresholdFormSchema
            }
            key={`${selection?.variant.id}:${selection?.kind}`}
            onSubmit={submit}
            className="space-y-4"
          >
            {selection?.kind === "stock" ? (
              <>
                <p className="rounded-lg border border-[#e0e9e2] bg-[#f6faf6] px-3 py-2 text-sm text-[#405448]">
                  {selection.variant.availableQuantity} available ·{" "}
                  {selection.variant.reserved} reserved ·{" "}
                  {selection.variant.quantity} total on hand
                </p>
                <label className="block text-sm font-medium">
                  Adjustment type
                  <span className="relative mt-2 block">
                    <AdjustmentTypeSelect
                      available={selection.variant.availableQuantity}
                      busy={busy}
                      onChange={setAdjustmentType}
                    />
                    <ChevronDown
                      aria-hidden
                      className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-[#718178]"
                    />
                  </span>
                </label>
                <label className="block text-sm font-medium">
                  {adjustmentType === "correction"
                    ? "Available quantity"
                    : "Quantity"}
                  <FormInput
                    name="quantity"
                    className="form-input mt-2"
                    type="number"
                    min={adjustmentType === "correction" ? 0 : 1}
                    max={Number.MAX_SAFE_INTEGER}
                    step={1}
                    defaultValue={
                      adjustmentType === "correction"
                        ? selection.variant.availableQuantity
                        : undefined
                    }
                    required
                    disabled={busy}
                  />
                </label>
                <p className="text-xs leading-5 text-[#535862]">
                  Available stock is prefilled. Setting it keeps{" "}
                  {selection.variant.reserved} reserved packs held. Receipts and
                  removals use the amount to add or remove, so their quantity
                  starts empty.
                </p>
                <label className="block text-sm font-medium">
                  Reason
                  <FormTextarea
                    name="reason"
                    className="form-input mt-2 min-h-24"
                    maxLength={1000}
                    disabled={busy}
                  />
                </label>
                <p className="text-xs text-[#535862]">
                  A reason is required for removals and corrections.
                </p>
              </>
            ) : (
              <label className="block text-sm font-medium">
                Warning threshold
                <FormInput
                  name="threshold"
                  className="form-input mt-2"
                  type="number"
                  min={0}
                  max={2147483647}
                  step={1}
                  defaultValue={selection?.variant.threshold}
                  required
                  disabled={busy}
                />
              </label>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setSelection(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : retry ? "Save / retry adjustment" : "Save"}
              </Button>
            </DialogFooter>
          </ValidatedForm>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InventoryRowActions({
  name,
  dialogOpen,
  onAction,
}: {
  name: string
  dialogOpen: boolean
  onAction: (kind: Selection["kind"], trigger: HTMLButtonElement | null) => void
}) {
  const trigger = useRef<HTMLButtonElement>(null)
  const itemClass =
    "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm outline-none data-highlighted:bg-[#f0f5f2] data-highlighted:text-[#1b4d3e]"

  return (
    <Menu.Root>
      <Menu.Trigger
        ref={trigger}
        aria-label={`Inventory actions for ${name}`}
        className="mx-auto grid size-11 place-items-center rounded-lg border border-transparent text-[#65776a] transition outline-none hover:border-[#dfe7e1] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#1b5442] data-popup-open:border-[#dfe7e1] data-popup-open:bg-white"
      >
        <MoreHorizontal aria-hidden className="size-5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-50">
          <Menu.Popup
            finalFocus={!dialogOpen}
            className="w-52 origin-(--transform-origin) rounded-xl border border-[#e2e8e3] bg-white p-1.5 text-left text-[#374d3e] shadow-[0_8px_32px_rgba(25,50,35,0.12)] outline-none"
          >
            <Menu.Item
              className={itemClass}
              onClick={() => onAction("stock", trigger.current)}
            >
              <ArrowDownUp aria-hidden className="size-4" />
              Adjust stock
            </Menu.Item>
            <Menu.Item
              className={itemClass}
              onClick={() => onAction("threshold", trigger.current)}
            >
              <SlidersHorizontal aria-hidden className="size-4" />
              Set threshold
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

function StockStatus({ value }: { value: string }) {
  const state = value.toLowerCase()
  const styles =
    state === "in"
      ? "border-[#dceade] bg-[#f2f8ef] text-[#4d7854]"
      : state === "low"
        ? "border-[#f0e4c7] bg-[#fffbef] text-[#856020]"
        : "border-[#f0ddda] bg-[#fff6f4] text-[#9a4c42]"

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium whitespace-nowrap ${styles}`}
    >
      <span aria-hidden className="size-1 rounded-full bg-current" />
      {state === "in"
        ? "In stock"
        : state === "low"
          ? "Low stock"
          : "Out of stock"}
    </span>
  )
}

function AdjustmentTypeSelect({
  available,
  busy,
  onChange,
}: {
  available: number
  busy: boolean
  onChange: (value: "correction" | "receipt" | "removal") => void
}) {
  const { setValue, trigger, formState } = useFormContext()
  return (
    <FormSelect
      name="type"
      defaultValue="correction"
      disabled={busy}
      className="h-11 w-full appearance-none rounded-lg border border-[#dfe7e1] bg-white pr-10 pl-3 text-sm text-[#263e30] outline-none focus-visible:border-[#1b5442] focus-visible:ring-2 focus-visible:ring-[#d7e8dc] disabled:opacity-50"
      onChange={(event) => {
        const type = event.target.value as "correction" | "receipt" | "removal"
        onChange(type)
        setValue("quantity", type === "correction" ? available : "", {
          shouldDirty: true,
        })
        if (formState.isSubmitted) void trigger(["quantity", "reason"])
      }}
    >
      <option value="correction">Set available stock</option>
      <option value="receipt">Receive stock</option>
      <option value="removal">Remove stock</option>
    </FormSelect>
  )
}
