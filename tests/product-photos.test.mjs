import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import Module, { createRequire } from "node:module"
import { test } from "node:test"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

const require = createRequire(import.meta.url)
const { QueryClient, QueryClientProvider } = require("@tanstack/react-query")
const root = process.cwd()
const resolve = Module._resolveFilename
Module._resolveFilename = function (request, ...args) {
  return resolve.call(
    this,
    request.startsWith("@/") ? path.join(root, request.slice(2)) : request,
    ...args
  )
}
for (const extension of [".ts", ".tsx"])
  require.extensions[extension] = (module, filename) =>
    module._compile(
      ts.transpileModule(readFileSync(filename, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText,
      filename
    )

const ProductImageUpload =
  require("../features/admin/components/product-image-upload.tsx").default
const ProductCardImage =
  require("../features/products/components/store/product-card-image.tsx").default
const HeroCarousel =
  require("../components/store/home/hero-carousel.tsx").default
const ProductPrice =
  require("../features/products/components/store/product-price.tsx").default
const FeaturedForm =
  require("../features/featured/components/featured-form.tsx").default
const FeaturedImage =
  require("../features/featured/components/featured-image.tsx").default
const {
  productPricing,
} = require("../features/products/utils/product-pricing.ts")
const product = "01a11273-ddcd-7dc4-b84e-fe1c822c3b1c"
const file = "01a11600-c433-7000-8000-100000056e27"
const photosLink = `/getty/ecommerce/catalog/products/${product}/photos`

test("featured hero links its scheduled image without showing price or a separate product button", () => {
  const client = new QueryClient()
  const url = `https://api.gettymedicalstores.com/getty/ecommerce/featured/${file}/photo`
  client.setQueryData(
    ["featured", "public", 20],
    [
      {
        id: file,
        product,
        productName: "Medical bed",
        caption: "Comfort for everyday care",
        ordinal: 0,
        starts: "2020-01-01T00:00:00+01:00",
        ends: "2099-01-01T00:00:00+01:00",
      },
      { id: "second", product: "another-product", ordinal: 1 },
    ]
  )
  client.setQueryData(["products", "detail", product], {
    id: product,
    slug: "medical-bed",
    name: "Medical bed",
    category: { name: "Equipment" },
    price: 800,
    compareAtPrice: 1000,
    currency: "NGN",
  })
  const renderHero = () =>
    renderToStaticMarkup(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(HeroCarousel)
      )
    )
  const html = renderHero()
  assert.ok(html.includes("Medical bed"))
  assert.ok(html.includes(`src="${url}"`))
  assert.ok(html.includes('href="/products/medical-bed"'))
  assert.ok(html.includes('aria-label="Featured product"'))
  assert.ok(html.includes('aria-label="View Medical bed"'))
  assert.equal(html.includes('aria-label="Pause featured products"'), false)
  assert.equal(html.includes("Explore product"), false)
  assert.equal(html.includes("₦800.00"), false)
  assert.equal(html.includes("Comfort for everyday care"), false)
  assert.equal(html.includes("Equipment"), false)
  assert.equal(html.includes('aria-label="Next featured product"'), false)
  client.setQueryData(["featured", "public", 20], [])
  const empty = renderHero()
  assert.ok(empty.includes("Shop all products"))
  assert.equal(empty.includes('aria-label="Featured product"'), false)
  assert.equal(empty.includes('aria-label="Next featured product"'), false)
  client.clear()
})

test("discount pricing shows savings only when the original price exceeds the sale price", () => {
  assert.deepEqual(productPricing(750, 1000), {
    price: 750,
    originalPrice: 1000,
    saving: 250,
    percent: 25,
  })
  for (const original of [undefined, null, 0, 500, 750, NaN, Infinity]) {
    assert.equal(productPricing(750, original).saving, 0)
  }
  assert.equal(productPricing(0.2, 0.3).saving, 0.1)
  const html = renderToStaticMarkup(
    React.createElement(ProductPrice, { price: 750, compareAtPrice: 1000 })
  )
  assert.ok(html.includes("Save"))
  assert.ok(html.includes("250.00"))
  assert.ok(html.includes("<del"))
  const regular = renderToStaticMarkup(
    React.createElement(ProductPrice, { price: 750 })
  )
  assert.equal(regular.includes("Save"), false)
  assert.equal(regular.includes("<del"), false)
})

test("store cards render uploaded thumbnails and retain the placeholder for empty photo lists", () => {
  const client = new QueryClient()
  const url = `https://api.gettymedicalstores.com${photosLink}/${file}/src`
  const renderImage = (image = "/images/product-placeholder.svg") =>
    renderToStaticMarkup(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(ProductCardImage, {
          product: {
            id: product,
            name: "Test product",
            image,
            source: "remote",
          },
        })
      )
    )
  client.setQueryData(["products", "thumbnail", product], url)
  assert.ok(renderImage().includes(`src="${url}"`))
  assert.ok(renderImage().includes('alt="Test product"'))
  assert.ok(
    renderImage("https://example.test/existing.jpg").includes(
      'src="https://example.test/existing.jpg"'
    )
  )
  client.setQueryData(["products", "thumbnail", product], null)
  assert.ok(renderImage().includes('src="/images/product-placeholder.svg"'))
  client.clear()
})

function render(client) {
  return renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(ProductImageUpload, {
        product,
        photosLink,
      })
    )
  )
}

test("the Photos tab renders images loaded from the backend without a prior local upload", () => {
  const client = new QueryClient()
  const url = `https://api.gettymedicalstores.com${photosLink}/${file}/src`
  client.setQueryData(["managed-product", product, "photos", photosLink], {
    pages: [
      {
        records: [{ id: file, name: "front.webp", mime: "image/webp", url }],
        nextCursor: null,
        limit: 24,
      },
    ],
    pageParams: [null],
  })
  const html = render(client)
  assert.ok(html.includes(`src="${url}"`))
  assert.ok(html.includes("front.webp"))
  assert.ok(html.includes("Product images"))
  assert.equal(html.includes("Add product photos"), false)
  assert.equal(html.includes("Load more images"), false)
  client.clear()
})

test("featured editor offers existing product photos and previews the selected one", () => {
  const client = new QueryClient()
  const url = `https://api.gettymedicalstores.com${photosLink}/${file}/src`
  client.setQueryData(
    ["featured", "vendor-options"],
    [{ id: product, name: "Getty" }]
  )
  client.setQueryData(
    ["featured", "product-options", product],
    [{ id: product, name: "Test product" }]
  )
  client.setQueryData(["featured", "product-photos", product], {
    pages: [
      {
        records: [{ id: file, name: "front.webp", mime: "image/webp", url }],
        nextCursor: null,
        limit: 24,
      },
    ],
    pageParams: [null],
  })
  const html = renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(FeaturedForm, {
        entry: {
          id: file,
          tenant: product,
          product,
          photo: file,
          caption: "Everyday care",
          starts: "2099-10-15T09:00:00+01:00",
          ends: "2099-10-22T23:59:00+01:00",
          ordinal: 0,
          productName: "Test product",
          vendorName: "Getty",
        },
        layout: "page",
        busy: false,
        error: "",
        onSave: async () => {},
        onCancel: () => {},
        onUploadBusy: () => {},
      })
    )
  )
  assert.ok(html.includes('aria-label="Use product photo 1: front.webp"'))
  assert.ok(html.includes('aria-pressed="true"'))
  assert.ok(html.includes(`src="${url}"`))
  assert.ok(html.includes("Upload a different image"))
  client.clear()
})

test("failed featured storage images fall back to the product photo", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const advert = "01a11611-c433-7000-8000-100000056e27"
  const url = `https://api.gettymedicalstores.com${photosLink}/${file}/src`
  await client.prefetchQuery({
    queryKey: ["featured", "image", advert],
    queryFn: async () => {
      throw new Error("Storage rejected the signed link")
    },
  })
  client.setQueryData(["featured", "catalog-photos", product], {
    records: [{ id: file, name: "front.webp", mime: "image/webp", url }],
    nextCursor: null,
    limit: 24,
  })
  const html = renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(FeaturedImage, {
        id: advert,
        product,
        name: "Test product",
      })
    )
  )
  assert.ok(html.includes(`src="${url}"`))
  assert.ok(html.includes('alt="Test product"'))
  client.clear()
})

test("featured entries reusing a product photo render its catalog source", () => {
  const client = new QueryClient()
  const advert = "01a11611-c433-7000-8000-100000056e27"
  const url = `https://api.gettymedicalstores.com${photosLink}/${file}/src`
  client.setQueryData(["featured", "catalog-photos", product], {
    records: [{ id: file, name: "front.webp", mime: "image/webp", url }],
    nextCursor: null,
    limit: 24,
  })
  const html = renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(FeaturedImage, {
        id: advert,
        product,
        photo: file,
        name: "Test product",
      })
    )
  )
  assert.ok(html.includes(`src="${url}"`))
  client.clear()
})

test("saved photos load for products awaiting review while uploads remain available", () => {
  const client = new QueryClient()
  const loading = render(client)
  assert.ok(loading.includes('aria-label="Loading product photos"'))
  assert.equal(loading.includes("Add product photos"), false)
  assert.ok(loading.includes("Upload single image"))
  assert.ok(loading.includes("Upload multiple images"))
  assert.equal(loading.includes("No photos yet"), false)
  client.clear()
})
