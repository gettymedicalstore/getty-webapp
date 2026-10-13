import { createRequire } from "node:module"
import assert from "node:assert/strict"
import { fixtures, id } from "./fixtures.mjs"
const require = createRequire(
  `${process.env.AUDIT_TOOLS_DIR || "/private/tmp/getty-browser-audit"}/package.json`
)
const { chromium } = require("playwright")
const browser = await chromium.launch({ channel: "chrome", headless: true })
const base = process.env.AUDIT_BASE_URL || "http://localhost:3000"
const second = "20000000-0000-4000-8000-000000000002"
const guest = (variantId, name, quantity) => ({
  productId: variantId,
  variantId,
  quantity,
  product: {
    id: variantId,
    variantId,
    slug: variantId,
    name,
    price: 50,
    image: "/images/product-placeholder.svg",
    stock: 40,
    active: true,
  },
})
const line = (variant, name, quantity) => ({
  id: variant,
  seller: id,
  product: variant,
  variant,
  name,
  sku: "BOX-100",
  options: {},
  unit: "box",
  pack: 100,
  quantity,
  currency: "NGN",
  price: 7500,
  subtotal: quantity * 7500,
  minimum: 1,
  available: 40,
  purchasable: true,
})
try {
  for (const partial of [false, true]) {
    const context = await browser.newContext({ reducedMotion: "reduce" })
    await fixtures(context, "customer")
    await context.addInitScript(
      (items) => {
        if (!localStorage.getItem("getty-device-cart-v1"))
          localStorage.setItem("getty-device-cart-v1", JSON.stringify(items))
      },
      partial
        ? [
            guest(id, "Examination gloves", 2),
            guest(second, "Sterile masks", 50),
          ]
        : [guest(id, "Examination gloves", 2)]
    )
    let rows = [line(id, "Examination gloves", 3)]
    const calls = [],
      mutations = []
    const cart = () => ({
      id,
      currency: "NGN",
      status: "active",
      expires: null,
      modified: null,
      version: 2,
      expired: false,
      items: rows,
      subtotal: rows.reduce((sum, item) => sum + item.subtotal, 0),
    })
    await context.route(
      "https://api.gettymedicalstores.com/getty/v1/order/cart**",
      async (route) => {
        const request = route.request(),
          url = new URL(request.url()),
          method = request.method()
        const ok = (data) =>
          route.fulfill({
            json: { status: 200, success: true, message: "OK", data },
          })
        if (method === "GET") return ok(cart())
        if (url.pathname.endsWith("/merge")) {
          const body = request.postDataJSON()
          calls.push(body)
          const results = body.items.map((item) => {
            if (item.variant === second && item.quantity > 10)
              return {
                ...item,
                status: "rejected",
                available: 10,
                existing: 0,
                message: "Only 10 boxes available.",
              }
            const old = rows.find((row) => row.variant === item.variant)
            const quantity = (old?.quantity ?? 0) + item.quantity
            rows = [
              ...rows.filter((row) => row.variant !== item.variant),
              line(
                item.variant,
                item.variant === id ? "Examination gloves" : "Sterile masks",
                quantity
              ),
            ]
            return { ...item, status: "merged", resultingQuantity: quantity }
          })
          return ok({
            token: body.token,
            replayed: false,
            results,
            cart: cart(),
          })
        }
        mutations.push({
          method,
          body: method === "PUT" ? request.postDataJSON() : null,
        })
        const variant = url.pathname.split("/").at(-1)
        rows =
          method === "PUT"
            ? rows.map((item) =>
                item.variant === variant
                  ? line(variant, item.name, request.postDataJSON().quantity)
                  : item
              )
            : rows.filter((item) => item.variant !== variant)
        return ok(cart())
      }
    )
    const page = await context.newPage()
    await page.goto(`${base}/cart`)
    await page
      .getByRole("heading", { name: "Your shopping bag", exact: true })
      .waitFor()
    if (partial) {
      await page
        .getByRole("heading", { name: "Saved items to review" })
        .waitFor()
      assert.equal(calls.length, 1)
      assert.equal(
        await page.getByRole("link", { name: "Checkout", exact: true }).count(),
        0
      )
      const field = page.getByRole("spinbutton", {
        name: "Quantity of Sterile masks",
      })
      await field.fill("2")
      await field.press("Tab")
      await page
        .getByRole("heading", { name: "Saved items to review" })
        .waitFor({ state: "hidden" })
      assert.equal(calls.length, 2)
      assert.notEqual(calls[0].token, calls[1].token)
      assert.deepEqual(calls[1].items, [{ variant: second, quantity: 2 }])
    }
    await page.getByRole("link", { name: "Checkout", exact: true }).waitFor()
    assert.equal(
      await page
        .getByRole("spinbutton", { name: "Quantity of Examination gloves" })
        .inputValue(),
      "5"
    )
    if (!partial) {
      await page
        .getByRole("button", {
          name: "Increase quantity of Examination gloves",
        })
        .click()
      await page.waitForFunction(
        () =>
          document.querySelector(
            'input[aria-label="Quantity of Examination gloves"]'
          )?.value === "6"
      )
      assert.deepEqual(mutations[0], { method: "PUT", body: { quantity: 6 } })
    }
    for (const width of [320, 375, 390, 414, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 })
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        ),
        true,
        `${width}px overflow`
      )
    }
    const beforeReload = calls.length
    await page.reload()
    await page.getByRole("link", { name: "Checkout", exact: true }).waitFor()
    assert.equal(
      calls.length,
      beforeReload,
      "reload must not merge accepted lines again"
    )
    await context.close()
  }
  console.log(
    "Cart merge, partial correction, quantity update, reload and nine responsive widths passed."
  )
} finally {
  await browser.close()
}
