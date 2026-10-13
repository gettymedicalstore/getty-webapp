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

const {
  catalogPricing,
  selectProductVariant,
  productPricing,
} = require("../features/products/utils/product-pricing.ts")
const client = require("../lib/api/client.ts")
const {
  getLiveProducts,
  getLiveProduct,
} = require("../features/products/api/live-catalog.ts")
const { deviceCart } = require("../features/cart/api/device-cart.ts")
const { mapBackendCart } = require("../features/cart/server/map-cart.ts")
const { CartSchema } = require("../lib/api/getty-contract.ts")
const id = "11111111-1111-4111-8111-111111111111"
const other = "22222222-2222-4222-8222-222222222222"
const product = {
  id,
  name: "Examination gloves",
  brand: null,
  description: null,
  seller: "Medical supplier",
  category: { id: other, name: "Consumables" },
  subcategory: null,
  currency: "NGN",
  price: 8500,
  priceFmt: "₦8,500.00",
  discount: 7500,
  discountFmt: "₦7,500.00",
  inStock: true,
  rating: { average: null, count: 0 },
  links: { self: "/product", photos: "/photos", ratings: "/ratings" },
}
const variant = {
  id: other,
  name: "Box of 100",
  sku: "G100",
  options: {},
  isDefault: true,
  price: 10000,
  priceFmt: "₦10,000.00",
  discount: 8000,
  discountFmt: "₦8,000.00",
  saleUnit: "box",
  unitsPerPack: 100,
  minimumOrderQuantity: 2,
  inStock: true,
}
const envelope = (data) => ({ status: 200, success: true, message: "OK", data })
const page = (records) => ({
  records,
  cursor: 0,
  nextCursor: 0,
  previousCursor: 0,
  isNext: false,
  isPrevious: false,
})

test("catalog discount is the selling price, and zero or inactive discounts are not free products", () => {
  assert.deepEqual(catalogPricing(8500, 7500), {
    price: 7500,
    compareAtPrice: 8500,
  })
  assert.equal(productPricing(7500, 8500).saving, 1000)
  for (const discount of [
    undefined,
    null,
    0,
    -100,
    8500,
    9000,
    NaN,
    Infinity,
  ]) {
    assert.deepEqual(catalogPricing(8500, discount), {
      price: 8500,
      compareAtPrice: undefined,
    })
  }
})

test("public listing preserves promotional price and hides zero or absent promotions", async (t) => {
  t.mock.method(client, "apiRequest", async () =>
    envelope(
      page([
        product,
        { ...product, discount: 0 },
        { ...product, discount: undefined, discountFmt: undefined },
      ])
    )
  )
  const result = await getLiveProducts({})
  assert.deepEqual(
    result.items.map(({ price, compareAtPrice }) => ({
      price,
      compareAtPrice,
    })),
    [
      { price: 7500, compareAtPrice: 8500 },
      { price: 8500, compareAtPrice: undefined },
      { price: 8500, compareAtPrice: undefined },
    ]
  )
})

test("detail selection uses the chosen variant's price and removes a different variant's promotion", async (t) => {
  t.mock.method(client, "apiRequest", async (path) =>
    envelope(
      path.includes("/photos")
        ? { records: [], nextCursor: null, limit: 100 }
        : {
            ...product,
            detail: null,
            variants: [
              variant,
              { ...variant, id, discount: 0, inStock: false },
            ],
            specifications: [],
            taxes: [],
            taxInclusive: true,
          }
    )
  )
  const detail = await getLiveProduct(id)
  assert.equal(detail.price, 7500)
  assert.equal(detail.variants[0].discount, 8000)
  assert.equal(detail.variants[0].discountFmt, "₦8,000.00")
  const selected = selectProductVariant(detail, detail.variants[0])
  assert.equal(selected.price, 8000)
  assert.equal(selected.compareAtPrice, 10000)
  assert.equal(selected.minimumOrderQuantity, 2)
  assert.equal(selected.variantId, other)
  const normal = selectProductVariant(selected, detail.variants[1])
  assert.equal(normal.price, 10000)
  assert.equal(normal.compareAtPrice, undefined)
  assert.equal(normal.inStock, false)
  const guest = deviceCart([
    {
      productId: id,
      variantId: other,
      quantity: 2,
      minimum: 2,
      product: selected,
    },
  ])
  assert.equal(guest.total, 16000)
  assert.equal(guest.discount, 0)
})

test("server cart prices are already effective and are never discounted again", () => {
  const backend = CartSchema.parse({
    id,
    currency: "NGN",
    status: "active",
    expires: null,
    modified: null,
    version: 1,
    expired: false,
    subtotal: 16000,
    items: [
      {
        id,
        seller: id,
        product: id,
        variant: other,
        name: product.name,
        sku: variant.sku,
        options: {},
        unit: "box",
        pack: 100,
        quantity: 2,
        currency: "NGN",
        price: 8000,
        discount: 8000,
        subtotal: 16000,
        minimum: 2,
        available: 10,
        purchasable: true,
      },
    ],
  })
  const cart = mapBackendCart(backend)
  assert.equal(cart.items[0].product.price, 8000)
  assert.equal(cart.items[0].product.compareAtPrice, undefined)
  assert.equal(cart.total, 16000)
  assert.equal(cart.discount, 0)
})
