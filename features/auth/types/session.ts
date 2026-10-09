import type { Role } from "@/lib/auth/roles"
export type GettyUser = {
  id: string
  email: string
  name: string
  phone?: string
  profileRole?: string
  tenantType?: string
  tenant?: string
  status?: string
  tenantStatus?: string
  resetPassword?: boolean
  role: Role
}
export type AuthSession = { user: GettyUser | null; message?: string }
