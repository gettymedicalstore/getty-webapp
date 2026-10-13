// Local browser checks only; all Getty API calls are intercepted.
import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"
import assert from "node:assert/strict"
import { fixtures, id } from "./fixtures.mjs"
const require = createRequire(
  `${process.env.AUDIT_TOOLS_DIR || "/private/tmp/getty-browser-audit"}/package.json`
)
const { chromium } = require("playwright")
const { default: AxeBuilder } = require("@axe-core/playwright")
const out = "/private/tmp/getty-all-products-review"
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: "chrome", headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
})
await fixtures(context, "admin")
const calls = []
let fail = false
await context.route("https://api.gettymedicalstores.com/**", async (route) => {
  const url = new URL(route.request().url())
  const ok = (data) =>
    route.fulfill({ json: { status: 200, success: true, data } })
  if (url.pathname === "/getty/v1/tenant/vendors/options")
    return ok([{ id: "vendor-1", name: "Acacia Medical Supplies" }])
  if (url.pathname !== "/getty/v1/product/products/all") return route.fallback()
  assert.equal(route.request().method(), "GET")
  calls.push(Object.fromEntries(url.searchParams))
  if (fail)
    return route.fulfill({
      status: 500,
      json: { success: false, message: "Fixture failure" },
    })
  const next = url.searchParams.get("cursor") === "42"
  return ok({
    records:
      url.searchParams.get("search") === "absent"
        ? []
        : [
            {
              id,
              name: next ? "Disposable masks" : "Examination Gloves",
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
            },
          ],
    cursor: next ? 42 : 0,
    nextCursor: next ? 0 : 42,
    previousCursor: 0,
    isNext: !next,
    isPrevious: next,
  })
})
const page = await context.newPage(),
  errors = []
page.on("pageerror", (error) => errors.push(error.message))
const base = process.env.AUDIT_BASE_URL || "http://localhost:3000"
try {
  await page.goto(`${base}/admin/all-products`, { waitUntil: "networkidle" })
  await page.getByRole("link", { name: "View Examination Gloves" }).waitFor()
  assert.deepEqual(calls[0], { cursor: "0", navigation: "next", limit: "20" })
  assert.equal(
    await page
      .getByRole("button", { name: "Previous", exact: true })
      .isDisabled(),
    true
  )
  await page.getByRole("cell", { name: "115 available 120 total" }).waitFor()
  await page.getByText("₦8,500.00", { exact: true }).waitFor()
  assert.equal(await page.locator("s").textContent(), "₦10,000.00")
  assert.equal(
    await page
      .getByRole("link", { name: "View Examination Gloves" })
      .getAttribute("href"),
    `/admin/products/${id}`
  )
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await page.getByRole("link", { name: "View Disposable masks" }).waitFor()
  assert.equal(calls.at(-1).cursor, "42")
  assert.equal(
    await page.getByRole("button", { name: "Next", exact: true }).isDisabled(),
    true
  )
  await page.getByRole("button", { name: "Previous", exact: true }).click()
  await page.getByText("Page 1", { exact: true }).waitFor()
  assert.equal(calls.at(-1).navigation, "previous")
  assert.equal(calls.at(-1).cursor, "0")
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await page.getByRole("link", { name: "View Disposable masks" }).waitFor()
  await page
    .getByLabel("Filter by vendor", { exact: true })
    .selectOption("vendor-1")
  await page.getByText("Page 1", { exact: true }).waitFor()
  assert.equal(calls.at(-1).vendor, "vendor-1")
  assert.equal(calls.at(-1).cursor, "0")
  assert.equal(calls.at(-1).navigation, "next")
  await page.getByLabel("Filter by product status").selectOption("published")
  await page.waitForResponse((response) =>
    response.url().includes("status=published")
  )
  await page
    .getByRole("searchbox", { name: "Search all products" })
    .fill("gloves")
  await page.waitForResponse((response) =>
    response.url().includes("search=gloves")
  )
  assert.equal(calls.at(-1).vendor, "vendor-1")
  assert.equal(calls.at(-1).status, "published")
  await page.getByRole("link", { name: "View Examination Gloves" }).waitFor()
  for (const width of [320, 375, 390, 414, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.waitForTimeout(350)
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1
      ),
      `Overflow at ${width}`
    )
    await page.screenshot({ path: `${out}/all-products-${width}.png` })
  }
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze()
  assert.deepEqual(
    axe.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
    []
  )
  await page
    .getByRole("searchbox", { name: "Search all products" })
    .fill("absent")
  await page.getByText("No matching products", { exact: true }).waitFor()
  await page.getByRole("button", { name: "Clear filters" }).click()
  await page.getByRole("link", { name: "View Examination Gloves" }).waitFor()
  assert.equal(
    await page.getByLabel("Filter by vendor", { exact: true }).inputValue(),
    ""
  )
  assert.equal(
    await page.getByLabel("Filter by product status").inputValue(),
    ""
  )
  assert.equal(
    await page
      .getByRole("searchbox", { name: "Search all products" })
      .inputValue(),
    ""
  )
  fail = true
  await page
    .getByRole("searchbox", { name: "Search all products" })
    .fill("failure")
  await page
    .getByText("We couldn’t load all products", { exact: true })
    .waitFor()
  fail = false
  await page.getByRole("button", { name: "Try again", exact: true }).click()
  await page.getByRole("link", { name: "View Examination Gloves" }).waitFor()
  assert.deepEqual(errors, [])
  console.log(
    "All-products filters, pagination, empty/error states and nine-width checks passed"
  )
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png` })
  throw error
} finally {
  await context.close()
  await browser.close()
}
