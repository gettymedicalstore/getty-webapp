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
const dataApi = require("../lib/api/data.ts")
const api = require("../features/checkout/api/checkout.ts")
const recovery = require("../features/checkout/api/recovery.ts")
const {
  deliverySchema,
} = require("../features/checkout/schemas/checkout-schema.ts")
const sample = JSON.parse(
  readFileSync(new URL("./fixtures/commerce.json", import.meta.url), "utf8")
)
const account = "buyer-a"
const token = "11111111-1111-4111-8111-000000000202"
const command = {
  token,
  cart: sample.preview.cart,
  quote: sample.preview.quote,
  delivery: sample.preview.delivery,
  notes: null,
}

test("delivery validation trims, validates lengths, and sends the preview body without a wrapper", async () => {
  assert.equal(
    deliverySchema.parse({ ...sample.preview.delivery, country: " ng " })
      .country,
    "NG"
  )
  assert.equal(
    deliverySchema.safeParse({ ...sample.preview.delivery, name: " " }).success,
    false
  )
  assert.equal(
    deliverySchema.safeParse({
      ...sample.preview.delivery,
      address: "x".repeat(301),
    }).success,
    false
  )
  const original = dataApi.apiData
  const calls = []
  dataApi.apiData = async (path, options) => {
    calls.push({ path, ...options })
    return sample.preview
  }
  try {
    const preview = await api.previewCheckout(sample.preview.delivery)
    assert.equal(preview.total, 10500)
    assert.equal(calls[0].path, "/getty/v1/order/checkout/preview")
    assert.deepEqual(JSON.parse(calls[0].body), sample.preview.delivery)
  } finally {
    dataApi.apiData = original
  }
})
test("checkout and payment use documented IDs and bodies, and reject mismatched payment responses", async () => {
  const original = dataApi.apiData,
    calls = []
  dataApi.apiData = async (path, options = {}) => {
    calls.push({ path, ...options })
    return path.endsWith("/checkout") ? sample.checkout : sample.startPayment
  }
  try {
    await api.placeOrder({ ...command, total: 1, paid: true })
    assert.deepEqual(JSON.parse(calls[0].body), command)
    const p = await api.startPayment(sample.checkout.id, token)
    assert.equal(p.status, "created")
    assert.equal(
      calls[1].path,
      `/getty/v1/order/${sample.checkout.id}/payments`
    )
    assert.deepEqual(JSON.parse(calls[1].body), { token })
    await api.getPayment(sample.checkout.id, p.id)
    assert.equal(calls[2].body, undefined)
    dataApi.apiData = async () => ({
      ...sample.startPayment,
      purchase: "11111111-1111-4111-8111-000000000999",
    })
    await assert.rejects(
      () => api.startPayment(sample.checkout.id, token),
      /does not match/
    )
  } finally {
    dataApi.apiData = original
  }
})
test("only pending charges on unexpired pending orders can reopen a secure hosted link", () => {
  const now = Date.parse("2026-10-13T10:10:00+01:00")
  assert.ok(api.hostedPaymentLink(sample.checkout, sample.payment, now))
  for (const status of [
    "created",
    "unknown",
    "succeeded",
    "failed",
    "cancelled",
  ])
    assert.equal(
      api.hostedPaymentLink(
        sample.checkout,
        { ...sample.payment, status },
        now
      ),
      null
    )
  assert.equal(
    api.hostedPaymentLink(
      sample.checkout,
      { ...sample.payment, kind: "refund" },
      now
    ),
    null
  )
  assert.equal(
    api.hostedPaymentLink(
      { ...sample.checkout, status: "expired" },
      sample.payment,
      now
    ),
    null
  )
  assert.equal(
    api.hostedPaymentLink(sample.checkout, sample.payment, now + 3600000),
    null
  )
  for (const link of [
    "javascript:alert(1)",
    "http://example.com",
    "https://user:secret@example.com",
  ])
    assert.equal(
      api.hostedPaymentLink(sample.checkout, { ...sample.payment, link }, now),
      null
    )
  for (const status of ["created", "pending", "unknown", "succeeded"])
    assert.ok(
      api.blockingCharge({
        ...sample.checkout,
        payments: [{ ...sample.payment, status }],
      })
    )
})
test("checkout and payment recovery persist exact operations scoped to their account", () => {
  const store = new Map()
  global.window = {
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
    },
  }
  try {
    recovery.rememberCheckout(account, command)
    assert.deepEqual(recovery.readRecovery(account).command, command)
    assert.equal(recovery.readRecovery("another-buyer").command, undefined)
    assert.throws(
      () =>
        recovery.rememberCheckout(account, {
          ...command,
          quote: "b".repeat(64),
        }),
      /awaiting confirmation/
    )
    recovery.rememberCheckout(account, command)
    recovery.rememberOrder(account, sample.checkout.id)
    assert.equal(recovery.readRecovery(account).command, undefined)
    const first = recovery.paymentOperation(account, sample.checkout.id)
    const second = recovery.paymentOperation(account, sample.checkout.id)
    assert.equal(first.token, second.token)
    recovery.rememberPayment(
      account,
      sample.checkout.id,
      first.token,
      sample.payment.id
    )
    assert.equal(
      recovery.readRecovery(account).payments[sample.checkout.id].id,
      sample.payment.id
    )
    const next = recovery.paymentOperation(account, sample.checkout.id, true)
    assert.notEqual(next.token, first.token)
    window.localStorage.setItem = () => {
      throw new Error("Storage disabled")
    }
    assert.throws(
      () => recovery.rememberCheckout("blocked", command),
      /Storage disabled/
    )
  } finally {
    delete global.window
  }
})
