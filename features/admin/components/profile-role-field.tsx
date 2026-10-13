"use client"

import { useQuery } from "@tanstack/react-query"
import { ChevronDown } from "lucide-react"
import { FormSelect } from "@/components/shared/form/validated-form"
import { getProfileRoles } from "../api/team-profiles"

export default function ProfileRoleField({
  disabled,
  currentRole,
}: {
  disabled?: boolean
  currentRole?: string
}) {
  const roles = useQuery({
    queryKey: ["portal", "profile-roles"],
    queryFn: getProfileRoles,
    staleTime: 5 * 60 * 1000,
  })
  const legacyRole =
    currentRole &&
    roles.data &&
    !roles.data.some((role) => role.key === currentRole)
  return (
    <div>
      <label className="block text-sm font-medium">
        Role
        <span className="relative mt-2 block">
          <FormSelect
            name="role"
            defaultValue={currentRole ?? "user"}
            className="form-input appearance-none pr-11"
            disabled={disabled || !roles.data}
          >
            {roles.isPending && (
              <option value={currentRole ?? "user"}>Loading roles…</option>
            )}
            {roles.isError && (
              <option value={currentRole ?? "user"}>Roles unavailable</option>
            )}
            {legacyRole && (
              <option value={currentRole}>{currentRole} (current role)</option>
            )}
            {roles.data?.map((role) => (
              <option key={role.key} value={role.key}>
                {role.name}
              </option>
            ))}
          </FormSelect>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-[#718178]"
          />
        </span>
      </label>
      {roles.isError && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          Roles couldn’t be loaded.{" "}
          <button
            type="button"
            onClick={() => void roles.refetch()}
            className="min-h-11 underline"
          >
            Try again
          </button>
        </p>
      )}
    </div>
  )
}
