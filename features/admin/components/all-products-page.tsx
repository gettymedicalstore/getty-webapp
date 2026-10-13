"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Package, Search } from "lucide-react"
import PageHeading from "@/components/shared/page-heading"
import ContentError from "@/components/shared/content-error"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import AdminDataTable from "@/components/admin/tables/admin-data-table"
import StatusBadge from "@/components/admin/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  ValidatedForm,
  FormInput,
  FormSelect,
} from "@/components/shared/form/validated-form"
import { fieldClass } from "./product-workspace-shared"
import { getVendorOptions } from "../api/accounts"
import {
  allProductFiltersSchema,
  getAllProducts,
  type AllProductFilters,
  type AllVendorProduct,
  type ProductCursor,
} from "../api/all-products"

const emptyFilters: AllProductFilters = { vendor: "", status: "", search: "" }
function money(
  amount: number | null | undefined,
  formatted: string | null | undefined,
  currency: string | null | undefined
) {
  if (amount == null) return "—"
  if (formatted) return formatted
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
    }).format(amount)
  } catch {
    return `${currency ?? ""} ${amount.toLocaleString("en-NG")}`.trim()
  }
}
const columns: ColumnDef<AllVendorProduct, unknown>[] = [
  {
    id: "product",
    header: "Product",
    enableSorting: false,
    cell: ({ row: { original: product } }) => (
      <div className="max-w-xs min-w-44 space-y-1">
        <Link
          href={`/admin/products/${encodeURIComponent(product.id)}`}
          className="font-semibold text-[#294634] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {product.name}
        </Link>
        {product.brand && (
          <p className="text-xs text-[#5e6f63]">{product.brand}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "vendor",
    header: "Vendor",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="inline-block min-w-32">
        {row.original.vendor || "—"}
      </span>
    ),
  },
  {
    accessorKey: "categoryName",
    header: "Category",
    enableSorting: false,
    cell: ({ row }) => row.original.categoryName || "—",
  },
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: false,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "price",
    header: "Price",
    enableSorting: false,
    cell: ({ row: { original: p } }) => {
      const discounted =
        p.price != null &&
        p.discount != null &&
        p.discount > 0 &&
        p.discount < p.price
      return (
        <div className="relative space-y-1 whitespace-nowrap">
          <p className="font-semibold text-[#294634]">
            {discounted
              ? money(p.discount, p.discountFmt, p.currency)
              : money(p.price, p.priceFmt, p.currency)}
          </p>
          {discounted && (
            <p className="text-xs text-[#5e6f63]">
              <span className="sr-only">Original price: </span>
              <s>{money(p.price, p.priceFmt, p.currency)}</s>
            </p>
          )}
        </div>
      )
    },
  },
  {
    id: "stock",
    header: "Stock",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="space-y-1 whitespace-nowrap">
        <p>{row.original.availableQuantity ?? "—"} available</p>
        <p className="text-xs text-[#5e6f63]">
          {row.original.quantity ?? "—"} total
        </p>
      </div>
    ),
  },
  {
    accessorKey: "variantCount",
    header: "Variants",
    enableSorting: false,
    cell: ({ row }) => row.original.variantCount ?? "—",
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => (
      <Link
        href={`/admin/products/${encodeURIComponent(row.original.id)}`}
        className="inline-flex min-h-11 items-center rounded-md px-2 font-semibold whitespace-nowrap text-[#087b4c] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label={`View ${row.original.name}`}
      >
        View product
      </Link>
    ),
  },
]

export default function AllProductsPage() {
  const [filters, setFilters] = useState(emptyFilters)
  const [page, setPage] = useState<{
    cursor: ProductCursor
    navigation: "next" | "previous"
    index: number
  }>({ cursor: 0, navigation: "next", index: 0 })
  const vendors = useQuery({
    queryKey: ["featured", "vendor-options"],
    queryFn: getVendorOptions,
  })
  const products = useQuery({
    queryKey: ["admin", "all-products", filters, page],
    queryFn: () =>
      getAllProducts({
        ...filters,
        cursor: page.cursor,
        navigation: page.navigation,
      }),
  })
  function changeFilters(values: AllProductFilters) {
    if (
      Object.keys(emptyFilters).every(
        (key) =>
          values[key as keyof AllProductFilters] ===
          filters[key as keyof AllProductFilters]
      )
    )
      return
    setFilters(values)
    setPage({ cursor: 0, navigation: "next", index: 0 })
  }
  const filtered = Boolean(filters.vendor || filters.status || filters.search)
  return (
    <div className="min-w-0 space-y-6">
      <PageHeading
        title="All products"
        description="Browse and review products across all vendors."
      />
      <ValidatedForm
        schema={allProductFiltersSchema}
        values={filters}
        autoSubmit={300}
        onSubmit={changeFilters}
        className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,16rem)_12rem_auto]"
      >
        <div className="relative sm:col-span-2 xl:col-span-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-4 left-3 size-4 text-[#687b6e]"
          />
          <FormInput
            name="search"
            type="search"
            aria-label="Search all products"
            placeholder="Search products"
            className={`${fieldClass} pl-10`}
          />
        </div>
        <div className="relative min-w-0">
          <FormSelect
            name="vendor"
            aria-label="Filter by vendor"
            className={fieldClass}
            disabled={vendors.isPending || vendors.isError}
          >
            <option value="">
              {vendors.isPending ? "Loading vendors…" : "All vendors"}
            </option>
            {vendors.data?.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </FormSelect>
        </div>
        <div className="relative min-w-0">
          <FormSelect
            name="status"
            aria-label="Filter by product status"
            className={fieldClass}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
          </FormSelect>
        </div>
        {filtered && (
          <Button
            type="button"
            variant="outline"
            onClick={() => changeFilters(emptyFilters)}
          >
            Clear filters
          </Button>
        )}
      </ValidatedForm>
      {vendors.isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 text-sm text-[#5e6f63]"
        >
          Couldn’t load the vendor filter.
          <Button
            variant="outline"
            disabled={vendors.isFetching}
            onClick={() => void vendors.refetch()}
          >
            Retry vendors
          </Button>
        </div>
      )}
      {products.isPending ? (
        <TableSkeleton />
      ) : products.isError ? (
        <ContentError
          title="We couldn’t load all products"
          onRetry={() => void products.refetch()}
          retrying={products.isFetching}
        />
      ) : (
        <AdminDataTable
          label="All vendors’ products"
          columns={columns}
          data={products.data.records}
          total={products.data.records.length}
          pageCount={1}
          pagination={{ pageIndex: 0, pageSize: 20 }}
          onPaginationChange={() => {}}
          emptyState={
            <div className="mx-auto max-w-sm space-y-2">
              <Package
                aria-hidden
                className="mx-auto mb-3 size-7 text-[#58735f]"
              />
              <p className="font-semibold">
                {filtered ? "No matching products" : "No products yet"}
              </p>
              <p>
                {filtered
                  ? "Try another search, vendor or status."
                  : "Products from vendors will appear here."}
              </p>
            </div>
          }
          paginationControls={
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#5e6f63]">
                {products.data.records.length}{" "}
                {products.data.records.length === 1 ? "product" : "products"} on
                this page
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  disabled={!products.data.isPrevious || products.isFetching}
                  onClick={() => {
                    if (products.data.previousCursor !== null)
                      setPage({
                        cursor: products.data.previousCursor,
                        navigation: "previous",
                        index: Math.max(0, page.index - 1),
                      })
                  }}
                >
                  Previous
                </Button>
                <span className="text-xs">Page {page.index + 1}</span>
                <Button
                  variant="outline"
                  disabled={!products.data.isNext || products.isFetching}
                  onClick={() => {
                    if (products.data.nextCursor !== null)
                      setPage({
                        cursor: products.data.nextCursor,
                        navigation: "next",
                        index: page.index + 1,
                      })
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          }
        />
      )}
    </div>
  )
}
