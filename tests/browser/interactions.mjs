import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"
import assert from "node:assert/strict"
import { fixtures, id } from "./fixtures.mjs"
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
  await page
    .getByRole("button", { name: "Send verification code", exact: true })
    .click()
  assert.ok((await page.locator('[aria-invalid="true"]').count()) > 0)
  await inspect(page, "signup-errors")
})
await check("hero-carousel", null, async (page) => {
  await goto(page, "/")
  const title = await page.locator("h1").textContent()
  const featuredTitle = page
    .getByRole("complementary", { name: "Featured products" })
    .locator("h3")
  const productTitle = await featuredTitle.textContent()
  await page
    .getByRole("button", { name: "Next featured product", exact: true })
    .click()
  assert.equal(await page.locator("h1").textContent(), title)
  assert.notEqual(await featuredTitle.textContent(), productTitle)
  await page
    .getByRole("heading", { name: "Our Products", exact: true })
    .waitFor()
  await page
    .getByRole("heading", { name: "Recently Added", exact: true })
    .waitFor()
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
    .getByRole("heading", { name: "Better supplies. More room for care." })
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
