"use client"

import { useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import AdminDataTable from "@/components/admin/tables/admin-data-table"
import StatusBadge from "@/components/admin/shared/status-badge"
import ContentError from "@/components/shared/content-error"
import {
  ValidatedForm,
  FormInputField,
} from "@/components/shared/form/validated-form"
import { accountFormSchema, searchSchema } from "@/lib/form-schemas"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  getTeamProfiles,
  getProfileRoles,
  updateTeamProfile,
  deleteTeamProfile,
  type TeamProfile,
} from "../api/team-profiles"
import CreateAccount from "./create-account"
import ProfileRoleField from "./profile-role-field"

export default function TeamProfiles() {
  const { data: session } = useAuthSession()
  const user = session?.user
  const allowed = Boolean(
    user && ["admin", "superadmin"].includes(user.profileRole ?? "")
  )
  const client = useQueryClient()
  const [filter, setFilter] = useState({
    search: "",
    cursor: 0,
    navigation: "next" as "next" | "previous",
  })
  const [selected, setSelected] = useState<{
    profile: TeamProfile
    action: "edit" | "delete"
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const trigger = useRef<HTMLButtonElement | null>(null)
  const query = useQuery({
    queryKey: ["portal", "team-profiles", user?.id, filter],
    queryFn: () => getTeamProfiles(filter),
    enabled: allowed,
  })
  const roles = useQuery({
    queryKey: ["portal", "profile-roles"],
    queryFn: getProfileRoles,
    enabled: allowed && selected?.action === "edit",
    staleTime: 5 * 60 * 1000,
  })
  if (!allowed) return null

  async function save(values?: Record<string, unknown>) {
    if (!selected || busy || !allowed) return
    if (selected.action === "edit" && !roles.data) return
    setBusy(true)
    setError("")
    try {
      if (selected.action === "edit")
        await updateTeamProfile({ ...values, id: selected.profile.id })
      else await deleteTeamProfile(selected.profile.id)
      toast.success(
        selected.action === "edit" ? "Profile updated." : "Profile deleted."
      )
      setSelected(null)
      await client.invalidateQueries({ queryKey: ["portal", "team-profiles"] })
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "This profile could not be updated. Please try again."
      )
    } finally {
      setBusy(false)
    }
  }

  const columns: ColumnDef<TeamProfile, unknown>[] = [
    {
      accessorKey: "name",
      header: "Team member",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="max-w-64">
          <p className="font-medium break-words">{row.original.name}</p>
          <p className="text-muted-foreground mt-1 text-xs break-all">
            {row.original.email}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {row.original.phone ?? "No phone number"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="capitalize">
          {row.original.role === "admin" ? "Administrator" : row.original.role}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "verification",
      header: "Account access",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-muted-foreground space-y-1 text-xs">
          <p>
            {row.original.emailVerified ? "Email verified" : "Email unverified"}
          </p>
          <p>
            {row.original.phoneVerified ? "Phone verified" : "Phone unverified"}
          </p>
          {row.original.reset && <p>Password change required</p>}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-1">
          {(["edit", "delete"] as const).map((action) => (
            <Button
              key={action}
              type="button"
              variant="ghost"
              className={action === "delete" ? "text-red-700" : "text-primary"}
              onClick={(event) => {
                trigger.current = event.currentTarget
                setError("")
                setSelected({ profile: row.original, action })
              }}
            >
              {action === "edit" ? "Edit" : "Delete"}
            </Button>
          ))}
        </div>
      ),
    },
  ]

  return (
    <section
      className="min-w-0 space-y-5 border-t border-[#e0e8e2] pt-7"
      aria-labelledby="team-profiles-heading"
    >
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2
            id="team-profiles-heading"
            className="text-xl font-semibold text-[#263e30]"
          >
            Organisation team
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage the people who have access to your organisation’s workspace.
          </p>
        </div>
        <CreateAccount kind="profile" />
      </div>
      <ValidatedForm
        schema={searchSchema}
        autoSubmit={300}
        defaultValues={{ search: "" }}
        onSubmit={({ search }) =>
          setFilter((current) =>
            current.search === search
              ? current
              : { search, cursor: 0, navigation: "next" }
          )
        }
        className="max-w-sm"
      >
        <FormInputField
          name="search"
          label="Search team members"
          type="search"
          placeholder="Name, email or phone"
        />
        <p className="text-muted-foreground mt-2 text-xs">
          Enter at least four characters to filter the list.
        </p>
      </ValidatedForm>
      {query.isError ? (
        <ContentError
          title="We couldn’t load your team"
          description={query.error.message}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <AdminDataTable
          label="Team profiles"
          columns={columns}
          data={query.data?.records ?? []}
          total={query.data?.totalRecords ?? 0}
          pageCount={1}
          pagination={{ pageIndex: 0, pageSize: 20 }}
          onPaginationChange={() => {}}
          loading={query.isPending}
          emptyState={<p>No team profiles match your search.</p>}
          paginationControls={
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <p className="text-muted-foreground text-sm">
                {query.data?.totalRecords ?? 0} team members
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!query.data?.isPrevious || query.isFetching}
                  onClick={() =>
                    setFilter((current) => ({
                      ...current,
                      cursor: query.data!.previous,
                      navigation: "previous",
                    }))
                  }
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!query.data?.isNext || query.isFetching}
                  onClick={() =>
                    setFilter((current) => ({
                      ...current,
                      cursor: query.data!.next,
                      navigation: "next",
                    }))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          }
        />
      )}
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null)
        }}
      >
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto"
          finalFocus={() =>
            trigger.current?.isConnected ? trigger.current : null
          }
        >
          <DialogTitle>
            {selected?.action === "delete"
              ? "Delete team profile?"
              : "Edit team profile"}
          </DialogTitle>
          <DialogDescription>
            {selected?.action === "delete"
              ? `${selected.profile.name} will lose access to this organisation. This action cannot be undone.`
              : "Update contact details and access. Changed contact details will need verification again."}
          </DialogDescription>
          {selected?.action === "edit" ? (
            <ValidatedForm<Record<string, unknown>, Record<string, unknown>>
              key={selected.profile.id}
              schema={accountFormSchema("profile")}
              defaultValues={{
                name: selected.profile.name,
                email: selected.profile.email,
                phone: selected.profile.phone ?? "",
                role: selected.profile.role,
              }}
              onSubmit={save}
              className="space-y-4"
            >
              <FormInputField
                name="name"
                label="Full name"
                required
                disabled={busy}
              />
              <FormInputField
                name="email"
                label="Email address"
                type="email"
                required
                disabled={busy}
              />
              <FormInputField
                name="phone"
                label="Phone number"
                type="tel"
                disabled={busy}
              />
              <ProfileRoleField
                disabled={busy}
                currentRole={selected.profile.role}
              />
              {error && (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setSelected(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy || !roles.data}>
                  {busy ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </ValidatedForm>
          ) : (
            <>
              {error && (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setSelected(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => void save()}
                >
                  {busy ? "Deleting…" : "Delete profile"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
