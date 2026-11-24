import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { fixtures } from "./fixtures.mjs"

const require = createRequire(
  `${process.env.AUDIT_TOOLS_DIR || "/private/tmp/getty-browser-audit"}/package.json`
)
const { chromium } = require("playwright")
const sample = JSON.parse(
  readFileSync(new URL("../fixtures/commerce.json", import.meta.url), "utf8")
)
const base = process.env.AUDIT_BASE_URL || "http://localhost:3000"
const orderPath = `/getty/v1/order/${sample.checkout.id}`
const paymentPath = `${orderPath}/payments/${sample.payment.id}`
const verifyPath = `${paymentPath}/verify`
const browser = await chromium.launch({ channel: "chrome", headless: true })

async function setup({ status = "pending", failFirst = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  })
  await fixtures(context, "customer")
  let payment = { ...sample.payment, status: "unknown", link: null }
  let order = {
    ...sample.checkout,
    status,
    expires: new Date(Date.now() + 1800000).toISOString(),
    payments: [payment],
  }
  const calls = []
  const errors = []
  await context.route(
    "https://api.gettymedicalstores.com/getty/v1/order**",
    async (route) => {
      const request = route.request()
      const path = new URL(request.url()).pathname
      const method = request.method()
      const body = request.postDataJSON()
      calls.push({ path, method, body })
      const ok = (data) =>
        route.fulfill({
          json: { status: 200, success: true, message: "OK", data },
        })
      if (path === "/getty/v1/order/cart") return ok(sample.cart)
      if (path === orderPath) return ok(order)
      if (path === paymentPath) return ok(payment)
      if (path === verifyPath) {
        assert.equal(method, "POST")
        assert.equal(body, null)
        if (failFirst) {
          if (calls.filter((call) => call.path === verifyPath).length === 1)
            return route.fulfill({
              status: 503,
              json: {
                status: 503,
                success: false,
                message: "Provider verification is temporarily unavailable",
              },
            })
          payment = { ...payment, status: "succeeded" }
          order = {
            ...order,
            status: order.status === "pending" ? "confirmed" : order.status,
            payments: [payment],
          }
        }
        // Acknowledging verification does not itself confirm the payment.
        return route.fulfill({
          json: {
            status: 200,
            success: true,
            message: "Verification requested",
          },
        })
      }
      return route.fallback()
    }
  )
  const page = await context.newPage()
  page.on("pageerror", (error) => errors.push(error.message))
  return { context, page, calls, errors }
}

async function openCallback(page) {
  await page.goto(
    `${base}/checkout/callback?order=${sample.checkout.id}&status=successful&transaction_id=12345`
  )
}

function verifyCount(run) {
  return run.calls.filter((call) => call.path === verifyPath).length
}

async function assertUnconfirmed(page) {
  assert.equal(
    await page
      .getByRole("heading", { name: "Your order is confirmed" })
      .count(),
    0
  )
}

function assertNoCharges(run) {
  assert.equal(
    run.calls.filter(
      (call) => call.path.endsWith("/payments") && call.method === "POST"
    ).length,
    0
  )
  assert.deepEqual(run.errors, [])
}

try {
  const pending = await setup()
  const automaticVerification = pending.page.waitForResponse(
    (response) => new URL(response.url()).pathname === verifyPath
  )
  await openCallback(pending.page)
  await automaticVerification
  await pending.page
    .getByRole("heading", { name: "Your payment is being checked" })
    .waitFor()
  await pending.page
    .getByRole("button", { name: "Check status", exact: true })
    .waitFor()
  assert.equal(verifyCount(pending), 1)
  await assertUnconfirmed(pending.page)

  const manualVerification = pending.page.waitForResponse(
    (response) => new URL(response.url()).pathname === verifyPath
  )
  await pending.page
    .getByRole("button", { name: "Check status", exact: true })
    .click()
  await manualVerification
  await pending.page
    .getByRole("button", { name: "Check status", exact: true })
    .waitFor()
  await pending.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === paymentPath &&
      response.request().method() === "GET"
  )
  assert.equal(verifyCount(pending), 2)
  await assertUnconfirmed(pending.page)
  assertNoCharges(pending)
  await pending.context.close()

  for (const status of ["pending", "expired"]) {
    const retry = await setup({ status, failFirst: true })
    await openCallback(retry.page)
    await retry.page
      .getByText("Provider verification is temporarily unavailable", {
        exact: false,
      })
      .waitFor()
    await assertUnconfirmed(retry.page)
    assert.equal(verifyCount(retry), 1)
    await retry.page
      .getByRole("button", { name: "Check status", exact: true })
      .click()
    await retry.page
      .getByRole("heading", {
        name:
          status === "pending" ? "Your order is confirmed" : "Order expired",
        exact: true,
      })
      .waitFor()
    if (status === "expired") {
      await retry.page
        .getByText("Payment was received after this order closed.", {
          exact: false,
        })
        .waitFor()
      await retry.page
        .getByRole("button", { name: "Check status", exact: true })
        .waitFor()
      await assertUnconfirmed(retry.page)
    }
    assert.equal(verifyCount(retry), 2)
    assertNoCharges(retry)
    await retry.context.close()
  }
  console.log(
    "Payment verification browser checks passed: automatic callback verification, manual retry, GET-only polling, spoofed success remains unconfirmed, pending and expired failure recovery, no extra charges."
  )
} finally {
  await browser.close()
}
