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
  subtotal: 400000,
  shipping: 3000,
  tax: 27906.9767,
  discount: 0,
  total: 403000,
  cursor: 42,
}
const secondOrder = {
  ...summary,
  id: "11111111-1111-4111-8111-000000000007",
  reference: "G-11111111-1111-4111-8111-000000000007",
  status: "pending",
  subtotal: 402000,
  total: 405000,
  cursor: 43,
}
const initialLine = {
  id: lineId,
  product: id,
  variant: id,
  name: "Examination gloves",
  sku: "SKU-11111111111141118111000000000006",
  unit: "piece",
  pack: 1,
  quantity: 1,
  price: 400000,
  total: 403000,
  discount: 0,
  shipping: 3000,
  tax: 27906.9767,
  taxes: [{ name: "VAT", rate: 7.5, amount: 27906.9767 }],
  options: {},
  status: "pending",
  version: 1,
  returnstate: "none",
  tracking: {},
  received: null,
}
const original = {
  ...summary,
  subtotal: 400000,
  shipping: 3000,
  tax: 27906.9767,
  commission: 40000,
  version: 1,
  modified: "2026-10-06T09:05:00+01:00",
  notes: "Deliver to the receiving desk.",
  delivery: {
    name: "Test Customer",
    phone: "+2348000000000",
    address: "1 Test Road",
    city: "Abuja",
    state: "FCT",
    country: "NG",
  },
  items: [initialLine],
  payments: [
    {
      id: "11111111-1111-4111-8111-000000000008",
      kind: "charge",
      status: "succeeded",
      amount: 403000,
      currency: "NGN",
      method: null,
      settled: "2026-10-06T09:05:00+01:00",
    },
  ],
  history: [
    {
      id: "11111111-1111-4111-8111-000000000009",
      item: null,
      action: "placed",
      before: "draft",
      after: "pending",
      reason: null,
      entry: "2026-10-06T09:00:00+01:00",
    },
    {
      id: "11111111-1111-4111-8111-000000000010",
      item: null,
      action: "payment-started",
      before: null,
      after: "pending",
      reason: null,
      entry: "2026-10-06T09:02:00+01:00",
    },
    {
      id: "11111111-1111-4111-8111-000000000011",
      item: null,
      action: "charge-succeeded",
      before: "pending",
      after: "confirmed",
      reason: null,
      entry: "2026-10-06T09:05:00+01:00",
    },
  ],
}
const widths = [320, 375, 390, 414, 768, 1024, 1280, 1440, 1920]
async function resize(page, width) {
  await page.setViewportSize({ width, height: 1000 })
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => {
          const timing = animation.effect?.getComputedTiming()
          return (
            animation.playState === "running" && Number(timing?.endTime) < 1000
          )
        })
        .map((animation) => animation.finished.catch(() => {}))
    )
  })
}
try {
  for (const role of ["customer", "supplier", "admin"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    })
    await fixtures(context, role)
    let detail = structuredClone(original),
      failOnce = true,
      paginated = false
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
            items: [secondOrder, summary],
            records: paginated ? 45 : 2,
            isNext: paginated && url.searchParams.get("cursor") === "0",
            isPrevious: paginated && url.searchParams.get("cursor") !== "0",
            nextCursor: paginated ? 42 : 0,
            previousCursor: paginated ? 12 : 0,
          })
        }
        return ok(detail)
      }
    )
    const page = await context.newPage()
    const browserErrors = [],
      browserWarnings = []
    page.on("pageerror", (error) => browserErrors.push(error.message))
    page.on("console", (message) => {
      if (["warning", "error"].includes(message.type()))
        browserWarnings.push(message.text())
    })
    await page.goto(`${base}/${role}/orders`)
    await page
      .getByRole("link", { name: `View order ${summary.reference}` })
      .waitFor()
    const table = page.getByRole("table", { name: "Orders", exact: true })
    await table.waitFor()
    assert.equal(
      await table.locator("tbody tr").count(),
      2,
      `${role}: both API rows render`
    )
    assert.equal(
      await table.getByRole("columnheader").count(),
      5,
      `${role}: labelled data and action columns`
    )
    assert.equal(
      await page
        .locator("main article")
        .filter({ hasText: summary.reference })
        .count(),
      0,
      `${role}: order list renders rows rather than cards`
    )
    for (const order of [summary, secondOrder]) {
      const row = table.getByRole("row").filter({ hasText: order.reference })
      assert.equal(
        await row.count(),
        1,
        `${role}: full order reference is preserved`
      )
      assert.match(await row.innerText(), new RegExp(order.status, "i"))
      assert.ok(
        (await row.innerText()).includes(
          new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
          }).format(order.total)
        )
      )
      assert.equal(
        await row
          .getByRole("link", { name: `View order ${order.reference}` })
          .getAttribute("href"),
        `/${role}/orders/${order.id}`
      )
    }
    for (const direction of ["Older", "Newer"]) {
      const button = page.getByRole("button", { name: direction, exact: true })
      if (await button.count())
        assert.equal(
          await button.isDisabled(),
          true,
          `${direction} unavailable for two-row response`
        )
    }
    for (const width of widths) {
      await resize(page, width)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1
      )
      assert.equal(overflow, false, `${role} orders overflow ${width}`)
      const metric = await page
        .locator("main article")
        .filter({ has: page.getByText("Order value", { exact: true }) })
        .locator(".tabular-nums")
        .evaluate((element) => {
          const range = document.createRange()
          range.selectNodeContents(element)
          return {
            lines: range.getClientRects().length,
            fits: element.scrollWidth <= element.clientWidth + 1,
          }
        })
      assert.equal(
        metric.lines,
        1,
        `${role} ${width}: order value stays on one line`
      )
      assert.equal(
        metric.fits,
        true,
        `${role} ${width}: order value fits its tile`
      )
      const scroll = page.getByRole("region", {
        name: "Orders table",
        exact: true,
      })
      const geometry = await scroll.evaluate((element) => ({
        width: element.clientWidth,
        content: element.scrollWidth,
        overflow: getComputedStyle(element).overflowX,
        focusable: element.tabIndex,
      }))
      assert.equal(
        geometry.overflow,
        "auto",
        `${role} ${width}: overflow contained in table`
      )
      assert.equal(
        geometry.focusable,
        0,
        `${role} ${width}: scroll region is keyboard accessible`
      )
      if (width <= 414) {
        assert.ok(
          geometry.content > geometry.width,
          `${role} ${width}: table can scroll without squashing columns`
        )
        await scroll.focus()
        await page.keyboard.press("End")
        await scroll.evaluate((element) => {
          element.scrollLeft = element.scrollWidth
        })
        assert.ok(
          await scroll.evaluate((element) => element.scrollLeft > 0),
          `${role} ${width}: action column can be reached`
        )
        await scroll.evaluate((element) => {
          element.scrollLeft = 0
        })
      }
      const selects = await page
        .locator("main select")
        .evaluateAll((elements) =>
          elements.map((element) => {
            const style = getComputedStyle(element)
            return {
              appearance: style.appearance,
              arrowImage: style.backgroundImage,
              arrowX: style.backgroundPositionX,
              arrowY: style.backgroundPositionY,
              paddingRight: Number.parseFloat(style.paddingRight),
              name:
                element.getAttribute("aria-label") ||
                document.querySelector(`label[for="${element.id}"]`)
                  ?.textContent,
            }
          })
        )
      assert.ok(selects.length >= 1)
      for (const select of selects) {
        assert.equal(
          select.appearance,
          "none",
          `${role} ${width}: native arrow does not overlap custom arrow`
        )
        assert.notEqual(
          select.arrowImage,
          "none",
          `${role} ${width}: dropdown arrow is visible`
        )
        assert.equal(
          select.arrowY,
          "50%",
          `${role} ${width}: dropdown arrow is vertically centered`
        )
        assert.match(
          select.arrowX,
          /calc\(100% - (1[0-9]|20)px\)/,
          `${role} ${width}: dropdown arrow has breathing room from the edge`
        )
        assert.ok(
          select.paddingRight >= 36,
          `${role} ${width}: select text leaves space for arrow`
        )
        assert.ok(
          select.name,
          `${role} ${width}: select has visible or accessible label`
        )
      }
    }
    await resize(page, 1440)
    const filterControls = [
      page.getByLabel("From", { exact: true }),
      page.getByLabel("Through", { exact: true }),
      page.getByLabel("Order status", { exact: true }),
      ...(role === "customer"
        ? []
        : [page.getByLabel("Item status", { exact: true })]),
      page.getByRole("button", { name: "Apply filters" }),
    ]
    const boxes = await Promise.all(
      filterControls.map((control) => control.boundingBox())
    )
    assert.ok(boxes.every(Boolean))
    const bottoms = boxes.map((box) => box.y + box.height)
    assert.ok(
      Math.max(...bottoms) - Math.min(...bottoms) <= 3,
      `${role}: filters align in one compact desktop row`
    )
    const listAccessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze()
    assert.deepEqual(
      listAccessibility.violations.map((v) => v.id),
      [],
      `${role} order table accessibility`
    )
    assert.deepEqual(browserErrors, [], `${role}: no uncaught browser errors`)
    assert.deepEqual(
      browserWarnings,
      [],
      `${role}: no hydration or console warnings on order list`
    )
    await page
      .getByRole("region", { name: "Orders table", exact: true })
      .evaluate((element) => element.blur())
    await page.screenshot({
      path: `/private/tmp/getty-order-table-${role}-1440.png`,
      fullPage: true,
    })
    await resize(page, 390)
    await page.screenshot({
      path: `/private/tmp/getty-order-table-${role}-390.png`,
      fullPage: true,
    })
    await resize(page, 1440)
    paginated = true
    await Promise.all([
      page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
          (role === "customer" ? "/getty/v1/order" : "/getty/v1/order/vendor")
      ),
      page.reload(),
    ])
    await page.getByRole("button", { name: "Older", exact: true }).waitFor()
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
    await page.getByRole("tab", { name: /^items$/i }).waitFor()
    const main = page.locator("main")
    const items = page.getByRole("tabpanel")
    assert.match(await main.innerText(), /\bconfirmed\b/i)
    assert.match(await items.innerText(), /Awaiting fulfilment/i)
    assert.equal(
      await page.getByRole("button", { name: "Refresh", exact: true }).count(),
      0
    )
    assert.ok(
      (await main.innerText()).includes("403,000.00"),
      `${role}: API total remains authoritative`
    )
    assert.ok(
      !(await main.innerText()).includes("430,906.98"),
      `${role}: included tax is not added to total`
    )
    assert.match(
      await main.innerText(),
      /tax[^\n]*included|includes?[^\n]*tax/i
    )
    assert.ok(
      (await main.innerText()).includes("27,906.98"),
      `${role}: tax amount is formatted without changing total`
    )
    assert.match(await items.innerText(), /VAT/)
    assert.match(await items.innerText(), /7\.5\s*%/)
    if (role === "customer") {
      assert.equal(
        await page
          .getByRole("button", { name: "Confirm delivery", exact: true })
          .count(),
        0,
        "a confirmed order with pending item cannot be marked delivered"
      )
    }
    const detailTabs =
      role === "customer"
        ? ["Items", "Delivery", "Payments", "History"]
        : ["Items", "Delivery", "History"]
    for (const tab of detailTabs) {
      await page.getByRole("tab", { name: new RegExp(`^${tab}$`, "i") }).click()
      const panel = page.getByRole("tabpanel")
      const text = await panel.innerText()
      if (tab === "Delivery") {
        for (const rawValue of Object.values(original.delivery)) {
          const value = rawValue === "NG" ? "Nigeria" : rawValue
          assert.ok(text.includes(value), `${role}: delivery shows ${value}`)
        }
        assert.ok(
          text.includes(original.notes),
          `${role}: delivery notes are retained`
        )
      }
      if (tab === "Payments") {
        assert.ok(
          text.includes("403,000.00"),
          "successful charge amount is visible"
        )
        assert.match(text, /\bPaid\b/)
        assert.doesNotMatch(text, /not settled/i)
      }
      if (tab === "History") {
        assert.equal(
          await panel.locator("ol > li").count(),
          original.history.length,
          `${role}: every recorded event is shown`
        )
        assert.doesNotMatch(
          text,
          /payment-started|charge-succeeded/,
          "history uses readable event labels"
        )
        assert.deepEqual(
          await panel.locator("ol > li > p:first-of-type").allTextContents(),
          ["Payment received", "Payment initiated", "Order placed"],
          `${role}: activity is named and ordered newest first`
        )
      }
      for (const width of widths) {
        await resize(page, width)
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1
          ),
          false,
          `${role} ${tab} detail overflow ${width}`
        )
        const visible = await main.innerText()
        for (const internal of [
          initialLine.sku,
          lineId,
          original.payments[0].id,
        ])
          assert.ok(
            !visible.includes(internal),
            `${role} ${tab}: hides internal identifier ${internal}`
          )
      }
      await resize(page, 1440)
      const tabAccessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
      assert.deepEqual(
        tabAccessibility.violations.map((v) => v.id),
        [],
        `${role} ${tab} detail accessibility`
      )
      await page.screenshot({
        path: `/private/tmp/getty-order-detail-${role}-${tab.toLowerCase()}-1440.png`,
        fullPage: true,
      })
      await resize(page, 390)
      await page.screenshot({
        path: `/private/tmp/getty-order-detail-${role}-${tab.toLowerCase()}-390.png`,
        fullPage: true,
      })
    }
    assert.deepEqual(
      browserErrors,
      [],
      `${role}: detail has no uncaught errors`
    )
    assert.deepEqual(
      browserWarnings,
      [],
      `${role}: detail has no hydration or console warnings`
    )
    if (role === "customer") {
      detail.status = "shipped"
      detail.items[0].status = "shipped"
      detail.items[0].version = 3
      await page.reload()
    } else {
      await page.getByRole("tab", { name: /^items$/i }).click()
    }
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
