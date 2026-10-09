"use client"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import CustomerAccountMenu from "@/app/(store)/_components/layout/customer-account-menu"
export default function UserMenu() {
  const { data } = useAuthSession()
  return data?.user ? <CustomerAccountMenu user={data.user} /> : null
}
