import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import Module, { createRequire } from "node:module"
import { test } from "node:test"
import ts from "typescript"

const require = createRequire(import.meta.url)
const root = process.cwd()
const resolve = Module._resolveFilename
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
const api = require("../features/orders/api/fulfilment.ts")
const orders = require("../features/orders/api/order-management.ts")
const data = require("../lib/api/data.ts")
const { GettyApiError } = require("../lib/api/errors.ts")
const { trackOrder } = require("../features/orders/api/track-order.ts")
const parcel = require("../features/orders/api/parcel-photo.ts")
const { backendRole } = require("../features/auth/server/backend-role.ts")
const { Role } = require("../lib/auth/roles.ts")
const {
  workspaceMenus,
  workspacePageTitle,
} = require("../lib/navigation/workspace-menu.ts")
const id = "11111111-1111-4111-8111-111111111111"
const other = "22222222-2222-4222-8222-222222222222"
const token = "33333333-3333-4333-8333-333333333333"

test("parcel photo is uploaded, reconciled, then attached only to ready or dispatch", async () => {
  const originalData = data.apiData
  const originalFetch = globalThis.fetch
  const calls = []
  data.apiData = async (path, options) => {
    calls.push({ path, body: options?.body && JSON.parse(options.body) })
    if (path === "/getty/v1/attachments/files")
      return {
        file: other,
        method: "POST",
        url: "https://uploads.example.test/parcel",
        headers: { "x-upload-key": "signed" },
      }
    return {
      newStatus: "verified",
      file: {
        id: other,
        ownerType: "order-parcel",
        owner: id,
        purpose: "parcel-photo",
      },
    }
  }
  globalThis.fetch = async (url, options) => {
    calls.push({
      url,
      method: options.method,
      credentials: options.credentials,
    })
    return { ok: true }
  }
  try {
    const uploaded = await parcel.uploadParcelPhoto(id, {
      name: "parcel.png",
      type: "image/png",
      size: 120,
    })
    assert.equal(uploaded, other)
    assert.deepEqual(
      calls.map((call) => call.path ?? call.url),
      [
        "/getty/v1/attachments/files",
        "https://uploads.example.test/parcel",
        `/getty/v1/attachments/files/${other}/reconcile`,
      ]
    )
    assert.deepEqual(calls[2].body, {
      ownerType: "order-parcel",
      ownerId: id,
      purpose: "parcel-photo",
    })
    assert.equal(calls[1].credentials, "omit")
    assert.equal(calls[1].method, "POST")
    assert.deepEqual(calls[0].body, {
      name: "parcel.png",
      mime: "image/png",
      extension: "png",
      size: 120,
    })
    assert.equal(
      api.fulfilmentActionSchema.safeParse({
        orderId: id,
        token,
        version: 5,
        action: "ready",
        parcelPhotoFileId: other,
      }).success,
      true
    )
    assert.equal(
      api.fulfilmentActionSchema.safeParse({
        orderId: id,
        token,
        version: 5,
        action: "deliver",
        parcelPhotoFileId: other,
      }).success,
      false
    )
  } finally {
    data.apiData = originalData
    globalThis.fetch = originalFetch
  }
})

test("buyer parcel link uses the order-specific authenticated path", async () => {
  const original = data.apiData
  data.apiData = async (path) => {
    assert.equal(path, `/getty/v1/order/${id}/parcel-photo`)
    return { url: "https://media.example.test/signed-parcel" }
  }
  try {
    assert.equal(
      await parcel.getParcelPhotoUrl(id, `/getty/v1/order/${id}/parcel-photo`),
      "https://media.example.test/signed-parcel"
    )
    await assert.rejects(() =>
      parcel.getParcelPhotoUrl(id, "https://other.example.test/steal")
    )
    assert.equal(
      parcel.fulfilmentHistoryAction.dispatched,
      "fulfilment-dispatch"
    )
    assert.equal(parcel.fulfilmentHistoryAction.delivered, "fulfilment-deliver")
  } finally {
    data.apiData = original
  }
})
test("unverified parcel uploads cannot be attached to fulfilment actions", async () => {
  const originalData = data.apiData
  const originalFetch = globalThis.fetch
  data.apiData = async (path) =>
    path === "/getty/v1/attachments/files"
      ? {
          file: other,
          method: "PUT",
          url: "https://uploads.example.test/parcel",
        }
      : { newStatus: "pending" }
  globalThis.fetch = async () => ({ ok: true })
  try {
    await assert.rejects(
      () =>
        parcel.uploadParcelPhoto(id, {
          name: "parcel.png",
          type: "image/png",
          size: 120,
        }),
      /not been verified/
    )
  } finally {
    data.apiData = originalData
    globalThis.fetch = originalFetch
  }
})

test("a verified upload can be used when reconciliation leaves purpose null", async () => {
  const originalData = data.apiData
  const originalFetch = globalThis.fetch
  data.apiData = async (path) =>
    path === "/getty/v1/attachments/files"
      ? {
          file: other,
          method: "PUT",
          url: "https://uploads.example.test/parcel",
        }
      : {
          newStatus: "verified",
          file: {
            id: other,
            ownerType: "order-parcel",
            owner: id,
            purpose: null,
          },
        }
  globalThis.fetch = async () => ({ ok: true })
  try {
    assert.equal(
      await parcel.uploadParcelPhoto(id, {
        name: "parcel.jpg",
        type: "image/jpeg",
        size: 120,
      }),
      other
    )
  } finally {
    data.apiData = originalData
    globalThis.fetch = originalFetch
  }
})

test("ready action sends the verified parcel file ID unchanged", async (t) => {
  const calls = []
  t.mock.method(data, "apiData", async (...args) => {
    calls.push(args)
    return ops
  })
  await api.postFulfilmentAction(
    {
      orderId: id,
      token,
      version: 5,
      action: "ready",
      parcelPhotoFileId: other,
    },
    "operations"
  )
  assert.equal(calls[0][0], "/getty/v1/order/actions")
  assert.deepEqual(JSON.parse(calls[0][1].body), {
    orderId: id,
    token,
    version: 5,
    action: "ready",
    parcelPhotoFileId: other,
  })
})

test("a temporary parcel lookup 404 retries the identical ready action once", async (t) => {
  const calls = []
  let checkedSession = 0
  t.mock.method(data, "apiData", async (...args) => {
    calls.push(args)
    if (calls.length === 1)
      throw new GettyApiError("Parcel photo was not found", 404)
    return ops
  })
  const body = {
    orderId: id,
    token,
    version: 5,
    action: "ready",
    parcelPhotoFileId: other,
  }
  await api.postOperationsActionWithPhotoRetry(body, () => {
    checkedSession++
  })
  assert.equal(checkedSession, 1)
  assert.equal(calls.length, 2)
  assert.deepEqual(JSON.parse(calls[0][1].body), body)
  assert.deepEqual(JSON.parse(calls[1][1].body), body)
})

test("an order action without a photo is not retried on 404", async (t) => {
  let calls = 0
  t.mock.method(data, "apiData", async () => {
    calls++
    throw new GettyApiError("Order not found", 404)
  })
  await assert.rejects(() =>
    api.postOperationsActionWithPhotoRetry(
      { orderId: id, token, version: 5, action: "ready" },
      () => assert.fail("No retry expected")
    )
  )
  assert.equal(calls, 1)
})
const item = (itemId, status) => ({
  id: itemId,
  seller: itemId,
  name: "Gloves",
  variant: "Box",
  quantity: 1,
  status: "pending",
  version: 2,
  supply: { status, reference: null, updated: null },
})
const ops = {
  id,
  orderCode: "2610-K7P4",
  status: "processing",
  fulfilment: "preparing",
  version: 5,
  items: [item(id, "received"), item(other, "supplied")],
  history: [],
}
test("operations detail keeps commercial and delivery fields for admin review", () => {
  const detail = api.operationsOrderSchema.parse({
    ...ops,
    subtotal: 1000,
    shipping: 100,
    tax: 70,
    discount: 0,
    total: 1100,
    notes: "Call on arrival",
    items: [
      {
        ...item(id, "received"),
        unit: "box",
        pack: 1,
        price: 1000,
        total: 1100,
      },
    ],
  })
  assert.equal(detail.notes, "Call on arrival")
  assert.equal(detail.total, 1100)
  assert.equal(detail.items[0].price, 1000)
})
const vendor = {
  id,
  reference: "G-1",
  orderCode: "2610-K7P4",
  currency: "NGN",
  status: "processing",
  fulfilment: "preparing",
  placed: "2026-10-13T10:00:00+01:00",
  total: 1000,
  items: [
    {
      ...item(id, "accepted"),
      product: id,
      variant: id,
      sku: "G1",
      unit: "box",
      pack: 1,
      price: 1000,
      total: 1000,
      returnstate: "none",
    },
  ],
}

test("only support operations profiles enter the Getty operations workspace", () => {
  assert.equal(backendRole("support", "operations"), Role.ADMIN)
  assert.equal(backendRole("vendor", "administrator"), Role.SUPPLIER)
  assert.equal(backendRole("customer", "operations"), Role.CUSTOMER)
})

test("admin sidebar shows Orders without a separate fulfilment link", () => {
  const links = workspaceMenus.admin.filter((item) => "href" in item)
  assert.ok(
    links.some(
      (item) => item.label === "Orders" && item.href === "/admin/orders"
    )
  )
  assert.ok(links.every((item) => item.href !== "/admin/fulfilment"))
  assert.equal(workspacePageTitle("admin", "/admin/orders"), "Orders")
  assert.equal(
    workspacePageTitle("admin", "/admin/fulfilment"),
    "Order fulfilment"
  )
  assert.equal(
    workspacePageTitle("admin", `/admin/fulfilment/${id}`),
    "Order details"
  )
})

test("Getty can advance delivery stages independently of supplier handovers", () => {
  assert.equal(api.canAdvanceFulfilment(ops), "ready")
  assert.equal(
    api.canAdvanceFulfilment({
      ...ops,
      items: [item(id, "received"), item(other, "received")],
    }),
    "ready"
  )
  assert.equal(
    api.canAdvanceFulfilment({
      ...ops,
      status: "confirmed",
      fulfilment: "placed",
    }),
    "preparing"
  )
  assert.equal(
    api.canAdvanceFulfilment({
      ...ops,
      status: "pending",
      fulfilment: "placed",
    }),
    null
  )
  assert.equal(
    api.canAdvanceFulfilment({
      ...ops,
      fulfilment: "ready",
      items: [item(id, "accepted")],
    }),
    "dispatch"
  )
  assert.equal(
    api.canAdvanceFulfilment({
      ...ops,
      fulfilment: "ready",
      items: [item(id, "received")],
    }),
    "dispatch"
  )
  assert.deepEqual(
    api.operationsSupplyActions(
      { ...ops, fulfilment: "ready" },
      item(id, "received")
    ),
    ["return-to-vendor"]
  )
  assert.equal(
    api.canAdvanceFulfilment({ ...ops, items: [item(id, "accepted")] }),
    "ready"
  )
  assert.equal(
    api.canAdvanceFulfilment({ ...ops, items: [item(id, "pending")] }),
    "ready"
  )
  assert.equal(
    api.canAdvanceFulfilment({ ...ops, fulfilment: "preparing", items: [] }),
    null
  )
})

test("supplier and Getty custody actions are separate and use item revisions", async (t) => {
  assert.equal(api.supplierActionFor(vendor, vendor.items[0]), "supply")
  assert.equal(
    api.supplierActionFor({ ...vendor, fulfilment: "placed" }, vendor.items[0]),
    null
  )
  assert.deepEqual(api.operationsSupplyActions(ops, ops.items[1]), [
    "receive",
    "return-to-vendor",
  ])
  assert.deepEqual(
    api.operationsSupplyActions(
      { ...ops, fulfilment: "dispatched" },
      ops.items[1]
    ),
    []
  )
  const calls = []
  t.mock.method(data, "apiData", async (...args) => {
    calls.push(args)
    return calls.length === 1 ? vendor : ops
  })
  await api.postSupplyAction(
    {
      orderId: id,
      itemId: other,
      version: 2,
      token,
      action: "supply",
      reference: "HANDOVER-1",
    },
    "vendor"
  )
  await api.postSupplyAction(
    {
      orderId: id,
      itemId: other,
      version: 2,
      token,
      action: "receive",
      reference: "GETTY-1",
    },
    "operations"
  )
  assert.equal(calls[0][0], "/getty/v1/order/supply/actions")
  assert.deepEqual(JSON.parse(calls[0][1].body), {
    orderId: id,
    itemId: other,
    version: 2,
    token,
    action: "supply",
    reference: "HANDOVER-1",
  })
  assert.equal(calls[1][0], "/getty/v1/order/supply/actions")
  await assert.rejects(() =>
    api.postSupplyAction(
      {
        orderId: id,
        itemId: other,
        version: 2,
        token,
        action: "receive",
        reference: "GETTY-1",
      },
      "vendor"
    )
  )
  await assert.rejects(() =>
    api.postSupplyAction(
      {
        orderId: id,
        itemId: other,
        version: 2,
        token,
        action: "supply",
        reference: "HANDOVER-1",
      },
      "operations"
    )
  )
  assert.equal(calls.length, 2)
})

test("whole-order actions send only order ID, order revision and required evidence", async (t) => {
  const calls = []
  t.mock.method(data, "apiData", async (...args) => {
    calls.push(args)
    return calls.length === 1
      ? ops
      : { ...vendor, status: "completed", fulfilment: "delivered" }
  })
  await api.postFulfilmentAction(
    {
      orderId: id,
      token,
      version: 5,
      action: "dispatch",
      carrier: "Getty",
      tracking: "WAYBILL-1",
    },
    "operations"
  )
  await api.postFulfilmentAction(
    { orderId: id, token, version: 6, action: "deliver" },
    "customer"
  )
  assert.deepEqual(JSON.parse(calls[0][1].body), {
    orderId: id,
    token,
    version: 5,
    action: "dispatch",
    carrier: "Getty",
    tracking: "WAYBILL-1",
  })
  assert.deepEqual(JSON.parse(calls[1][1].body), {
    orderId: id,
    token,
    version: 6,
    action: "deliver",
  })
  await assert.rejects(() =>
    api.postFulfilmentAction(
      {
        orderId: id,
        token,
        version: 6,
        action: "dispatch",
        carrier: "Getty",
        tracking: "WAYBILL-1",
      },
      "customer"
    )
  )
  await assert.rejects(() =>
    api.postFulfilmentAction(
      { orderId: id, token, version: 6, action: "deliver" },
      "operations"
    )
  )
  assert.equal(calls.length, 2)
})

test("operations and supplier queues use their own routes, filters and cursor direction", async (t) => {
  const calls = []
  t.mock.method(data, "apiData", async (...args) => {
    calls.push(args)
    return {
      items: [],
      records: 0,
      isNext: false,
      isPrevious: false,
      nextCursor: 0,
      previousCursor: 0,
    }
  })
  await api.getFulfilmentQueue(
    { from: "2026-10-01", through: "2026-10-31", fulfilment: "preparing" },
    42,
    "previous"
  )
  await orders.getOrders("vendor", {
    from: "2026-10-01",
    through: "2026-10-31",
    status: "",
    itemStatus: "",
    supplyStatus: "supplied",
  })
  const operations = new URL(calls[0][0], "https://example.test")
  const supplier = new URL(calls[1][0], "https://example.test")
  assert.equal(operations.pathname, "/getty/v1/order/fulfilment")
  assert.equal(operations.searchParams.get("starts"), "2026-10-01")
  assert.equal(operations.searchParams.get("end"), "2026-11-01")
  assert.equal(operations.searchParams.get("fulfilment"), "preparing")
  assert.equal(operations.searchParams.get("cursor"), "42")
  assert.equal(operations.searchParams.get("navigation"), "previous")
  assert.equal(supplier.pathname, "/getty/v1/order/vendor")
  assert.equal(supplier.searchParams.get("supplyStatus"), "supplied")
})

test("fulfilment date-only bounds include the through day across a year boundary", () => {
  assert.deepEqual(
    api.fulfilmentDateBounds({
      from: "2026-12-31",
      through: "2026-12-31",
      fulfilment: "",
    }),
    {
      starts: "2026-12-31",
      end: "2027-01-01",
    }
  )
})

test("fulfilment current-day range uses date-only bounds", () => {
  assert.deepEqual(
    api.fulfilmentDateBounds({
      from: "2026-11-01",
      through: "2026-11-12",
      fulfilment: "",
    }),
    {
      starts: "2026-11-01",
      end: "2026-11-13",
    }
  )
})

test("public tracking normalizes the order code and omits credentials", async (t) => {
  const calls = []
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ path: new URL(url).pathname, options })
    return new Response(
      JSON.stringify({
        status: 200,
        success: true,
        data: {
          orderCode: "2610-K7P4",
          status: "processing",
          fulfilment: "ready",
          placed: "2026-11-19T10:00:00+01:00",
          estimatedDelivery: null,
          timeline: [
            { status: "placed", at: "2026-11-19T10:00:00+01:00" },
            { status: "ready", at: "2026-11-19T12:00:00+01:00" },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  })
  const result = await trackOrder({ orderNumber: " 2610-k7p4 " })
  assert.equal(result.fulfilment, "ready")
  assert.deepEqual(
    result.timeline.map((entry) => entry.status),
    ["placed", "ready"]
  )
  assert.equal(calls.length, 1)
  assert.equal(calls[0].path, "/getty/ecommerce/orders/tracking/2610-K7P4")
  assert.equal(calls[0].options.credentials, "omit")
  assert.equal(calls[0].options.cache, "no-store")
  await assert.rejects(trackOrder({ orderNumber: "bad" }))
  assert.equal(calls.length, 1)
})

test("public tracking observes rate-limit headers and never refreshes on 401", async (t) => {
  const calls = []
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(new URL(url).pathname)
    return calls.length === 1
      ? new Response(JSON.stringify({ retryAfterSeconds: 12 }), {
          status: 429,
          headers: { "Retry-After": "87" },
        })
      : new Response(JSON.stringify({ status: 401, success: false }), {
          status: 401,
        })
  })
  await assert.rejects(
    trackOrder({ orderNumber: "2611-K7P4" }),
    (error) => error.status === 429 && error.retryAfterSeconds === 87
  )
  await assert.rejects(
    trackOrder({ orderNumber: "2611-K7P4" }),
    (error) => error.status === 401
  )
  assert.deepEqual(calls, [
    "/getty/ecommerce/orders/tracking/2611-K7P4",
    "/getty/ecommerce/orders/tracking/2611-K7P4",
  ])
})
