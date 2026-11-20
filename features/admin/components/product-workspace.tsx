"use client"

import { useId, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Send, ShieldCheck, ShieldX } from "lucide-react"
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
  rejectManagedProduct,
  submitManagedProductForReview,
} from "../api/product-management"
import { isOwnProduct } from "../api/product-ownership"
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
  const [rejectionOpen, setRejectionOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [rejectionValidation, setRejectionValidation] = useState("")
  const [submissionOpen, setSubmissionOpen] = useState(false)
  const cancelApprovalButton = useRef<HTMLButtonElement>(null)
  const rejectionInput = useRef<HTMLTextAreaElement>(null)
  const rejectionInputId = useId()
  const active = tabs.find((tab) => tab.id === params.get("tab")) ?? tabs[0]
  const readScope = workspace === "admin" ? "admin" : "tenant"
  const query = useQuery({
    queryKey: ["managed-product", productId, readScope],
    queryFn: () => getManagedProduct(productId, readScope),
  })
  const approval = useProductMutation(productId)
  const rejection = useProductMutation(productId)
  const submission = useProductMutation(productId)
  const isAdmin = workspace === "admin" && session.data?.user?.role === "admin"
  const productName = query.data?.product.name ?? ""
  const ownership = useQuery({
    queryKey: [
      "portal",
      "product-ownership",
      session.data?.user?.id,
      session.data?.user?.tenant,
      productId,
      productName,
    ],
    queryFn: () => isOwnProduct(productId, productName),
    enabled: isAdmin && Boolean(productName),
    retry: false,
  })
  const canManage =
    workspace === "supplier" || (isAdmin && ownership.data === true)
  if (query.isPending) return <DashboardSkeleton />
  if (query.isError)
    return (
      <div className="space-y-5">
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
  const isPendingReview = [
    "pending",
    "submitted",
    "pending_review",
    "in_review",
  ].includes(status)
  const isSupplierSubmittable =
    workspace === "supplier" && ["draft", "rejected"].includes(status)
  const currency = /^[A-Z]{3}$/.test(valueText(product.currency))
    ? String(product.currency)
    : "NGN"
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex min-h-8 items-center justify-end">
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium capitalize",
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
      {isAdmin && !canManage && (
        <p role="status" className="text-sm text-[#5e6f63]">
          {ownership.isPending
            ? "Checking product ownership…"
            : ownership.isError
              ? "Product editing is unavailable while ownership cannot be verified."
              : "This vendor’s product is read-only in the admin workspace."}
        </p>
      )}
      <div key={`${productId}:${active.id}`} className="min-w-0 pb-5">
        {active.id === "overview" && (
          <div className="space-y-5">
            <ProductOverview
              data={data}
              currency={currency}
              canManage={canManage}
            />
            {isSupplierSubmittable && (
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
                      {status === "rejected"
                        ? "Update the product based on the review feedback, then send it for another review."
                        : "You can keep editing this draft. Submit it when the details are ready for the admin to review."}
                    </p>
                  </div>
                </div>
                {status === "rejected" && valueText(product.rejection) && (
                  <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                    <span className="font-semibold">Review feedback: </span>
                    {valueText(product.rejection)}
                  </p>
                )}
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
            {isAdmin && (isPendingReview || status === "rejected") && (
              <section
                aria-busy={approval.busy || rejection.busy}
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
                      {status === "rejected"
                        ? "This product was rejected. The vendor can update it and submit it for review again."
                        : "Review the product details and specifications before approving or rejecting it."}
                    </p>
                  </div>
                </div>
                {valueText(product.rejection) && (
                  <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                    {valueText(product.rejection)}
                  </p>
                )}
                {isPendingReview && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      disabled={approval.busy || rejection.busy}
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
                    <Button
                      variant="destructive"
                      disabled={approval.busy || rejection.busy}
                      className="rounded-lg text-sm"
                      aria-haspopup="dialog"
                      onClick={() => {
                        rejection.setError("")
                        setRejectionValidation("")
                        setRejectionOpen(true)
                      }}
                    >
                      <ShieldX aria-hidden className="size-4" />
                      Reject product
                    </Button>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
        {active.id === "details" && (
          <ProductDetailsForm
            product={productId}
            readScope={readScope}
            canManage={canManage}
          />
        )}
        {active.id === "variants" && (
          <ProductVariants
            product={productId}
            currency={currency}
            readScope={readScope}
            canManage={canManage}
          />
        )}
        {active.id === "specifications" && (
          <ProductSpecifications
            product={productId}
            readScope={readScope}
            canManage={canManage}
          />
        )}
        {active.id === "taxes" && (
          <ProductTaxAssignments
            product={productId}
            readScope={readScope}
            canManage={canManage}
          />
        )}
        {active.id === "photos" && (
          <ProductImageUpload
            product={productId}
            photosLink={data.links?.photos}
            canManage={canManage}
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
                disabled={approval.busy || !isPendingReview}
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
      {isAdmin && (
        <Dialog
          open={rejectionOpen}
          onOpenChange={(open) => {
            if (rejection.busy) return
            setRejectionOpen(open)
            if (!open) {
              rejection.setError("")
              setRejectionValidation("")
              setRejectionReason("")
            }
          }}
        >
          <DialogContent
            initialFocus={rejectionInput}
            showCloseButton={!rejection.busy}
            className="sm:max-w-md"
          >
            <DialogTitle>Reject this product?</DialogTitle>
            <DialogDescription>
              Tell the vendor what needs to change before you can approve{" "}
              <strong>{product.name}</strong>.
            </DialogDescription>
            <div>
              <label
                htmlFor={rejectionInputId}
                className="mb-2 block text-sm font-medium text-[#414651]"
              >
                Reason for rejection
              </label>
              <textarea
                ref={rejectionInput}
                id={rejectionInputId}
                value={rejectionReason}
                onChange={(event) => {
                  setRejectionReason(event.target.value)
                  if (rejectionValidation) setRejectionValidation("")
                }}
                rows={4}
                maxLength={1000}
                disabled={rejection.busy}
                aria-required="true"
                aria-invalid={Boolean(rejectionValidation)}
                className="w-full resize-y rounded-lg border border-[#dce2de] bg-white px-3.5 py-3 text-sm text-[#34453a] outline-none focus-visible:border-[#1b5944] focus-visible:ring-3 focus-visible:ring-[#1b5944]/10"
                placeholder="Explain what the vendor should correct."
              />
            </div>
            <FormError message={rejectionValidation || rejection.error} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={rejection.busy}
                onClick={() => setRejectionOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={rejection.busy || !isPendingReview}
                onClick={() => {
                  if (!rejectionReason.trim()) {
                    setRejectionValidation("Enter a reason for rejection.")
                    rejectionInput.current?.focus()
                    return
                  }
                  void rejection.run(
                    () => rejectManagedProduct(productId, rejectionReason),
                    "Product rejected.",
                    () => {
                      setRejectionOpen(false)
                      setRejectionReason("")
                    }
                  )
                }}
              >
                <ShieldX aria-hidden className="size-4" />
                {rejection.busy ? "Rejecting…" : "Reject product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {isSupplierSubmittable && (
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
