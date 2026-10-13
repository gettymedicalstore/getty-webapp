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
const client = require("../lib/api/client.ts")
const session = require("../features/auth/api/session-store.ts")
const device = require("../features/cart/api/device-cart.ts")
const { mergeBuyerCart } = require("../features/cart/api/merge-cart.ts")
const id = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222"
const storage = new Map()
const storageApi = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
}
globalThis.window = {
  localStorage: storageApi,
  sessionStorage: { getItem: () => null, removeItem: () => {} },
  addEventListener() {},
  dispatchEvent() {},
}
const envelope = (data) => ({ status: 200, success: true, message: "OK", data })
const line = (quantity = 3, variant = id) => ({
  id,
  seller: id,
  product: id,
  variant,
  name: "Gloves",
  sku: "GL100",
  options: {},
  unit: "box",
  pack: 100,
  quantity,
  currency: "NGN",
  price: 7500,
  subtotal: 7500 * quantity,
  minimum: 1,
  available: 40,
  purchasable: true,
})
const cart = (items = [line()]) => ({
  id,
  currency: "NGN",
  status: "active",
  expires: null,
  modified: null,
  version: 2,
  expired: false,
  items,
  subtotal: items.reduce((s, row) => s + row.subtotal, 0),
})
const guest = (quantity = 2, variantId = id) => ({
  productId: id,
  variantId,
  quantity,
  product: {
    id,
    variantId,
    name: "Gloves",
    slug: id,
    image: "/images/product-placeholder.svg",
    price: 99,
    stock: 40,
    active: true,
  },
})
function setup(t, items = [guest()]) {
  storage.clear()
  session.saveSession(
    {
      id: "buyer",
      email: "buyer@example.test",
      name: "Buyer",
      role: "customer",
    },
    "fixture-token"
  )
  storage.set(device.DEVICE_CART_KEY, JSON.stringify(items))
  const original = client.apiRequest
  t.after(() => {
    client.apiRequest = original
    storage.clear()
  })
}
function mergeResponse(payload, results, view = cart([line(5)])) {
  return envelope({
    token: payload.token,
    replayed: false,
    results:
      results ??
      payload.items.map((item) => ({
        ...item,
        status: "merged",
        resultingQuantity: 5,
      })),
    cart: view,
  })
}
test("guest merge adds once, reads first, sends only IDs and quantities, and keeps authoritative cart metadata", async (t) => {
  setup(t)
  const calls = []
  client.apiRequest = async (url, options) => {
    calls.push({ url, ...options })
    return options.method === "POST"
      ? mergeResponse(JSON.parse(options.body))
      : envelope(cart([line(calls.length > 2 ? 5 : 3)]))
  }
  const [first, second] = await Promise.all([
    device.loadBuyerCart(),
    device.loadBuyerCart(),
  ])
  assert.equal(first, second)
  assert.equal(first.items[0].quantity, 5)
  assert.equal(first.subtotal, 37500)
  assert.equal(first.version, 2)
  assert.equal(first.id, id)
  assert.deepEqual(
    calls.map((call) => call.url),
    ["/getty/v1/order/cart", "/getty/v1/order/cart/merge"]
  )
  const payload = JSON.parse(calls[1].body)
  assert.deepEqual(Object.keys(payload).sort(), ["items", "token"])
  assert.deepEqual(payload.items, [{ variant: id, quantity: 2 }])
  assert.deepEqual(device.readDeviceItems(), [])
  await device.loadBuyerCart()
  assert.equal(calls.filter((call) => call.method === "POST").length, 1)
})
test("ambiguous failures keep exact token and items for retry and prevent guest editing", async (t) => {
  setup(t)
  const bodies = []
  client.apiRequest = async (url, options) => {
    if (options.method !== "POST") return envelope(cart())
    bodies.push(options.body)
    if (bodies.length === 1) throw new Error("Connection lost after sending")
    return mergeResponse(JSON.parse(options.body))
  }
  await assert.rejects(device.loadBuyerCart(), /Connection lost/)
  assert.equal(device.readDeviceItems()[0].quantity, 2)
  assert.equal(device.deviceMergeAttempt().status, "pending")
  assert.throws(
    () => device.assertGuestItemsEditable(),
    /still being confirmed/
  )
  await device.loadBuyerCart()
  assert.equal(bodies[0], bodies[1])
  assert.deepEqual(device.readDeviceItems(), [])
})
test("partial rejects remain editable without repeated automatic merges; corrected items get a fresh token", async (t) => {
  setup(t, [guest(), guest(50, other)])
  const bodies = []
  client.apiRequest = async (url, options) => {
    if (options.method !== "POST") return envelope(cart([line(5)]))
    const payload = JSON.parse(options.body)
    bodies.push(payload)
    if (bodies.length === 1)
      return mergeResponse(payload, [
        { variant: id, quantity: 2, status: "merged", resultingQuantity: 5 },
        {
          variant: other,
          quantity: 50,
          status: "rejected",
          code: "quantity_conflict",
          message: "Only 10 boxes available",
          available: 10,
          existing: 0,
        },
      ])
    return mergeResponse(payload)
  }
  await device.loadBuyerCart()
  assert.deepEqual(
    device.readDeviceItems().map((item) => [item.variantId, item.quantity]),
    [[other, 50]]
  )
  device.assertGuestItemsEditable()
  await device.loadBuyerCart()
  assert.equal(bodies.length, 1)
  device.saveDeviceItems([guest(2, other)])
  await device.loadBuyerCart()
  assert.notEqual(bodies[0].token, bodies[1].token)
  assert.deepEqual(bodies[1].items, [{ variant: other, quantity: 2 }])
  assert.deepEqual(device.readDeviceItems(), [])
})
test("malformed or mismatched merge receipts remain pending instead of discarding guest lines", async (t) => {
  setup(t)
  client.apiRequest = async (url, options) =>
    options.method === "POST"
      ? mergeResponse(JSON.parse(options.body), [])
      : envelope(cart())
  await assert.rejects(device.loadBuyerCart(), /incomplete/)
  assert.equal(device.deviceMergeAttempt().status, "pending")
  assert.equal(device.readDeviceItems().length, 1)
  client.apiRequest = async () =>
    envelope({ token: other, results: [], replayed: false, cart: cart() })
  await assert.rejects(
    mergeBuyerCart({ token: id, items: [{ variant: id, quantity: 2 }] }),
    /could not be confirmed/
  )
})
test("a failed local receipt write retries the original merge token and removes accepted items only once", async (t) => {
  setup(t)
  const originalSet = storageApi.setItem,
    bodies = []
  let rejectReceipt = true
  storageApi.setItem = (key, value) => {
    if (
      key === device.DEVICE_CART_KEY &&
      JSON.parse(value).merge?.status === "complete" &&
      rejectReceipt
    )
      throw new Error("Storage unavailable")
    originalSet(key, value)
  }
  t.after(() => {
    storageApi.setItem = originalSet
  })
  client.apiRequest = async (url, options) => {
    if (options.method !== "POST") return envelope(cart())
    bodies.push(options.body)
    return mergeResponse(JSON.parse(options.body))
  }
  await assert.rejects(
    device.loadBuyerCart(),
    /could not save the confirmation/
  )
  assert.equal(device.readDeviceItems()[0].quantity, 2)
  rejectReceipt = false
  await device.loadBuyerCart()
  assert.equal(bodies[0], bodies[1])
  assert.deepEqual(device.readDeviceItems(), [])
})
test("an uncertain merge cannot be sent to a different customer", async (t) => {
  setup(t)
  let posts = 0
  client.apiRequest = async (url, options) => {
    if (options.method === "POST") {
      posts++
      throw new Error("Connection lost")
    }
    return envelope(cart())
  }
  await assert.rejects(device.loadBuyerCart(), /Connection lost/)
  session.saveSession(
    {
      id: "other-buyer",
      email: "other@example.test",
      name: "Other",
      role: "customer",
    },
    "fixture-other"
  )
  await assert.rejects(device.loadBuyerCart(), /account that started/)
  assert.equal(posts, 1)
})
test("definitive validation failures preserve items and allow a correction", async (t) => {
  setup(t)
  client.apiRequest = async (url, options) => {
    if (options.method === "POST")
      throw new client.GettyApiError("Quantity is invalid", 400)
    return envelope(cart())
  }
  await assert.rejects(device.loadBuyerCart(), /Quantity is invalid/)
  assert.equal(device.deviceMergeAttempt().status, "complete")
  assert.equal(device.deviceMergeAttempt().results[0].status, "rejected")
  device.assertGuestItemsEditable()
  assert.equal(device.readDeviceItems()[0].quantity, 2)
})
