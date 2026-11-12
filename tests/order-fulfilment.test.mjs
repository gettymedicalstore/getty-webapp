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
const { trackOrder } = require("../features/orders/api/track-order.ts")
const { backendRole } = require("../features/auth/server/backend-role.ts")
const { Role } = require("../lib/auth/roles.ts")
const {
  workspaceMenus,
  workspacePageTitle,
} = require("../lib/navigation/workspace-menu.ts")
const id = "11111111-1111-4111-8111-111111111111"
const other = "22222222-2222-4222-8222-222222222222"
const token = "33333333-3333-4333-8333-333333333333"
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

test("admin Orders and Order fulfilment have distinct navigation and detail breadcrumbs", () => {
  const links = workspaceMenus.admin.filter((item) => "href" in item)
  assert.ok(
    links.some(
      (item) => item.label === "Orders" && item.href === "/admin/orders"
    )
  )
  assert.ok(
    links.some(
      (item) =>
        item.label === "Order fulfilment" && item.href === "/admin/fulfilment"
    )
  )
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

test("Getty cannot mark ready until every active supplier item is physically received", () => {
  assert.equal(api.canAdvanceFulfilment(ops), null)
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
    null
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
    null
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

test("printed-code lookup uses authenticated buyer or supplier scope", async (t) => {
  const calls = []
  t.mock.method(data, "apiData", async (path) => {
    calls.push(path)
    return vendor
  })
  await trackOrder({ orderNumber: " 2610-K7P4 " }, "customer")
  await trackOrder({ orderNumber: "2610-K7P4" }, "vendor")
  assert.deepEqual(calls, [
    "/getty/v1/order/code/2610-K7P4",
    "/getty/v1/order/vendor/code/2610-K7P4",
  ])
})
