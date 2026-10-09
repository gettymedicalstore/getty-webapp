import { Role } from "@/lib/auth/roles"

// Consumer and vendor tenants also create an initial administrator profile.
// A tenant administrator is not a Getty support administrator.
export function backendRole(type?: string, role?: string): Role {
  const tenant = type?.trim().toLowerCase(),
    profile = role?.trim().toLowerCase()
  if (tenant === "consumer" || tenant === "customer") return Role.CUSTOMER
  if (tenant === "vendor" || tenant === "supplier") return Role.SUPPLIER
  if (tenant === "support" && ["admin", "superadmin"].includes(profile ?? ""))
    return Role.ADMIN
  if (["supplier", "vendor"].includes(profile ?? "")) return Role.SUPPLIER
  return Role.CUSTOMER
}
