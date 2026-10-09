import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"
import { fixtures, id } from "./fixtures.mjs"
const require = createRequire(
  `${process.env.AUDIT_TOOLS_DIR || "/private/tmp/getty-browser-audit"}/package.json`
)
const { chromium } = require("playwright")
const { default: AxeBuilder } = require("@axe-core/playwright")
const widths = [320, 375, 390, 414, 768, 1024, 1280, 1440, 1920]
const out = process.env.AUDIT_OUTPUT || "/private/tmp/getty-review"
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: "chrome", headless: true })
const cases = [
  ...[
    "/",
    "/products",
    "/categories",
    "/search?q=chair",
    "/track-order",
    "/contact",
    "/terms",
    "/wishlist",
    "/cart",
    "/checkout",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/verify-otp",
    "/supplier/register",
    "/payment/result",
    "/not-a-real-page",
    "/categories/clinical-equipment",
    `/products/chair-${id}`,
  ].map((path) => ({ path })),
  ...[
    "/admin",
    "/admin/products",
    "/admin/categories",
    "/admin/taxes",
    "/admin/vendors",
    "/admin/customers",
    "/admin/inventory",
    "/admin/orders",
    "/admin/settings",
    ...[
      "overview",
      "details",
      "variants",
      "specifications",
      "taxes",
      "photos",
    ].map((t) => `/admin/products/${id}?tab=${t}`),
    `/admin/customers/${id}`,
    `/admin/vendors/${id}`,
  ].map((path) => ({ path, role: "admin" })),
  ...[
    "/supplier/orders",
    "/supplier/products",
    "/supplier/inventory",
    "/supplier/account",
    "/supplier/settings",
    "/supplier/registration",
    `/supplier/products/${id}`,
  ].map((path) => ({ path, role: "supplier" })),
  ...[
    "/customer",
    "/customer/orders",
    "/customer/account",
    "/customer/addresses",
    "/customer/settings",
    "/customer/payments",
    `/customer/orders/${id}`,
  ].map((path) => ({ path, role: "customer" })),
]
const report = []
for (const entry of cases.filter(
  (x) => !process.env.AUDIT_FILTER || x.path.includes(process.env.AUDIT_FILTER)
)) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  })
  await fixtures(context, entry.role)
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", (e) => errors.push(e.message))
  try {
    await page.goto(
      `${process.env.AUDIT_BASE_URL || "http://localhost:3000"}${entry.path}`,
      { waitUntil: "networkidle", timeout: 60000 }
    )
    await page.waitForTimeout(800)
    const expectedPath =
      entry.path === "/checkout"
        ? "/login"
        : entry.path === "/customer"
          ? "/customer/orders"
          : entry.path.split("?")[0]
    assert.equal(
      new URL(page.url()).pathname,
      expectedPath,
      "Unexpected route redirect"
    )
    const name = (entry.path === "/" ? "home" : entry.path).replace(
      /[^a-z0-9]/gi,
      "_"
    )
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 })
      await page.waitForTimeout(80)
      const dimensions = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: innerWidth,
        overflow: [...document.querySelectorAll("body *")]
          .filter((el) => {
            const b = el.getBoundingClientRect()
            return (
              b.width > 0 &&
              (b.right > innerWidth + 2 || b.left < -2) &&
              !el.closest("[data-nextjs-dialog],[data-nextjs-toast]")
            )
          })
          .slice(0, 10)
          .map((el) => ({
            tag: el.tagName,
            cls: String(el.className).slice(0, 200),
            text: el.textContent?.slice(0, 60),
          })),
      }))
      let violations = []
      if (width === 320 || width === 1440) {
        await page.screenshot({ path: `${out}/${name}-${width}.png` })
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
        violations = axe.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes
            .map((n) => ({ target: n.target, summary: n.failureSummary }))
            .slice(0, 10),
        }))
      }
      report.push({
        ...entry,
        width,
        actualPath: new URL(page.url()).pathname,
        overflow: dimensions.scroll > width + 1 ? dimensions : null,
        violations,
        errors: [...errors],
      })
    }
    console.log(entry.path, "done")
  } catch (error) {
    report.push({ ...entry, error: error.message })
    console.log(entry.path, error.message.slice(0, 100))
  }
  await context.close()
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2))
}
await browser.close()
console.log(
  JSON.stringify({
    checks: report.length,
    overflow: report.filter((x) => x.overflow).length,
    accessibility: report.filter((x) => x.violations?.length).length,
    errors: report.filter((x) => x.error || x.errors?.length).length,
  })
)

if (
  report.some(
    (result) =>
      result.error ||
      result.errors?.length ||
      result.overflow ||
      result.violations?.length
  )
)
  process.exitCode = 1
