"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Send, ShieldCheck } from "lucide-react"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"
import ContentError from "@/components/shared/content-error"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  approveManagedProduct,
  getManagedProduct,
  submitManagedProductForReview,
} from "../api/product-management"
import ProductOverview from "./product-overview"
import ProductDetailsForm from "./product-details-form"
import ProductSpecifications from "./product-specifications"
import ProductVariants from "./product-variants"
import ProductTaxAssignments from "./product-tax-assignments"
import ProductImageUpload from "./product-image-upload"
import {
  FormError,
  useProductMutation,
  valueText,
} from "./product-workspace-shared"

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "details", label: "Details" },
  { id: "variants", label: "Variants" },
  { id: "specifications", label: "Specifications" },
  { id: "taxes", label: "Taxes" },
  { id: "photos", label: "Photos" },
]

export default function ProductWorkspace({
  productId,
  workspace,
}: {
  productId: string
  workspace: "admin" | "supplier"
}) {
  const params = useSearchParams()
  const pathname = usePathname()
  const session = useAuthSession()
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [submissionOpen, setSubmissionOpen] = useState(false)
  const cancelApprovalButton = useRef<HTMLButtonElement>(null)
  const active = tabs.find((tab) => tab.id === params.get("tab")) ?? tabs[0]
  const query = useQuery({
    queryKey: ["managed-product", productId],
    queryFn: () => getManagedProduct(productId),
  })
  const approval = useProductMutation(productId)
  const submission = useProductMutation(productId)
  const isAdmin = workspace === "admin" && session.data?.user?.role === "admin"
  if (query.isPending) return <DashboardSkeleton />
  if (query.isError)
    return (
      <div className="space-y-5">
        <Link
          href={`/${workspace}/products`}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#426653]"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to products
        </Link>
        <ContentError
          title="We couldn’t load this product"
          description={query.error.message || "Please try again in a moment."}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      </div>
    )
  const data = query.data
  const product = data.product
  const status = product.status.toLowerCase()
  const isApproved = ["approved", "published", "active"].includes(status)
  const isSupplierDraft = workspace === "supplier" && status === "draft"
  const currency = /^[A-Z]{3}$/.test(valueText(product.currency))
    ? String(product.currency)
    : "NGN"
  const subtitle = valueText(product.brand)
  return (
    <div className="min-w-0 space-y-7">
      <div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <h1 className="max-w-4xl text-2xl leading-tight font-semibold tracking-tight text-[#172f23] sm:text-3xl">
            {product.name}
          </h1>
          <span
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium capitalize",
              ["approved", "published", "active"].includes(status)
                ? "bg-[#e5f4e9] text-[#226a42]"
                : [
                      "pending",
                      "submitted",
                      "pending_review",
                      "in_review",
                    ].includes(status)
                  ? "bg-amber-50 text-amber-800"
                  : status === "rejected"
                    ? "bg-red-50 text-red-700"
                    : "bg-[#e9edef] text-[#576570]"
            )}
          >
            {product.status.replaceAll("_", " ")}
          </span>
        </div>
        {subtitle && <p className="mt-3 text-sm text-[#5e6f63]">{subtitle}</p>}
      </div>
      <nav
        aria-label="Product sections"
        className="flex [scrollbar-width:thin] gap-1 overflow-x-auto border-b border-[#dce5df] sm:gap-3"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`${pathname}?tab=${tab.id}`}
            scroll={false}
            aria-current={active.id === tab.id ? "page" : undefined}
            className={cn(
              "flex min-h-13 shrink-0 items-center border-b-2 px-3 text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-[#167b54] focus-visible:ring-inset",
              active.id === tab.id
                ? "border-[#098655] font-semibold text-[#12533c]"
                : "border-transparent text-[#5e6f63] hover:border-[#ccd8d0] hover:text-[#244b35]"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div key={`${productId}:${active.id}`} className="min-w-0 pb-5">
        {active.id === "overview" && (
          <div className="space-y-5">
            <ProductOverview data={data} currency={currency} />
            {isSupplierDraft && (
              <section className="rounded-xl border border-[#dfe6e2] bg-white p-5 sm:p-7">
                <div className="flex items-start gap-3">
                  <Send
                    aria-hidden
                    className="mt-0.5 size-5 shrink-0 text-[#44775a]"
                  />
                  <div>
                    <h2 className="font-semibold text-[#304638]">
                      Ready for review?
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#68776d]">
                      You can keep editing this draft. Submit it when the
                      details are ready for the admin to review.
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-5 rounded-lg text-sm"
                  aria-haspopup="dialog"
                  onClick={() => {
                    submission.setError("")
                    setSubmissionOpen(true)
                  }}
                >
                  <Send aria-hidden className="size-4" />
                  Submit for review
                </Button>
              </section>
            )}
            {isAdmin && (
              <section
                aria-busy={approval.busy}
                className="rounded-xl border border-[#dfe6e2] bg-white p-5 sm:p-7"
              >
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    aria-hidden
                    className="mt-0.5 size-5 shrink-0 text-[#44775a]"
                  />
                  <div>
                    <h2 className="font-semibold text-[#304638]">
                      Product review
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#68776d]">
                      {isApproved
                        ? "This product has been approved."
                        : "Review the product details and specifications before approving this product."}
                    </p>
                  </div>
                </div>
                {valueText(product.rejection) && (
                  <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                    {valueText(product.rejection)}
                  </p>
                )}
                {!isApproved && (
                  <div className="mt-5">
                    <Button
                      disabled={approval.busy}
                      className="rounded-lg text-sm"
                      aria-haspopup="dialog"
                      onClick={() => {
                        approval.setError("")
                        setApprovalOpen(true)
                      }}
                    >
                      <ShieldCheck aria-hidden className="size-4" />
                      Approve product
                    </Button>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
        {active.id === "details" && <ProductDetailsForm product={productId} />}
        {active.id === "variants" && (
          <ProductVariants product={productId} currency={currency} />
        )}
        {active.id === "specifications" && (
          <ProductSpecifications
            product={productId}
            productName={product.name}
          />
        )}
        {active.id === "taxes" && <ProductTaxAssignments product={productId} />}
        {active.id === "photos" && (
          <ProductImageUpload
            product={productId}
            photosLink={data.links?.photos}
            published={isApproved}
          />
        )}
      </div>
      {isAdmin && (
        <Dialog
          open={approvalOpen}
          onOpenChange={(open) => {
            if (approval.busy) return
            setApprovalOpen(open)
            if (!open) approval.setError("")
          }}
        >
          <DialogContent
            initialFocus={cancelApprovalButton}
            showCloseButton={!approval.busy}
            className="sm:max-w-md"
          >
            <DialogTitle>Approve this product?</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve <strong>{product.name}</strong>?
              Check its details and documentation before continuing.
            </DialogDescription>
            <FormError message={approval.error} />
            <DialogFooter>
              <Button
                ref={cancelApprovalButton}
                type="button"
                variant="outline"
                disabled={approval.busy}
                onClick={() => setApprovalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={approval.busy || isApproved}
                onClick={() =>
                  void approval.run(
                    () => approveManagedProduct(productId),
                    "Product approved.",
                    () => setApprovalOpen(false)
                  )
                }
              >
                <ShieldCheck aria-hidden className="size-4" />
                {approval.busy ? "Approving…" : "Yes, approve product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {isSupplierDraft && (
        <Dialog
          open={submissionOpen}
          onOpenChange={(open) => {
            if (submission.busy) return
            setSubmissionOpen(open)
            if (!open) submission.setError("")
          }}
        >
          <DialogContent
            showCloseButton={!submission.busy}
            className="sm:max-w-md"
          >
            <DialogTitle>Submit this product for review?</DialogTitle>
            <DialogDescription>
              Submit <strong>{product.name}</strong> to the admin for review.
              You can save changes to the draft before submitting.
            </DialogDescription>
            <FormError message={submission.error} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submission.busy}
                onClick={() => setSubmissionOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={submission.busy}
                onClick={() =>
                  void submission.run(
                    () => submitManagedProductForReview(data),
                    "Product submitted for review.",
                    () => setSubmissionOpen(false)
                  )
                }
              >
                <Send aria-hidden className="size-4" />
                {submission.busy ? "Submitting…" : "Submit for review"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
