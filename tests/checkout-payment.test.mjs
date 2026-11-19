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
const addresses = require("../features/checkout/api/addresses.ts")
const recovery = require("../features/checkout/api/recovery.ts")
const {
  deliverySchema,
  checkoutSchema,
  deliveryFromCheckoutForm,
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

test("saved addresses use the buyer address-book routes and delivery snapshots", async () => {
  const original = dataApi.apiData
  const calls = []
  const address = {
    id: token,
    label: "Home",
    delivery: sample.preview.delivery,
    isDefault: true,
  }
  dataApi.apiData = async (path, options) => {
    calls.push({ path, options })
    return options?.method === "DELETE"
      ? {}
      : options?.method === "POST" || options?.method === "PUT"
        ? address
        : [address]
  }
  try {
    assert.equal((await addresses.getSavedAddresses())[0].isDefault, true)
    assert.equal(
      (
        await addresses.createAddress({
          label: "Home",
          delivery: sample.preview.delivery,
          isDefault: true,
        })
      ).id,
      token
    )
    assert.equal(
      (
        await addresses.updateAddress(token, {
          label: "Office",
          delivery: sample.preview.delivery,
        })
      ).id,
      token
    )
    await addresses.updateAddress(token, {
      label: "Home",
      delivery: sample.preview.delivery,
      isDefault: true,
    })
    await addresses.deleteAddress(token)
    assert.deepEqual(
      calls.map((call) => [call.options?.method ?? "GET", call.path]),
      [
        ["GET", "/getty/v1/order/addresses"],
        ["POST", "/getty/v1/order/addresses"],
        ["PUT", `/getty/v1/order/addresses/${token}`],
        ["PUT", `/getty/v1/order/addresses/${token}`],
        ["DELETE", `/getty/v1/order/addresses/${token}`],
      ]
    )
    assert.deepEqual(JSON.parse(calls[1].options.body), {
      label: "Home",
      delivery: sample.preview.delivery,
      isDefault: true,
    })
    assert.deepEqual(JSON.parse(calls[2].options.body), {
      label: "Office",
      delivery: sample.preview.delivery,
    })
    assert.deepEqual(JSON.parse(calls[3].options.body), {
      label: "Home",
      delivery: sample.preview.delivery,
      isDefault: true,
    })
    assert.equal(
      addresses.findCreatedAddress([address], [], {
        label: "Home",
        delivery: sample.preview.delivery,
      })?.id,
      token
    )
    assert.equal(
      addresses.findCreatedAddress([address], [token], {
        label: "Home",
        delivery: sample.preview.delivery,
      }),
      undefined
    )
  } finally {
    dataApi.apiData = original
  }
})

test("a single saved address from GET is available for checkout selection", async () => {
  const original = dataApi.apiData
  const address = {
    id: "01a1e0cb-28e2-718a-8703-1e9cd8da327c",
    label: "Home",
    delivery: {
      city: "Wuse zone 3",
      name: "Zainab Muhammad",
      phone: "+2348142445678",
      state: "FCT",
      address: "Heritage house",
      country: "NG",
      service: "standard",
      postcode: "900283",
    },
    isDefault: true,
  }
  dataApi.apiData = async (path) => {
    assert.equal(path, "/getty/v1/order/addresses")
    return address
  }
  try {
    assert.deepEqual(await addresses.getSavedAddresses(), [address])
  } finally {
    dataApi.apiData = original
  }
})

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
    return {
      ...sample.preview,
      delivery: {
        ...sample.preview.delivery,
        state: "FCT",
        service: "standard",
      },
      deliveryQuote: {
        service: "standard",
        total: 3000,
        estimatedMeasurements: true,
        estimateOnly: true,
        earliest: "2026-11-14",
        latest: "2026-11-16",
      },
    }
  }
  try {
    const preview = await api.previewCheckout(sample.preview.delivery)
    assert.equal(preview.total, 10500)
    assert.equal(preview.delivery.state, "FCT")
    assert.equal(preview.deliveryQuote?.earliest, "2026-11-14")
    assert.equal(calls[0].path, "/getty/v1/order/checkout/preview")
    assert.deepEqual(JSON.parse(calls[0].body), sample.preview.delivery)
  } finally {
    dataApi.apiData = original
  }
})
test("checkout derives the delivery country from the phone country code", () => {
  const form = {
    ...sample.preview.delivery,
    state: "FCT",
  }
  delete form.country
  const nigeria = checkoutSchema.parse({
    ...form,
    phone: "0814 244 5807",
    phoneCountry: "NG",
  })
  assert.deepEqual(
    {
      phone: deliveryFromCheckoutForm(nigeria).phone,
      country: deliveryFromCheckoutForm(nigeria).country,
    },
    { phone: "+2348142445807", country: "NG" }
  )
  assert.equal(
    checkoutSchema.safeParse({
      ...form,
      phone: "+44 7400 123456",
      phoneCountry: "NG",
    }).success,
    false
  )
  assert.equal(
    checkoutSchema.safeParse({
      ...form,
      state: "Not a Nigerian state",
      phoneCountry: "NG",
    }).success,
    false
  )
  const uk = checkoutSchema.parse({
    ...form,
    phone: "+44 7400 123456",
    phoneCountry: "GB",
    state: "Greater London",
  })
  assert.equal(deliveryFromCheckoutForm(uk).country, "GB")
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
  const testLink =
    "https://checkout-v2.dev-flutterwave.com/v3/hosted/pay/94672f4c16dbdc682e6a"
  const liveLink = "https://checkout.flutterwave.com/v3/hosted/pay/live-example"
  assert.equal(
    api.hostedPaymentLink(
      sample.checkout,
      { ...sample.payment, link: testLink },
      now
    ),
    testLink
  )
  assert.equal(
    api.hostedPaymentLink(
      sample.checkout,
      { ...sample.payment, link: liveLink },
      now
    ),
    liveLink
  )
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
    "https://checkout.flutterwave.com.evil.example/payment",
    "https://checkout-v2.dev-flutterwave.com.evil.example/v3/hosted/pay/example",
    "https://checkout-v2.dev-flutterwave.com/other-path",
    "https://checkout-v2.dev-flutterwave.com/v3/hosted/pay/",
    "https://flutterwave.com/pay/example",
    "https://checkout.flutterwave.com/other-path",
    "https://checkout.flutterwave.com/v3/hosted/pay/example#redirect",
    "https://checkout.flutterwave.com:8443/v3/hosted/pay/example",
  ])
    assert.equal(
      api.hostedPaymentLink(sample.checkout, { ...sample.payment, link }, now),
      null
    )
  for (const provider of ["paystack", "payaza"])
    assert.equal(
      api.hostedPaymentLink(
        sample.checkout,
        { ...sample.payment, provider, link: testLink },
        now
      ),
      null
    )
  assert.equal(
    api.hostedPaymentLink(
      sample.checkout,
      {
        ...sample.payment,
        provider: "payaza",
        link: "https://payment.payaza.africa/pay/example",
      },
      now
    ),
    "https://payment.payaza.africa/pay/example"
  )
  assert.equal(
    api.hostedPaymentLink(
      sample.checkout,
      {
        ...sample.payment,
        provider: "paystack",
        link: "https://checkout.paystack.com/example",
      },
      now
    ),
    "https://checkout.paystack.com/example"
  )
  assert.equal(
    api.hostedPaymentLink(
      sample.checkout,
      { ...sample.payment, provider: undefined },
      now
    ),
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
  const store = new Map(),
    legacy = new Map()
  global.window = {
    sessionStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    },
    localStorage: {
      getItem: (key) => legacy.get(key) ?? null,
      setItem: (key, value) => legacy.set(key, value),
      removeItem: (key) => legacy.delete(key),
    },
  }
  try {
    recovery.rememberCheckout(account, command)
    assert.deepEqual(recovery.readRecovery(account).command, command)
    recovery.noteCheckoutIssue(account, "The response was interrupted.")
    assert.equal(
      recovery.readRecovery(account).issue,
      "The response was interrupted."
    )
    recovery.rememberCheckout(account, command)
    assert.equal(recovery.readRecovery(account).issue, undefined)
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
    recovery.clearRecovery(account)
    assert.equal(recovery.readRecovery(account).order, undefined)
    assert.equal(store.size, 0)
    window.sessionStorage.setItem = () => {
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
test("old checkout recovery migrates into session storage", () => {
  const store = new Map(),
    legacy = new Map()
  const key = `getty-checkout-v1:${account}`
  legacy.set(key, JSON.stringify({ order: sample.checkout.id, payments: {} }))
  global.window = {
    sessionStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    },
    localStorage: {
      getItem: (key) => legacy.get(key) ?? null,
      setItem: (key, value) => legacy.set(key, value),
      removeItem: (key) => legacy.delete(key),
    },
  }
  try {
    assert.equal(recovery.readRecovery(account).order, sample.checkout.id)
    assert.equal(legacy.has(key), false)
    assert.equal(JSON.parse(store.get(key)).order, sample.checkout.id)
  } finally {
    delete global.window
  }
})
