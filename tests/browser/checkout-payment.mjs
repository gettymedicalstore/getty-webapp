import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import assert from "node:assert/strict"
import { fixtures } from "./fixtures.mjs"
const require = createRequire(
  `${process.env.AUDIT_TOOLS_DIR || "/private/tmp/getty-browser-audit"}/package.json`
)
const { chromium } = require("playwright")
const AxeBuilder = require("@axe-core/playwright").default
const sample = JSON.parse(
  readFileSync(new URL("../fixtures/commerce.json", import.meta.url), "utf8")
)
const browser = await chromium.launch({ channel: "chrome", headless: true })
const base = process.env.AUDIT_BASE_URL || "http://localhost:3000"
const widths = [320, 375, 390, 414, 768, 1024, 1280, 1440, 1920]
async function setup(mode = "normal") {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  })
  await fixtures(context, "customer")
  let order = {
      ...sample.checkout,
      expires: new Date(Date.now() + 1800000).toISOString(),
    },
    payment = null,
    cart = sample.cart
  const calls = [],
    errors = []
  await context.route(
    "https://api.gettymedicalstores.com/getty/v1/order**",
    async (route) => {
      const r = route.request(),
        p = new URL(r.url()).pathname
      const body = r.postDataJSON()
      calls.push({ path: p, method: r.method(), body })
      const ok = (data) =>
        route.fulfill({
          json: { status: 200, success: true, message: "OK", data },
        })
      if (p === "/getty/v1/order/cart") return ok(cart)
      if (p === "/getty/v1/order/checkout/preview")
        return ok({ ...sample.preview, delivery: body })
      if (p === "/getty/v1/order/checkout") {
        if (
          mode === "timeout" &&
          calls.filter((c) => c.path === p).length === 1
        )
          return route.fulfill({
            status: 503,
            json: {
              status: 503,
              success: false,
              message: "Connection lost after submission",
            },
          })
        cart = { ...cart, items: [], subtotal: 0, itemCount: 0 }
        return ok(order)
      }
      if (p === `/getty/v1/order/${order.id}/payments`) {
        if (
          mode === "payment-timeout" &&
          calls.filter((c) => c.path === p && c.method === "POST").length === 1
        )
          return route.fulfill({
            status: 503,
            json: {
              status: 503,
              success: false,
              message: "Payment request could not be confirmed",
            },
          })
        payment = { ...sample.startPayment }
        order = { ...order, payments: [payment] }
        return ok(payment)
      }
      if (p === `/getty/v1/order/${order.id}/payments/${sample.payment.id}`) {
        if (payment?.status === "created") payment = { ...sample.payment }
        return ok(payment ?? sample.payment)
      }
      if (p === `/getty/v1/order/${order.id}`) return ok(order)
      return route.fallback()
    }
  )
  const page = await context.newPage()
  page.on("pageerror", (e) => errors.push(e.message))
  return {
    context,
    page,
    calls,
    errors,
    setPayment: (p) => {
      payment = p
    },
    setOrder: (o) => {
      order = { ...order, ...o }
    },
  }
}
async function fill(page) {
  await page
    .getByRole("textbox", { name: "Recipient name" })
    .fill("Checkout Buyer")
  await page
    .getByRole("textbox", { name: "Phone number" })
    .fill("+2348100000000")
  await page
    .getByRole("textbox", { name: "Street address" })
    .fill("12 Example Street")
  await page.getByRole("textbox", { name: "City", exact: true }).fill("Abuja")
  await page.getByRole("textbox", { name: "State / FCT" }).fill("FCT")
  await page.getByRole("button", { name: "Review delivery & total" }).click()
  await page.getByRole("button", { name: "Place order", exact: true }).waitFor()
}
async function responsive(page, label) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      ),
      true,
      `${label} overflow at ${width}`
    )
  }
}
try {
  const run = await setup()
  const { page, calls } = run
  await page.goto(`${base}/checkout`)
  await page.getByRole("textbox", { name: "Recipient name" }).waitFor()
  await responsive(page, "delivery form")
  const accessibility = await new AxeBuilder({ page })
    .include("#main-content")
    .analyze()
  assert.deepEqual(
    accessibility.violations
      .filter((v) => ["serious", "critical"].includes(v.impact))
      .map((v) => v.id),
    []
  )
  await fill(page)
  const preview = calls.find((c) => c.path.endsWith("/preview"))
  assert.equal(preview.body.name, "Checkout Buyer")
  assert.equal(preview.body.country, "NG")
  assert.equal(preview.body.delivery, undefined)
  await responsive(page, "quote review")
  await page.setViewportSize({ width: 390, height: 1000 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: "/private/tmp/getty-checkout-390.png",
    fullPage: true,
  })
  await page.getByRole("button", { name: "Place order", exact: true }).click()
  await page.getByRole("button", { name: "Pay securely", exact: true }).click()
  await page.getByRole("link", { name: "Continue to payment" }).waitFor()
  assert.equal(calls.filter((c) => c.path.endsWith("/checkout")).length, 1)
  assert.equal(calls.filter((c) => c.path.endsWith("/payments")).length, 1)
  assert.ok(calls.find((c) => c.path.endsWith("/checkout")).body.quote)
  assert.ok(calls.find((c) => c.path.endsWith("/payments")).body.token)
  await responsive(page, "payment")
  run.setPayment({ ...sample.payment, status: "unknown", link: null })
  run.setOrder({ payments: [{ ...sample.payment, status: "unknown" }] })
  await page.goto(`${base}/checkout/callback?reference=provider-reference`)
  await page
    .getByRole("heading", { name: "Your payment is being checked" })
    .waitFor()
  assert.equal(
    await page
      .getByRole("button", { name: /Pay securely|Try payment again/ })
      .count(),
    0
  )
  assert.equal(
    await page.getByRole("link", { name: "Continue to payment" }).count(),
    0
  )
  run.setPayment({ ...sample.payment, status: "succeeded" })
  run.setOrder({
    status: "expired",
    payments: [{ ...sample.payment, status: "succeeded" }],
  })
  await page.getByRole("button", { name: "Check status", exact: true }).click()
  await page.getByRole("heading", { name: "Order expired" }).waitFor()
  await page
    .getByText("Payment was received after this order closed.", {
      exact: false,
    })
    .waitFor()
  assert.equal(
    await page
      .getByRole("heading", { name: "Your order is confirmed" })
      .count(),
    0
  )
  run.setOrder({ status: "confirmed" })
  await page.getByRole("button", { name: "Check status", exact: true }).click()
  await page.getByRole("heading", { name: "Your order is confirmed" }).waitFor()
  assert.equal(calls.filter((c) => c.path.endsWith("/payments")).length, 1)
  assert.deepEqual(run.errors, [])
  await run.context.close()
  const retry = await setup("timeout")
  await retry.page.goto(`${base}/checkout`)
  await fill(retry.page)
  await retry.page
    .getByRole("button", { name: "Place order", exact: true })
    .click()
  await retry.page
    .getByRole("button", { name: "Retry saved order request" })
    .waitFor()
  await retry.page.reload()
  await retry.page
    .getByRole("button", { name: "Retry saved order request" })
    .click()
  await retry.page
    .getByRole("button", { name: "Pay securely", exact: true })
    .waitFor()
  const attempts = retry.calls.filter((c) => c.path.endsWith("/checkout"))
  assert.equal(attempts.length, 2)
  assert.deepEqual(attempts[0].body, attempts[1].body)
  assert.deepEqual(retry.errors, [])
  await retry.context.close()
  const paymentRetry = await setup("payment-timeout")
  await paymentRetry.page.goto(`${base}/checkout`)
  await fill(paymentRetry.page)
  await paymentRetry.page
    .getByRole("button", { name: "Place order", exact: true })
    .click()
  await paymentRetry.page
    .getByRole("button", { name: "Pay securely", exact: true })
    .click()
  await paymentRetry.page
    .getByRole("alert")
    .filter({ hasText: "Payment request could not be confirmed" })
    .waitFor()
  await paymentRetry.page.reload()
  await paymentRetry.page
    .getByRole("button", { name: "Pay securely", exact: true })
    .click()
  await paymentRetry.page
    .getByRole("link", { name: "Continue to payment" })
    .waitFor()
  const paymentAttempts = paymentRetry.calls.filter(
    (c) => c.path.endsWith("/payments") && c.method === "POST"
  )
  assert.equal(paymentAttempts.length, 2)
  assert.deepEqual(paymentAttempts[0].body, paymentAttempts[1].body)
  assert.deepEqual(paymentRetry.errors, [])
  await paymentRetry.context.close()
  console.log(
    "Checkout/payment browser checks passed: delivery preview, exact-token retry across reload, payment states, closed paid order, all nine widths."
  )
} finally {
  await browser.close()
}
