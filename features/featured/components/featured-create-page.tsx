"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import PageHeading from "@/components/shared/page-heading"
import { Button } from "@/components/ui/button"
import FeaturedForm from "./featured-form"
import { featuredKeys, saveFeatured } from "../api/featured"
import type { FeaturedFormValues } from "../schema"

export default function FeaturedCreatePage() {
  const router = useRouter()
  const client = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [error, setError] = useState("")
  const running = useRef(false)

  async function save(values: FeaturedFormValues) {
    if (running.current) return
    running.current = true
    setBusy(true)
    setError("")
    try {
      await saveFeatured(values)
      await Promise.all([
        client.invalidateQueries({ queryKey: featuredKeys.all }),
        client.invalidateQueries({ queryKey: ["products", "featured"] }),
      ])
      toast.success("Featured product added.")
      router.push("/admin/featured")
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not create this featured product. Please try again."
      )
    } finally {
      running.current = false
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Button
        variant="ghost"
        className="-ml-3 text-[#087b4c]"
        disabled={busy || uploadBusy}
        onClick={() => router.push("/admin/featured")}
      >
        <ArrowLeft aria-hidden className="size-4" />
        Featured products
      </Button>
      <PageHeading
        title="Add featured product"
        description="Select a product, add its photo and set the schedule."
      />
      <FeaturedForm
        layout="page"
        busy={busy}
        error={error}
        onSave={save}
        onUploadBusy={setUploadBusy}
        onCancel={() => router.push("/admin/featured")}
      />
    </div>
  )
}
