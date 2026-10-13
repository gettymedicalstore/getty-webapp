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
const api = require("../features/admin/api/all-products.ts")
const data = require("../lib/api/data.ts")
const navigation = require("../lib/navigation/workspace-menu.ts")
const product = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Examination Gloves",
  vendor: "Acacia Medical Supplies",
  category: "category-1",
  categoryName: "Medical Consumables",
  brand: "Acacia",
  currency: "NGN",
  status: "published",
  price: 10000,
  priceFmt: "₦10,000.00",
  discount: 8500,
  discountFmt: "₦8,500.00",
  quantity: 120,
  availableQuantity: 115,
  variantCount: 2,
  cursor: 42,
}
const page = {
  records: [product],
  cursor: 0,
  nextCursor: 0,
  previousCursor: 0,
  isNext: false,
  isPrevious: false,
}
test("all-products requests omit empty filters and send exact vendor, search and directional cursor parameters", async () => {
  const original = data.apiData,
    calls = []
  data.apiData = async (...args) => {
    calls.push(args)
    return page
  }
  try {
    assert.deepEqual(await api.getAllProducts(), page)
    const first = new URL(calls[0][0], "https://example.test")
    assert.equal(first.pathname, "/getty/v1/product/products/all")
    assert.deepEqual(Object.fromEntries(first.searchParams), {
      cursor: "0",
      navigation: "next",
      limit: "20",
    })
    await api.getAllProducts({
      vendor: "vendor-1",
      status: "published",
      search: "  gloves & masks  ",
      cursor: 42,
      navigation: "previous",
    })
    assert.deepEqual(
      Object.fromEntries(
        new URL(calls[1][0], "https://example.test").searchParams
      ),
      {
        vendor: "vendor-1",
        status: "published",
        search: "gloves & masks",
        cursor: "42",
        navigation: "previous",
        limit: "20",
      }
    )
    assert.equal(calls[0].length, 1, "Uses authenticated access by default")
  } finally {
    data.apiData = original
  }
})
test("all-products pagination preserves explicit availability and zero cursors", () => {
  assert.deepEqual(api.allProductsPageSchema.parse(page), page)
  assert.equal(
    api.allProductsPageSchema.parse({ ...page, isPrevious: true })
      .previousCursor,
    0
  )
  assert.throws(() =>
    api.allProductsPageSchema.parse({ ...page, isNext: true, nextCursor: null })
  )
  assert.throws(() =>
    api.allProductsPageSchema.parse({ ...page, records: null })
  )
  assert.deepEqual(
    api.allProductsPageSchema.parse({ ...page, records: [] }).records,
    []
  )
  const missing = api.allProductsPageSchema.parse({
    ...page,
    records: [{ id: "p", name: "Gloves", status: "draft" }],
  }).records[0]
  assert.equal(missing.availableQuantity, undefined)
  assert.equal(missing.price, undefined)
})
test("All products navigation is admin-only and distinct from own products", () => {
  const links = (role) =>
    navigation.workspaceMenus[role].flatMap((item) => item.children ?? [item])
  assert.ok(links("admin").some((item) => item.href === "/admin/all-products"))
  assert.ok(links("admin").some((item) => item.href === "/admin/products"))
  assert.equal(
    navigation.workspacePageTitle("admin", "/admin/all-products"),
    "All products"
  )
  for (const role of ["supplier", "customer"])
    assert.ok(links(role).every((item) => !item.href.endsWith("/all-products")))
})
