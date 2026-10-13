"use client"

import { useQuery } from "@tanstack/react-query"
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
            className="form-input"
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
