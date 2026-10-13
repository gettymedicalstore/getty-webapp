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
const api = require("../features/orders/api/order-management.ts")
const data = require("../lib/api/data.ts")
const recovery = require("../features/orders/api/action-recovery.ts")
const orderId = "11111111-1111-4111-8111-000000000005"
const lineId = "11111111-1111-4111-8111-000000000006"
const token = "11111111-1111-4111-8111-000000000205"
const filters = {
  from: "2026-10-01",
  through: "2026-10-31",
  status: "confirmed",
  itemStatus: "accepted",
}
const summary = {
  id: orderId,
  reference: "GETTY-1",
  currency: "NGN",
  placed: "2026-10-06T09:00:00+01:00",
  status: "confirmed",
  total: 10500,
  cursor: 42,
}
const line = {
  id: lineId,
  product: "product",
  variant: "variant",
  name: "Gloves",
  sku: "G1",
  unit: "box",
  pack: 100,
  quantity: 1,
  price: 7500,
  total: 10500,
  status: "pending",
  version: 1,
  returnstate: "none",
  tracking: {},
}
const detail = {
  ...summary,
  version: 1,
  delivery: {
    name: "Tester",
    phone: "+2348000000000",
    address: "1 Test",
    city: "Abuja",
    state: "FCT",
    country: "NG",
    postcode: null,
  },
  items: [line],
  payments: [],
  history: [],
}
const page = {
  items: [summary],
  records: 75,
  isNext: true,
  isPrevious: false,
  nextCursor: 42,
  previousCursor: 0,
}

test("order details retain the supplied inclusive tax breakdown and optional fields for both audiences", async (t) => {
  const supplied = {
    ...detail,
    version: 7,
    modified: "2026-10-13T11:03:00+01:00",
    subtotal: 400000,
    discount: 0,
    shipping: 3000,
    tax: 27906.9767,
    total: 403000,
    items: [
      {
        ...line,
        sku: "SKU-11111111111141118111000000000006",
        options: {},
        unit: "piece",
        pack: 1,
        price: 400000,
        discount: 0,
        shipping: 3000,
        tax: 27906.9767,
        total: 403000,
        taxes: [{ name: "VAT", rate: 7.5, amount: 27906.9767 }],
        received: null,
        tracking: {},
      },
    ],
    payments: [
      {
        id: token,
        kind: "charge",
        amount: 403000,
        method: null,
        status: "succeeded",
        settled: "2026-10-13T11:02:00+01:00",
        currency: "NGN",
      },
    ],
    history: [
      {
        id: token,
        item: null,
        after: "pending",
        entry: "2026-10-13T11:00:00+01:00",
        action: "placed",
        before: "draft",
        reason: null,
      },
    ],
  }
  const calls = []
  t.mock.method(data, "apiData", async (path) => {
    calls.push(path)
    return supplied
  })
  for (const audience of ["customer", "vendor"]) {
    const parsed = await api.getOrder(audience, orderId)
    assert.deepEqual(parsed, supplied)
    assert.equal(parsed.tax, 27906.9767)
    assert.equal(parsed.items[0].taxes[0].amount, 27906.9767)
    assert.equal(parsed.total, parsed.subtotal + parsed.shipping)
    assert.notEqual(
      parsed.total,
      parsed.subtotal + parsed.shipping + parsed.tax
    )
  }
  assert.deepEqual(calls, [
    `/getty/v1/order/${orderId}`,
    `/getty/v1/order/vendor/${orderId}`,
  ])
  const pending = api.orderDetailSchema.parse({
    ...supplied,
    modified: null,
    items: [
      {
        ...supplied.items[0],
        options: { size: "Medium", gauge: 18, sterile: true, finish: null },
      },
    ],
    payments: [{ ...supplied.payments[0], settled: null, status: "pending" }],
  })
  assert.equal(pending.modified, null)
  assert.equal(pending.payments[0].settled, null)
  assert.equal(pending.payments[0].method, null)
  assert.deepEqual(pending.items[0].options, {
    size: "Medium",
    gauge: 18,
    sterile: true,
    finish: null,
  })
  assert.deepEqual(pending.items[0].tracking, {})
  // Older list/detail responses may omit the new fields.
  assert.deepEqual(api.orderDetailSchema.parse(detail), detail)
  assert.equal(
    api.orderSummarySchema.parse({ ...summary, discount: 0 }).discount,
    0
  )
})

test("orders use the documented audience endpoint, Lagos inclusive dates, total records and exclusive cursors", async () => {
  const original = data.apiData,
    calls = []
  data.apiData = async (...args) => {
    calls.push(args)
    return page
  }
  try {
    assert.deepEqual(await api.getOrders("customer", filters), page)
    const first = new URL(calls[0][0], "https://example.test")
    assert.equal(first.pathname, "/getty/v1/order")
    assert.deepEqual(Object.fromEntries(first.searchParams), {
      starts: "2026-09-30T23:00:00.000Z",
      end: "2026-10-31T23:00:00.000Z",
      cursor: "0",
      navigation: "next",
      limit: "20",
      status: "confirmed",
    })
    await api.getOrders("vendor", filters, 42, "previous")
    const next = new URL(calls[1][0], "https://example.test")
    assert.equal(next.pathname, "/getty/v1/order/vendor")
    assert.equal(next.searchParams.get("itemStatus"), "accepted")
    assert.equal(next.searchParams.get("cursor"), "42")
    assert.equal(next.searchParams.get("navigation"), "previous")
    assert.deepEqual(
      api.orderPageSchema.parse({
        ...page,
        items: [],
        isNext: false,
        nextCursor: 0,
      }).records,
      75
    )
  } finally {
    data.apiData = original
  }
})
test("date filters reject invalid and reversed dates and span year boundaries correctly", () => {
  assert.throws(() =>
    api.orderDateBounds({ ...filters, through: "2026-02-31" })
  )
  assert.throws(() => api.orderDateBounds({ ...filters, from: "2026-11-01" }))
  assert.deepEqual(
    api.orderDateBounds({
      ...filters,
      from: "2026-12-31",
      through: "2026-12-31",
    }),
    { starts: "2026-12-30T23:00:00.000Z", end: "2026-12-31T23:00:00.000Z" }
  )
  assert.deepEqual(api.defaultOrderFilters(new Date("2026-09-30T23:30:00Z")), {
    from: "2026-10-01",
    through: "2026-10-01",
    status: "",
    itemStatus: "",
  })
})
test("line actions use order-line IDs and current versions, with the caller's stable token", async () => {
  const original = data.apiData,
    calls = []
  data.apiData = async (...args) => {
    calls.push(args)
    return detail
  }
  try {
    const payload = {
      token,
      version: 3,
      action: "ship",
      carrier: "DHL",
      tracking: "TRACK-10",
    }
    await api.actOnOrderLine("vendor", orderId, lineId, payload)
    await api.actOnOrderLine("vendor", orderId, lineId, payload)
    assert.equal(
      calls[0][0],
      `/getty/v1/order/vendor/${orderId}/items/${lineId}/actions`
    )
    assert.deepEqual(JSON.parse(calls[0][1].body), payload)
    assert.equal(calls[0][1].body, calls[1][1].body)
    await assert.rejects(() =>
      api.actOnOrderLine("customer", orderId, lineId, payload)
    )
    assert.equal(calls.length, 2)
    await api.cancelOrder(orderId, {
      token,
      version: 2,
      reason: "No longer needed",
    })
    assert.equal(calls[2][0], `/getty/v1/order/${orderId}/cancel`)
    assert.deepEqual(JSON.parse(calls[2][1].body), {
      token,
      version: 2,
      reason: "No longer needed",
    })
  } finally {
    data.apiData = original
  }
})
test("ship, cancellation and return actions validate required fields before a mutation", () => {
  assert.throws(() =>
    api.actionSchema.parse({ token, version: 1, action: "ship" })
  )
  assert.throws(() =>
    api.actionSchema.parse({
      token,
      version: 1,
      action: "cancel",
      reason: "  ",
    })
  )
  assert.throws(() =>
    api.actionSchema.parse({
      token,
      version: 1,
      action: "receive-return",
      reason: "Checked",
    })
  )
  assert.equal(
    api.actionSchema.parse({
      token,
      version: 1,
      action: "receive-return",
      reason: "Damaged",
      restock: false,
    }).restock,
    false
  )
  assert.throws(() =>
    api.actionSchema.parse({ token, version: 0, action: "accept" })
  )
})
test("available actions honour seller versus buyer, payment state, line state and return window", () => {
  assert.deepEqual(
    api.availableLineActions("vendor", { ...detail, status: "pending" }, line),
    ["cancel"]
  )
  assert.deepEqual(api.availableLineActions("vendor", detail, line), [
    "accept",
    "cancel",
  ])
  assert.deepEqual(
    api.availableLineActions("customer", detail, {
      ...line,
      status: "accepted",
    }),
    []
  )
  assert.deepEqual(
    api.availableLineActions("customer", detail, {
      ...line,
      status: "shipped",
    }),
    ["deliver"]
  )
  assert.deepEqual(
    api.availableLineActions("vendor", detail, {
      ...line,
      status: "delivered",
      returnstate: "requested",
    }),
    ["approve-return", "reject-return"]
  )
  const received = "2026-10-01T12:00:00Z"
  assert.deepEqual(
    api.availableLineActions(
      "customer",
      { ...detail, status: "completed" },
      { ...line, status: "delivered", received },
      Date.parse("2026-10-02T12:00:00Z")
    ),
    ["request-return"]
  )
  assert.deepEqual(
    api.availableLineActions(
      "customer",
      detail,
      { ...line, status: "delivered", received },
      Date.parse("2026-10-16T12:00:00Z")
    ),
    []
  )
  assert.deepEqual(
    api.availableLineActions("vendor", { ...detail, status: "expired" }, line),
    []
  )
})
test("finance recovery uses the support queue and never retries an uncertain refund", async () => {
  const original = data.apiData,
    calls = []
  const payment = {
    id: "payment",
    purchase: orderId,
    kind: "refund",
    status: "failed",
    amount: 100,
    currency: "NGN",
    failure: "Provider confirmed failure",
  }
  data.apiData = async (...args) => {
    calls.push(args)
    return args[0].includes("?") ? [payment] : payment
  }
  try {
    assert.deepEqual(await api.getRecoveryPayments(filters), [payment])
    assert.equal(
      new URL(calls[0][0], "https://example.test").pathname,
      "/getty/v1/order/support/payments"
    )
    await api.reconcilePayment("payment")
    assert.deepEqual(calls[1], [
      "/getty/v1/order/support/payments/payment/reconcile",
      { method: "POST" },
    ])
    for (const status of ["unknown", "pending", "succeeded"])
      await assert.rejects(() => api.retryRefund({ ...payment, status }, token))
    assert.equal(calls.length, 2)
    await api.retryRefund(payment, token)
    assert.equal(
      calls[2][0],
      "/getty/v1/order/support/payments/payment/retry-refund"
    )
    assert.deepEqual(JSON.parse(calls[2][1].body), { token })
  } finally {
    data.apiData = original
  }
})
test("action recovery persists an exact token across retries and refuses to send if storage fails", () => {
  const previous = globalThis.window,
    map = new Map()
  globalThis.window = {
    localStorage: {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => map.set(key, value),
      removeItem: (key) => map.delete(key),
    },
  }
  try {
    const payload = { version: 1, action: "accept" }
    const first = recovery.prepareOrderAction("user:order:line", payload)
    assert.deepEqual(
      recovery.prepareOrderAction("user:order:line", payload),
      first
    )
    assert.throws(
      () =>
        recovery.prepareOrderAction("user:order:line", {
          ...payload,
          version: 2,
        }),
      /awaiting confirmation/
    )
    assert.equal(
      recovery.pendingOrderAction("user:order:line").token,
      first.token
    )
    recovery.clearOrderAction("user:order:line")
    assert.equal(map.size, 0)
    globalThis.window.localStorage.setItem = () => {
      throw new Error("storage blocked")
    }
    assert.throws(
      () => recovery.prepareOrderAction("user:order:line", payload),
      /storage blocked/
    )
  } finally {
    globalThis.window = previous
  }
})
