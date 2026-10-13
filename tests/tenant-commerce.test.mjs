import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import Module, { createRequire } from "node:module"
import { test } from "node:test"
import ts from "typescript"
const require = createRequire(import.meta.url),
  root = process.cwd(),
  resolve = Module._resolveFilename
Module._resolveFilename = function (request, ...args) {
  return resolve.call(
    this,
    request.startsWith("@/") ? path.join(root, request.slice(2)) : request,
    ...args
  )
}
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename
  )

const data = require("../lib/api/data.ts")
const client = require("../lib/api/client.ts")
const profiles = require("../features/admin/api/team-profiles.ts")
const onboarding = require("../features/auth/api/onboarding.ts")
const accounts = require("../features/admin/api/accounts.ts")
const catalog = require("../features/products/api/live-catalog.ts")
const reset = require("../features/auth/api/password-reset.ts")
const id = "11111111-1111-4111-8111-111111111111"
const second = "22222222-2222-4222-8222-222222222222"
const envelope = (data) => ({ status: 200, success: true, message: "OK", data })

test("team profiles use server pagination fields and tenant-scoped requests", async (t) => {
  const calls = []
  t.mock.method(data, "apiData", async (...args) => {
    calls.push(args)
    return {
      records: [],
      totalRecords: 45,
      next: 21,
      previous: 39,
      isNext: true,
      isPrevious: true,
    }
  })
  const page = await profiles.getTeamProfiles({
    search: "  Ada Okafor  ",
    cursor: 30,
    navigation: "previous",
  })
  const url = new URL(calls[0][0], "https://example.test")
  assert.equal(url.pathname, "/getty/v1/tenant/profiles")
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    cursor: "30",
    navigation: "previous",
    limit: "20",
    search: "Ada Okafor",
  })
  assert.equal(page.totalRecords, 45)
  assert.equal(page.next, 21)
  assert.equal(page.previous, 39)
  await assert.rejects(() => profiles.getTeamProfiles({ cursor: -1 }))
  assert.equal(calls.length, 1)
})

test("profile edit and deletion send IDs in the JSON body and no tenant identifier", async (t) => {
  const calls = []
  t.mock.method(data, "apiData", async (path, options) => {
    calls.push({ path, method: options.method, body: JSON.parse(options.body) })
    return "OK"
  })
  await profiles.updateTeamProfile({
    id,
    name: " Ada ",
    email: "Ada@Example.com",
    phone: "",
    role: "user",
    tenant: second,
    password: "excluded",
  })
  await profiles.deleteTeamProfile(id)
  assert.deepEqual(calls, [
    {
      path: "/getty/v1/tenant/profile",
      method: "PUT",
      body: {
        id,
        name: "Ada",
        email: "ada@example.com",
        phone: null,
        role: "user",
      },
    },
    { path: "/getty/v1/tenant/profile", method: "DELETE", body: { id } },
  ])
})

test("profile choices come from the role lookup and user can be created", async (t) => {
  t.mock.method(data, "apiData", async (path) => {
    assert.equal(path, "/getty/v1/tenant/roles")
    return [
      { key: "admin", name: "Administrator" },
      { key: "user", name: "User" },
    ]
  })
  assert.equal((await profiles.getProfileRoles())[1].key, "user")
  t.mock.method(client, "apiRequest", async (path, options) => {
    assert.equal(path, "/getty/v1/tenant/profile")
    assert.equal(options.method, "POST")
    assert.deepEqual(JSON.parse(options.body), {
      name: "Ada",
      email: "ada@example.com",
      role: "user",
    })
    return { ...envelope(null), status: 201 }
  })
  await accounts.createTenantAccount("profile", {
    name: "Ada",
    email: "ada@example.com",
    role: "user",
  })
})

test("profile errors and incomplete responses cannot appear as success", async (t) => {
  t.mock.method(data, "apiData", async () => null)
  await assert.rejects(profiles.getTeamProfiles(), /incomplete/)
  await assert.rejects(profiles.getProfileRoles(), /available roles/)
  await assert.rejects(profiles.deleteTeamProfile(id), /could not be confirmed/)
  await assert.rejects(
    profiles.updateTeamProfile({ id, name: "", email: "wrong", role: "admin" }),
    /check the profile/
  )
})

test("customer onboarding retains replacement challenges and emailed OTP leading zeros", async (t) => {
  const calls = []
  t.mock.method(data, "apiData", async (path, options, auth) => {
    const body = JSON.parse(options.body)
    calls.push({ path, body, auth })
    if (path.endsWith("/confirm"))
      return { tenant: second, status: "onboarded" }
    return {
      reference: path.endsWith("/resend") ? second : id,
      codeExpiresAt: "2026-10-13T10:15:00Z",
      expiresAt: "2026-10-13T15:00:00Z",
    }
  })
  const pending = await onboarding.beginSignup({
    name: "Acacia",
    email: "ada@example.com",
    phone: "08073984083",
    address: "Abuja",
    country: "NG",
    contact: "Ada",
    password: "excluded",
    type: "admin",
  })
  const replacement = await onboarding.resendSignup({
    reference: pending.reference,
  })
  await onboarding.confirmSignup({
    reference: replacement.reference,
    otp: "012345",
  })
  assert.equal(
    calls.every((call) => call.auth === "anonymous"),
    true
  )
  assert.equal("password" in calls[0].body, false)
  assert.equal("type" in calls[0].body, false)
  assert.deepEqual(calls[1].body, { reference: id })
  assert.deepEqual(calls[2].body, { reference: second, otp: "012345" })
  assert.equal(replacement.expiresAt, pending.expiresAt)
})

test("public reviews use published-only visibility and validate pagination", async (t) => {
  t.mock.method(client, "apiRequest", async (path, options, auth) => {
    assert.equal(auth, "public")
    const url = new URL(path, "https://example.test")
    assert.equal(
      url.pathname,
      `/getty/ecommerce/catalog/products/${id}/ratings`
    )
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      cursor: "42",
      navigation: "previous",
      limit: "20",
      showAll: "false",
    })
    return envelope({
      records: [],
      cursor: 42,
      nextCursor: 0,
      previousCursor: 0,
      isNext: false,
      isPrevious: false,
    })
  })
  assert.equal(
    (
      await catalog.getProductReviews(id, {
        cursor: 42,
        navigation: "previous",
      })
    ).isNext,
    false
  )
  t.mock.method(client, "apiRequest", async () => envelope({ records: [] }))
  await assert.rejects(
    catalog.getProductReviews(id, { cursor: 0, navigation: "next" }),
    /reviews response is incomplete/
  )
})

test("password reset resends the current reference and retains the replacement expiry", async (t) => {
  t.mock.method(client, "apiRequest", async (path, options, auth) => {
    assert.equal(path, "/getty/account/v1/password/reset/resend")
    assert.equal(options.method, "POST")
    assert.deepEqual(JSON.parse(options.body), { reference: id })
    assert.equal(auth, "public")
    return envelope({
      reference: second,
      expiresAt: "2026-10-13T11:00:00Z",
      ttl: 120,
    })
  })
  const result = await reset.resendPasswordResetOtp({ reference: id })
  assert.equal(result.reference, second)
  assert.equal(result.expiresAt, Date.parse("2026-10-13T11:00:00Z"))
  assert.equal(result.resendAt, result.expiresAt)
  t.mock.method(client, "apiRequest", async () =>
    envelope({ reference: second, expiresAt: null })
  )
  const now = Date.now()
  const fallback = await reset.resendPasswordResetOtp({ reference: id })
  assert.equal(fallback.expiresAt, null)
  assert.ok(
    fallback.resendAt >= now + 300_000 &&
      fallback.resendAt <= Date.now() + 300_000
  )
})
