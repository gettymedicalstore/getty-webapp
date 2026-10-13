import { createRequire } from "node:module"
import assert from "node:assert/strict"
import { fixtures, id } from "./fixtures.mjs"
const require = createRequire(
  `${process.env.AUDIT_TOOLS_DIR || "/private/tmp/getty-browser-audit"}/package.json`
)
const { chromium } = require("playwright")
const AxeBuilder = require("@axe-core/playwright").default
const browser = await chromium.launch({ channel: "chrome", headless: true })
const base = process.env.AUDIT_BASE_URL || "http://localhost:3000"
const orderId = "11111111-1111-4111-8111-000000000005"
const lineId = "11111111-1111-4111-8111-000000000006"
const summary = {
  id: orderId,
  reference: "G-11111111-1111-4111-8111-000000000005",
  currency: "NGN",
  status: "confirmed",
  placed: "2026-10-06T09:00:00+01:00",
  total: 10500,
  cursor: 42,
}
const initialLine = {
  id: lineId,
  product: id,
  variant: id,
  name: "Examination gloves",
  sku: "GLV-100",
  unit: "box",
  pack: 100,
  quantity: 1,
  price: 7500,
  total: 10500,
  status: "pending",
  version: 1,
  returnstate: "none",
  tracking: {},
}
const original = {
  ...summary,
  subtotal: 7500,
  shipping: 3000,
  tax: 0,
  commission: 750,
  version: 1,
  delivery: {
    name: "Test Customer",
    phone: "+2348000000000",
    address: "1 Test Road",
    city: "Abuja",
    state: "FCT",
    country: "NG",
  },
  items: [initialLine],
  payments: [],
  history: [],
}
const widths = [320, 375, 390, 414, 768, 1024, 1280, 1440, 1920]
try {
  for (const role of ["customer", "supplier", "admin"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    })
    await fixtures(context, role)
    let detail = structuredClone(original),
      failOnce = true
    if (role === "customer") {
      detail.status = "shipped"
      detail.items[0].status = "shipped"
      detail.items[0].version = 3
    }
    const writes = [],
      lists = []
    await context.route(
      "https://api.gettymedicalstores.com/getty/v1/order**",
      async (route) => {
        const req = route.request(),
          url = new URL(req.url())
        const ok = (data) =>
          route.fulfill({
            json: { status: 200, success: true, message: "OK", data },
          })
        if (req.method() === "POST") {
          const body = req.postDataJSON()
          writes.push({ path: url.pathname, body })
          if (failOnce) {
            failOnce = false
            return route.abort("failed")
          }
          if (body.action) {
            detail.items[0].status =
              body.action === "deliver" ? "delivered" : "accepted"
            detail.items[0].version++
          }
          return ok(detail)
        }
        if (
          ["/getty/v1/order", "/getty/v1/order/vendor"].includes(url.pathname)
        ) {
          lists.push(Object.fromEntries(url.searchParams))
          return ok({
            items: [summary],
            records: 45,
            isNext: url.searchParams.get("cursor") === "0",
            isPrevious: url.searchParams.get("cursor") !== "0",
            nextCursor: 42,
            previousCursor: 12,
          })
        }
        return ok(detail)
      }
    )
    const page = await context.newPage()
    await page.goto(`${base}/${role}/orders`)
    await page
      .getByRole("link", { name: `View order ${summary.reference}` })
      .waitFor()
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 })
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1
      )
      assert.equal(overflow, false, `${role} orders overflow ${width}`)
    }
    await page.setViewportSize({ width: 1440, height: 1000 })
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("cursor=42")),
      page.getByRole("button", { name: "Older", exact: true }).click(),
    ])
    assert.equal(lists.at(-1).navigation, "next")
    await page.getByLabel("From", { exact: true }).fill("2026-09-01")
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("starts=2026-08-31")),
      page.getByRole("button", { name: "Apply filters" }).click(),
    ])
    assert.equal(lists.at(-1).cursor, "0")
    await page
      .getByRole("link", { name: `View order ${summary.reference}` })
      .click()
    const action = role === "customer" ? "Confirm delivery" : "Accept item"
    await page.getByRole("button", { name: action, exact: true }).waitFor()
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 })
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1
      )
      assert.equal(overflow, false, `${role} detail overflow ${width}`)
    }
    await page.getByRole("button", { name: action, exact: true }).click()
    await page
      .getByRole("dialog")
      .getByRole("button", { name: action, exact: true })
      .click()
    await page.getByRole("alert").waitFor()
    await page
      .getByRole("dialog")
      .getByRole("button", { name: action, exact: true })
      .click()
    await page.getByRole("dialog").waitFor({ state: "hidden" })
    assert.equal(writes.length, 2)
    assert.deepEqual(
      writes[0],
      writes[1],
      "Failed response retry preserves exact body/token"
    )
    assert.match(writes[0].path, new RegExp(`/items/${lineId}/actions$`))
    assert.equal(writes[0].body.version, role === "customer" ? 3 : 1)
    if (role === "supplier") {
      await page
        .getByRole("button", { name: "Mark as shipped", exact: true })
        .click()
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Mark as shipped", exact: true })
        .click()
      assert.equal(writes.length, 2, "invalid shipping form never sends")
      await page.getByLabel("Carrier", { exact: true }).fill("Test Carrier")
      await page
        .getByLabel("Tracking number", { exact: true })
        .fill("TRACK-100")
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Mark as shipped", exact: true })
        .click()
      await page.getByRole("dialog").waitFor({ state: "hidden" })
      assert.equal(writes[2].body.carrier, "Test Carrier")
      assert.equal(writes[2].body.tracking, "TRACK-100")
      assert.equal(writes[2].body.version, 2)
    }
    await page.setViewportSize({ width: 1440, height: 1000 })
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze()
    if (accessibility.violations.length)
      console.log(
        JSON.stringify(
          accessibility.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          }))
        )
      )
    assert.deepEqual(
      accessibility.violations.map((v) => v.id),
      [],
      `${role} detail accessibility`
    )
    await page.screenshot({
      path: `/private/tmp/getty-order-${role}.png`,
      fullPage: true,
    })
    console.log(
      `${role}: dates, paging, responsive list/detail, confirmed action and idempotent retry passed`
    )
    await context.close()
  }
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  })
  await fixtures(context, "admin")
  const attempts = [
    {
      id: "refund-unknown",
      purchase: orderId,
      kind: "refund",
      status: "unknown",
      currency: "NGN",
      amount: 500,
      failure: "Awaiting provider confirmation",
    },
    {
      id: "refund-failed",
      purchase: orderId,
      kind: "refund",
      status: "failed",
      currency: "NGN",
      amount: 1000,
      failure: "Provider confirmed failure",
    },
  ]
  const writes = []
  await context.route(
    "https://api.gettymedicalstores.com/getty/v1/order/support/payments**",
    async (route) => {
      const request = route.request(),
        url = new URL(request.url())
      if (request.method() === "POST") {
        writes.push({ path: url.pathname, body: request.postData() })
        return route.fulfill({
          status: 202,
          json: {
            status: 202,
            success: true,
            data: attempts[url.pathname.includes("refund-failed") ? 1 : 0],
          },
        })
      }
      return route.fulfill({
        json: { status: 200, success: true, data: attempts },
      })
    }
  )
  const page = await context.newPage()
  await page.goto(`${base}/admin/payments`)
  await page.getByRole("button", { name: "Retry failed refund" }).waitFor()
  assert.equal(
    await page.getByRole("button", { name: "Retry failed refund" }).count(),
    1
  )
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1
      ),
      false,
      `recovery overflow ${width}`
    )
  }
  await page
    .getByRole("button", { name: "Verify with provider" })
    .first()
    .click()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click()
  await page.getByRole("dialog").waitFor({ state: "hidden" })
  assert.equal(
    writes[0].path,
    "/getty/v1/order/support/payments/refund-unknown/reconcile"
  )
  assert.equal(writes[0].body, null)
  await page.getByRole("button", { name: "Retry failed refund" }).click()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click()
  await page.getByRole("dialog").waitFor({ state: "hidden" })
  assert.equal(
    writes[1].path,
    "/getty/v1/order/support/payments/refund-failed/retry-refund"
  )
  assert.deepEqual(Object.keys(JSON.parse(writes[1].body)), ["token"])
  console.log(
    "Finance: uncertainty-safe reconciliation, failed-refund confirmation and nine responsive widths passed"
  )
  await context.close()
} finally {
  await browser.close()
}
