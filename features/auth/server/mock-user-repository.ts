import { hashPassword } from "@/lib/auth/password"
import { Role } from "@/lib/auth/roles"

export type MockAuthUser = {
  id: string
  name: string
  email: string
  phone?: string
  role: Role
  passwordHash: string
  active: boolean
  createdAt: string
  updatedAt: string
}

const users = new Map<string, MockAuthUser>()

let seeded = false

export async function ensureMockUsersSeeded() {
  if (seeded) {
    return
  }

  seeded = true

  const now = new Date().toISOString()

  const customerPasswordHash = await hashPassword("Password123!")
  const adminPasswordHash = await hashPassword("Admin123!")

  const customer: MockAuthUser = {
    id: "user-customer-001",
    name: "Getty Customer",
    email: "customer@gettymedicalstore.com",
    phone: "",
    role: Role.CUSTOMER,
    passwordHash: customerPasswordHash,
    active: true,
    createdAt: now,
    updatedAt: now,
  }

  const admin: MockAuthUser = {
    id: "user-admin-001",
    name: "Getty Administrator",
    email: "admin@gettymedicalstore.com",
    phone: "",
    role: Role.ADMIN,
    passwordHash: adminPasswordHash,
    active: true,
    createdAt: now,
    updatedAt: now,
  }

  users.set(normaliseEmail(customer.email), customer)
  users.set(normaliseEmail(admin.email), admin)
}

export async function findMockUserByEmail(email: string) {
  await ensureMockUsersSeeded()

  return users.get(normaliseEmail(email)) ?? null
}

export async function findMockUserById(userId: string) {
  await ensureMockUsersSeeded()

  return Array.from(users.values()).find((user) => user.id === userId) ?? null
}

export async function updateMockUserPassword(input: {
  userId: string
  passwordHash: string
}) {
  await ensureMockUsersSeeded()

  const user = await findMockUserById(input.userId)

  if (!user) {
    return null
  }

  const updatedUser: MockAuthUser = {
    ...user,
    passwordHash: input.passwordHash,
    updatedAt: new Date().toISOString(),
  }

  users.set(normaliseEmail(updatedUser.email), updatedUser)

  return updatedUser
}

function normaliseEmail(email: string) {
  return email.trim().toLowerCase()
}
