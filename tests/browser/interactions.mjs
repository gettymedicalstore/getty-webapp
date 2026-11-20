import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"
import assert from "node:assert/strict"
import {
  fixtures,
  id,
  product,
  operationsDetail,
  orderDetail,
} from "./fixtures.mjs"
const require = createRequire(
  `${process.env.AUDIT_TOOLS_DIR || "/private/tmp/getty-browser-audit"}/package.json`
)
const { chromium } = require("playwright")
const { default: AxeBuilder } = require("@axe-core/playwright")
const out = process.env.AUDIT_OUTPUT || "/private/tmp/getty-review/interactions"
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: "chrome", headless: true })
const results = []
async function check(name, role, run) {
  if (process.env.AUDIT_SCENARIO && !name.includes(process.env.AUDIT_SCENARIO))
    return
  const context = await browser.newContext({
    viewport: { width: 320, height: 900 },
    reducedMotion: "reduce",
  })
  await fixtures(context, role)
  const page = await context.newPage()
  try {
    await run(page)
    results.push({ name, passed: true })
  } catch (error) {
    results.push({ name, passed: false, error: error.message })
    await page.screenshot({ path: `${out}/${name}-failure.png` })
  } finally {
    await context.close()
    console.log(results.at(-1))
    await writeFile(`${out}/report.json`, JSON.stringify(results, null, 2))
  }
}
async function goto(page, path) {
  await page.goto(
    `${process.env.AUDIT_BASE_URL || "http://localhost:3000"}${path}`,
    { waitUntil: "networkidle" }
  )
  await page.waitForTimeout(300)
}
async function inspect(page, name) {
  for (const width of [320, 375, 390, 414, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    await page.waitForTimeout(80)
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1
      ),
      true,
      `Overflow at ${width}`
    )
    await page.screenshot({ path: `${out}/${name}-${width}.png` })
  }
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze()
  assert.deepEqual(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    []
  )
}
await check("guest-cart", null, async (page) => {
  await goto(page, "/products")
  await page
    .getByRole("button", { name: "Add to cart", exact: true })
    .first()
    .click()
  await page
    .getByRole("button", { name: /Increase.*quantity/i })
    .first()
    .waitFor()
  await page
    .getByRole("button", { name: /Increase.*quantity/i })
    .first()
    .click()
  await goto(page, "/cart")
  await page
    .getByText("Adjustable examination chair", { exact: true })
    .first()
    .waitFor()
  await inspect(page, "populated-cart")
  await page.getByRole("link", { name: "Checkout", exact: true }).click()
  await page.waitForURL(/\/login/)
  assert.match(page.url(), /checkout/)
  await goto(page, "/cart")
  await page
    .getByRole("button", { name: "Remove Item", exact: true })
    .first()
    .click()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove Item", exact: true })
    .click()
  await page.getByText(/Your (shopping )?bag is empty/i).waitFor()
})
await check("category-dialog", "admin", async (page) => {
  await goto(page, "/admin/categories")
  await page.getByRole("button", { name: "Add category", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await dialog.waitFor()
  await inspect(page, "category-dialog")
  const text = dialog.locator("textarea")
  const input = dialog.locator('input[name="name"]')
  assert.ok(
    (await text.boundingBox()).width >= (await input.boundingBox()).width - 2
  )
  await dialog.getByRole("button", { name: /Add category|Save/i }).click()
  assert.ok((await dialog.locator('[aria-invalid="true"]').count()) > 0)
  assert.equal(
    await dialog.locator("form").evaluate((el) => el.noValidate),
    true
  )
  await page.keyboard.press("Escape")
  await page.getByRole("dialog").waitFor({ state: "hidden" })
})
await check("workspace-navigation", "supplier", async (page) => {
  await goto(page, "/supplier/orders")
  const trigger = page.getByRole("button", { name: "Open navigation" })
  await trigger.click()
  await page.getByRole("dialog").waitFor()
  await page.keyboard.press("Escape")
  await page.waitForTimeout(300)
  assert.equal(
    await trigger.evaluate((el) => el === document.activeElement),
    true
  )
})
await check("order-table-and-detail", "customer", async (page) => {
  await goto(page, "/customer/orders")
  await page.getByRole("table", { name: "Orders" }).waitFor()
  await page.getByRole("link", { name: `View order G-${id}` }).click()
  await page.getByText("Adjustable examination chair").waitFor()
  await page.getByRole("heading", { name: "Order summary" }).waitFor()
  await page
    .getByRole("region", { name: "Current delivery stage" })
    .getByText("Preparing your order")
    .waitFor()
  assert.equal(await page.getByText(/SKU-/).count(), 0)
  await inspect(page, "order-detail")
})
await check("admin-orders-to-fulfilment", "admin", async (page) => {
  await goto(page, "/admin/orders")
  await page.getByRole("table", { name: "Orders" }).waitFor()
  await page.getByRole("link", { name: /View order details for/ }).click()
  await page.waitForURL(`**/admin/orders/${id}`)
  await page.getByRole("heading", { name: "Order summary" }).waitFor()
  await page.getByText("Please call on arrival.").waitFor()
  assert.equal(
    await page.getByRole("button", { name: "Confirm receipt" }).count(),
    0
  )
  await page.getByRole("link", { name: "Update order status" }).waitFor()
  await page.getByRole("link", { name: "Back to orders" }).click()
  await page.waitForURL("**/admin/orders")
  await page.getByRole("link", { name: /View order details for/ }).click()
  await page.getByRole("link", { name: "Update order status" }).click()
  await page.waitForURL(`**/admin/fulfilment/${id}`)
  await page.getByRole("button", { name: "Confirm receipt" }).waitFor()
  await page.getByRole("link", { name: "Back to order fulfilment" }).click()
  await page.waitForURL("**/admin/fulfilment")
  await page.getByRole("table", { name: "Fulfilment orders" }).waitFor()
})
await check("Getty-fulfilment-handover", "admin", async (page) => {
  const calls = []
  await page.route("**/getty/v1/order/supply/actions", (route) => {
    const body = JSON.parse(route.request().postData())
    calls.push(body)
    return route.fulfill({
      json: {
        status: 200,
        success: true,
        message: "OK",
        data: {
          ...operationsDetail,
          version: 4,
          items: operationsDetail.items.map((item) => ({
            ...item,
            version: 3,
            supply: {
              status: "received",
              reference: body.reference,
              updated: "2026-10-15T12:00:00+01:00",
            },
          })),
        },
      },
    })
  })
  await page.route("**/getty/v1/order/actions", (route) => {
    const body = JSON.parse(route.request().postData())
    calls.push(body)
    return route.fulfill({
      json: {
        status: 200,
        success: true,
        message: "OK",
        data: {
          ...operationsDetail,
          fulfilment: "ready",
          version: 5,
          items: operationsDetail.items.map((item) => ({
            ...item,
            version: 3,
            supply: {
              status: "received",
              reference: "GETTY-1",
              updated: "2026-10-15T12:00:00+01:00",
            },
          })),
        },
      },
    })
  })
  await goto(page, `/admin/fulfilment/${id}`)
  await page
    .getByRole("button", { name: "Confirm receipt", exact: true })
    .click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: "Confirm Getty receipt" }).click()
  assert.ok(await dialog.locator('[aria-invalid="true"]').count())
  await dialog.getByLabel("Physical handover reference").fill("GETTY-1")
  await dialog.getByRole("checkbox").check()
  await dialog.getByRole("button", { name: "Confirm Getty receipt" }).click()
  await page.getByRole("button", { name: "Confirm packed and ready" }).waitFor()
  assert.deepEqual(
    Object.keys(calls[0]).sort(),
    ["action", "itemId", "orderId", "reference", "token", "version"].sort()
  )
  assert.equal(calls[0].action, "receive")
  assert.equal(calls[0].version, 2)
  await page.getByRole("button", { name: "Confirm packed and ready" }).click()
  await page.getByRole("dialog").getByRole("checkbox").check()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Mark order ready" })
    .click()
  await page.getByRole("button", { name: "Dispatch order" }).waitFor()
  assert.deepEqual(
    Object.keys(calls[1]).sort(),
    ["action", "orderId", "token", "version"].sort()
  )
  assert.equal(calls[1].version, 4)
})
await check("supplier-custody-privacy", "supplier", async (page) => {
  const accepted = {
    ...orderDetail,
    status: "processing",
    fulfilment: "preparing",
    items: orderDetail.items.map((item) => ({
      ...item,
      supply: { status: "accepted", reference: null, updated: null },
    })),
  }
  let submitted
  await page.route(`**/getty/v1/order/vendor/${id}`, (route) =>
    route.fulfill({
      json: { status: 200, success: true, message: "OK", data: accepted },
    })
  )
  await page.route("**/getty/v1/order/supply/actions", (route) => {
    submitted = JSON.parse(route.request().postData())
    return route.fulfill({
      json: {
        status: 200,
        success: true,
        message: "OK",
        data: {
          ...accepted,
          items: accepted.items.map((item) => ({
            ...item,
            version: 2,
            supply: {
              status: "supplied",
              reference: submitted.reference,
              updated: "2026-10-15T12:00:00+01:00",
            },
          })),
        },
      },
    })
  })
  await goto(page, `/supplier/orders/${id}`)
  assert.equal(await page.getByText("12 Medical Road").count(), 0)
  assert.equal(await page.getByText("+2348000000000").count(), 0)
  await page.getByRole("button", { name: "Record physical handover" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Physical handover reference").fill("HANDOVER-2")
  await dialog.getByRole("checkbox").check()
  await dialog.getByRole("button", { name: "Record physical handover" }).click()
  await page.getByText(/Supply: Supplied/i).waitFor()
  assert.deepEqual(
    Object.keys(submitted).sort(),
    ["action", "itemId", "orderId", "reference", "token", "version"].sort()
  )
  assert.equal(submitted.action, "supply")
  assert.equal(submitted.version, 1)
})
await check("buyer-whole-order-receipt", "customer", async (page) => {
  const dispatched = {
    ...orderDetail,
    version: 7,
    status: "shipped",
    fulfilment: "dispatched",
    tracking: {
      carrier: "Getty",
      reference: "WAYBILL-1",
      dispatched: "2026-10-15T12:00:00+01:00",
    },
    history: [
      ...orderDetail.history,
      {
        id: "10000000-0000-4000-8000-000000000090",
        item: orderDetail.items[0].id,
        action: "supply-receive",
        before: "supplied",
        after: "received",
        reason: null,
        entry: "2026-10-15T11:00:00+01:00",
      },
      {
        id: "10000000-0000-4000-8000-000000000091",
        item: null,
        action: "fulfilment-dispatch",
        before: "ready",
        after: "dispatched",
        reason: null,
        entry: "2026-10-15T12:00:00+01:00",
      },
    ],
  }
  let submitted
  let updated = false
  await page.route(`**/getty/v1/order/${id}`, (route) =>
    route.fulfill({
      json: {
        status: 200,
        success: true,
        message: "OK",
        data: updated
          ? {
              ...dispatched,
              status: "completed",
              fulfilment: "delivered",
              version: 8,
            }
          : dispatched,
      },
    })
  )
  await page.route("**/getty/v1/order/actions", (route) => {
    submitted = JSON.parse(route.request().postData())
    updated = true
    return route.fulfill({
      json: {
        status: 200,
        success: true,
        message: "OK",
        data: {
          ...dispatched,
          status: "completed",
          fulfilment: "delivered",
          version: 8,
        },
      },
    })
  })
  await goto(page, `/customer/orders/${id}`)
  await page.getByRole("tab", { name: /delivery/i }).click()
  await page
    .getByRole("button", { name: "Confirm receipt of my order" })
    .click()
  await page.getByRole("dialog").getByRole("checkbox").check()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm receipt", exact: true })
    .click()
  await page.waitForFunction(() =>
    document
      .querySelector('ol[aria-label="Order delivery timeline"] li:last-child')
      ?.classList.contains("border-emerald-200")
  )
  assert.deepEqual(
    Object.keys(submitted).sort(),
    ["action", "orderId", "token", "version"].sort()
  )
  assert.equal(submitted.action, "deliver")
  assert.equal(submitted.version, 7)
  await page.getByRole("tab", { name: /history/i }).click()
  assert.equal(await page.getByText(/supply receive/i).count(), 0)
})
await check("public-order-code-lookup", null, async (page) => {
  const requests = []
  await page.route("**/getty/ecommerce/orders/tracking/*", (route) => {
    requests.push(route.request().url())
    return route.fulfill({
      json: {
        status: 200,
        success: true,
        message: "OK",
        data: {
          orderCode: "2610-K7P4",
          status: "processing",
          fulfilment: "ready",
          placed: "2026-11-19T10:00:00+01:00",
          estimatedDelivery: null,
          timeline: [
            { status: "placed", at: "2026-11-19T10:00:00+01:00" },
            { status: "ready", at: "2026-11-19T11:00:00+01:00" },
          ],
        },
      },
    })
  })
  await goto(page, "/track-order")
  await page.getByLabel("Order number").fill(" 2610-k7p4 ")
  await page.getByRole("button", { name: "Track order" }).click()
  await page.getByRole("heading", { name: "Delivery progress" }).waitFor()
  assert.equal(await page.getByText("2610-K7P4", { exact: true }).count(), 1)
  assert.equal(
    await page.locator('ol[aria-label="Delivery timeline"] li').count(),
    5
  )
  assert.equal(requests.length, 1)
  assert.ok(requests[0].endsWith("/2610-K7P4"))
  assert.equal(await page.getByRole("link", { name: /sign in/i }).count(), 0)
})
await check("order-response-error", "supplier", async (page) => {
  await page.route("**/getty/v1/order/vendor?*", (route) =>
    route.fulfill({
      json: { status: 200, success: true, message: "OK", data: [] },
    })
  )
  await goto(page, "/supplier/orders")
  const error = page.getByRole("alert")
  await error.getByText("We couldn’t load your orders").waitFor()
  assert.equal(await error.getByText(/invalid_type/).count(), 0)
  await error.getByText(/Please try again in a moment/).waitFor()
})
await check("password-dialog", "admin", async (page) => {
  await goto(page, "/admin/settings")
  await page.getByRole("button", { name: /Change password/i }).click()
  await inspect(page, "password-dialog")
  const dialog = page.getByRole("dialog")
  await dialog
    .getByRole("button", { name: /Update password|Change password/i })
    .click()
  assert.ok((await dialog.locator('[aria-invalid="true"]').count()) > 0)
})
await check("product-photos", "admin", async (page) => {
  await goto(page, `/admin/products/${id}?tab=photos`)
  await page
    .getByRole("button", { name: "Upload multiple images", exact: true })
    .first()
    .click()
  await inspect(page, "upload-dialog")
  assert.equal(
    await page
      .getByRole("dialog")
      .locator("input[type=file]")
      .getAttribute("multiple"),
    ""
  )
})
await check("signup-validation", null, async (page) => {
  await goto(page, "/register")
  const agreement = page.getByRole("checkbox", {
    name: "I agree to the Terms of Service",
  })
  assert.equal(await agreement.isVisible(), true)
  const uncheckedBorder = await agreement.evaluate((element) => {
    const style = getComputedStyle(element)
    return { width: style.borderTopWidth, color: style.borderTopColor }
  })
  assert.notEqual(uncheckedBorder.width, "0px")
  assert.notEqual(uncheckedBorder.color, "rgba(0, 0, 0, 0)")
  await page
    .getByRole("button", { name: "Send verification code", exact: true })
    .click()
  assert.ok((await page.locator('[aria-invalid="true"]').count()) > 0)
  await inspect(page, "signup-errors")
})
await check("hero-carousel", null, async (page) => {
  const secondId = "10000000-0000-4000-8000-000000000004"
  await page.route("**/getty/ecommerce/featured/*/photo", (route) =>
    route.fulfill({
      path: `${process.cwd()}/public/images/18.webp`,
      contentType: "image/webp",
    })
  )
  await page.route("**/getty/ecommerce/featured?*", (route) =>
    route.fulfill({
      json: {
        status: 200,
        success: true,
        message: "OK",
        data: {
          records: [
            {
              id: "10000000-0000-4000-8000-000000000008",
              product: id,
              productName: product.name,
              caption: "Care essentials for your practice",
              ordinal: 0,
              status: "active",
            },
            {
              id: "10000000-0000-4000-8000-000000000009",
              product: secondId,
              productName: "Digital blood pressure monitor",
              caption: "Monitor with confidence",
              ordinal: 1,
              status: "active",
            },
          ],
          nextCursor: null,
          isNext: false,
        },
      },
    })
  )
  await page.route(
    `**/getty/ecommerce/catalog/products/${secondId}?*`,
    (route) =>
      route.fulfill({
        json: {
          status: 200,
          success: true,
          message: "OK",
          data: {
            ...product,
            id: secondId,
            name: "Digital blood pressure monitor",
            price: 24500,
            priceFmt: "₦24,500.00",
            variants: [],
            detail: null,
            specifications: [],
            taxes: [],
            taxInclusive: true,
          },
        },
      })
  )
  await goto(page, "/")
  const title = await page.locator("h1").textContent()
  const featured = page.getByRole("complementary", {
    name: "Featured product",
  })
  await featured.getByRole("link", { name: /^View / }).waitFor()
  assert.equal(await page.locator("h1").textContent(), title)
  assert.equal(await featured.getByText(product.name).count(), 0)
  assert.equal(
    await featured
      .getByRole("button", { name: "Next featured product" })
      .count(),
    0
  )
  await page
    .getByRole("heading", { name: "Our Products", exact: true })
    .waitFor()
  await page
    .getByRole("heading", { name: "Recently Added", exact: true })
    .waitFor()
  await page.evaluate(() => window.scrollTo(0, 0))
  await inspect(page, "home")
})
await check("short-screen-dialog", "admin", async (page) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await goto(page, "/admin/settings")
  await page.getByRole("button", { name: /Change password/i }).click()
  const dialog = page.getByRole("dialog")
  await dialog.waitFor()
  const bounds = await dialog.boundingBox()
  assert.ok(
    bounds.y >= 0 && bounds.y + bounds.height <= 568,
    "Dialog stays inside a short viewport"
  )
  await dialog
    .getByRole("button", { name: /Change password/i })
    .scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${out}/short-screen-dialog.png` })
})
await check("store-api-error", null, async (page) => {
  await page.route("https://api.gettymedicalstores.com/**", (r) =>
    r.fulfill({
      status: 503,
      json: {
        status: 503,
        success: false,
        message: "Test service unavailable",
      },
    })
  )
  await goto(page, "/")
  await page
    .getByRole("heading", {
      name: "Medical essentials. For every day of care.",
    })
    .waitFor()
  await inspect(page, "store-error")
})
await check("catalog-detail", null, async (page) => {
  // Server-rendered catalogue reads are not intercepted by browser fixtures.
  await goto(page, "/products")
  const href = await page
    .locator('article a[aria-label^="View "]')
    .first()
    .getAttribute("href")
  assert.ok(
    href,
    "A published product is available for the read-only detail check"
  )
  await goto(page, href)
  assert.equal(
    await page.getByText("We could not find the page you requested").count(),
    0
  )
  await page.getByRole("heading", { level: 1 }).waitFor()
  await inspect(page, "catalog-detail")
})
await browser.close()
if (results.some((r) => !r.passed)) process.exitCode = 1
