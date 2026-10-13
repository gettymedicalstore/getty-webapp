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
const schema = require("../features/featured/schema.ts")
const api = require("../features/featured/api/featured.ts")
const data = require("../lib/api/data.ts")
const client = require("../lib/api/client.ts")
const photos = require("../features/admin/api/product-photos.ts")
const entry = {
  id: "advert-1",
  product: { id: "product-1", name: "Gloves" },
  tenant: { id: "vendor-1", name: "Getty" },
  photo: "photo-1",
  caption: "Everyday care",
  starts: "2026-10-15T09:00:00+01:00",
  ends: "2026-10-22T23:59:00+01:00",
  ordinal: 0,
}
const form = {
  tenant: "vendor-1",
  product: "product-1",
  photo: "photo-1",
  caption: "Care",
  starts: "2099-10-15T09:00",
  ends: "2099-10-22T23:59",
  ordinal: "0",
}
test("featured dropdowns use vendor options endpoints and array responses", async () => {
  const original = data.apiData
  const calls = []
  const vendor = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Acacia Medical Supplies",
  }
  const product = {
    id: "22222222-2222-4222-8222-222222222222",
    variant: "33333333-3333-4333-8333-333333333333",
    name: "Examination Gloves",
    variantName: "Box of 100",
    currency: "NGN",
    price: 10000,
    salePrice: 8500,
    discount: 8500,
  }
  data.apiData = async (...args) => {
    calls.push(args)
    return args[0] === "/getty/v1/tenant/vendors/options" ? [vendor] : [product]
  }
  try {
    assert.deepEqual(await api.getFeaturedOptions("vendors"), [vendor])
    assert.deepEqual(await api.getFeaturedOptions("products", vendor.id), [
      { id: product.id, name: product.name },
    ])
    assert.deepEqual(calls, [
      ["/getty/v1/tenant/vendors/options"],
      [`/getty/v1/product/vendors/${vendor.id}/products/options`],
    ])
    await assert.rejects(
      () => api.getFeaturedOptions("products"),
      /Choose a vendor/
    )
    assert.equal(calls.length, 2)
    data.apiData = async () => []
    assert.deepEqual(await api.getFeaturedOptions("products", vendor.id), [])
  } finally {
    data.apiData = original
  }
})
test("featured responses preserve IDs, cursor history tokens and nested names", () => {
  const row = schema.parseFeaturedEntry(entry)
  assert.equal(row.product, "product-1")
  assert.equal(row.productName, "Gloves")
  assert.equal(row.vendorName, "Getty")
  assert.deepEqual(
    schema.parseFeaturedPage(
      { records: [entry], isNext: true, nextCursor: 42 },
      schema.parseFeaturedEntry
    ),
    { records: [row], isNext: true, nextCursor: 42 }
  )
  assert.throws(() =>
    schema.parseFeaturedPage(
      { records: [], isNext: true },
      schema.parseFeaturedEntry
    )
  )
  assert.throws(() => schema.parseFeaturedEntry({ id: "advert" }))
})
test("scheduling uses Lagos time, exact boundaries and closed overrides", () => {
  const row = schema.parseFeaturedEntry(entry)
  assert.equal(
    schema.featuredStatus(row, Date.parse("2026-10-15T07:59:59Z")),
    "scheduled"
  )
  assert.equal(
    schema.featuredStatus(row, Date.parse("2026-10-15T08:00:00Z")),
    "active"
  )
  assert.equal(
    schema.featuredStatus(row, Date.parse("2026-10-22T22:59:00Z")),
    "expired"
  )
  assert.equal(
    schema.featuredStatus(
      { ...row, status: "closed" },
      Date.parse("2026-10-16T00:00:00Z")
    ),
    "closed"
  )
  assert.equal(
    schema.lagosDateInput("2026-10-15T08:00:00Z"),
    "2026-10-15T09:00"
  )
  assert.equal(
    schema.lagosTimestamp("2026-10-15T09:00"),
    "2026-10-15T09:00:00+01:00"
  )
})
test("form validation rejects missing images, past or reversed schedules and negative order", () => {
  assert.equal(schema.featuredFormSchema.parse(form).ordinal, 0)
  for (const values of [
    { photo: "" },
    { ends: "2000-01-01T09:00" },
    { ends: "2099-10-14T09:00" },
    { ordinal: "-1" },
    { tenant: "" },
    { product: "" },
  ])
    assert.equal(
      schema.featuredFormSchema.safeParse({ ...form, ...values }).success,
      false
    )
})
test("featured APIs use the documented payload and separate public access", async () => {
  const old = data.apiData,
    oldRequest = client.apiRequest,
    calls = []
  data.apiData = async (...args) => {
    calls.push(args)
    return args[1]?.method
      ? "OK"
      : { records: [entry], isNext: false, nextCursor: null }
  }
  client.apiRequest = async (...args) => {
    calls.push(args)
    return {}
  }
  try {
    await api.getFeaturedPage({
      cursor: 42,
      search: "care & gloves",
      status: "scheduled",
    })
    const url = new URL(calls[0][0], "https://example.test")
    assert.equal(url.searchParams.get("cursor"), "42")
    assert.equal(url.searchParams.get("search"), "care & gloves")
    await api.saveFeatured(schema.featuredFormSchema.parse(form), "advert-1")
    const body = JSON.parse(calls[1][1].body)
    assert.equal(calls[1][1].method, "PATCH")
    assert.equal(body.id, "advert-1")
    assert.equal(body.photo, "photo-1")
    assert.equal(body.starts, "2099-10-15T09:00:00+01:00")
    assert.equal(body.ordinal, 0)
    await api.getPublicFeatured()
    assert.equal(calls[2][0], "/getty/ecommerce/featured?limit=20")
    assert.equal(calls[2][2], "public")
    await api.deleteFeatured("advert-1")
    assert.equal(calls[3][1].method, "DELETE")
    assert.equal(calls[3][0], "/getty/v1/featured/advert-1")
    data.apiData = async () => [
      { status: "error", message: "Image is not verified" },
    ]
    await assert.rejects(
      () => api.saveFeatured(schema.featuredFormSchema.parse(form)),
      /Image is not verified/
    )
  } finally {
    data.apiData = old
    client.apiRequest = oldRequest
  }
})
test("dedicated advert upload sends raw bytes to signed storage without attaching product photos", async () => {
  const original = globalThis.fetch
  const file = new File(["imagebytes"], "advert.webp", { type: "image/webp" }),
    calls = []
  globalThis.fetch = async (...args) => {
    calls.push(args)
    return new Response("", { status: 200 })
  }
  try {
    const result = await photos.uploadImageFile(file, {
      id: "new-photo",
      url: "https://storage.example.test/upload?signed=yes",
      method: "PUT",
      headers: { "content-type": "image/webp" },
      fields: {},
    })
    assert.equal(result, "new-photo")
    assert.equal(calls.length, 1)
    assert.equal(calls[0][1].body, file)
    assert.equal(calls[0][1].credentials, "omit")
    assert.equal(calls[0][1].headers.Authorization, undefined)
  } finally {
    globalThis.fetch = original
  }
})
