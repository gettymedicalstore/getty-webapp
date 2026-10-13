// Run against the local app. Every API mutation and storage upload is intercepted.
import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"
import assert from "node:assert/strict"
import { fixtures, id as productId } from "./fixtures.mjs"
const require = createRequire(
  `${process.env.AUDIT_TOOLS_DIR || "/private/tmp/getty-browser-audit"}/package.json`
)
const { chromium } = require("playwright")
const { default: AxeBuilder } = require("@axe-core/playwright")
const out = process.env.AUDIT_OUTPUT || "/private/tmp/getty-featured-review"
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: "chrome", headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
})
await fixtures(context, "admin")
const vendor = "10000000-0000-4000-8000-000000000004"
const advert = "10000000-0000-4000-8000-000000000005"
const photo = "10000000-0000-4000-8000-000000000006"
const entry = {
  id: advert,
  tenant: { id: vendor, name: "Getty Medical Stores" },
  product: { id: productId, name: "Adjustable examination chair" },
  photo,
  caption: "Comfort for everyday care",
  starts: "2020-01-01T09:00:00+01:00",
  ends: "2099-10-22T23:59:00+01:00",
  ordinal: 0,
  status: "active",
}
const calls = []
let storageAttempts = 0
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="400" height="240" fill="#edf6ee"/><rect x="70" y="60" width="260" height="100" rx="10" fill="#37745b"/></svg>'
await context.route("https://storage.example.test/**", async (route) => {
  calls.push({
    path: "storage",
    method: route.request().method(),
    headers: route.request().headers(),
  })
  storageAttempts++
  await route.fulfill({ status: storageAttempts === 1 ? 500 : 200, body: "" })
})
await context.route("https://api.gettymedicalstores.com/**", async (route) => {
  const request = route.request(),
    url = new URL(request.url()),
    p = url.pathname,
    method = request.method()
  if (
    !p.includes("/featured") &&
    !p.endsWith("/options") &&
    p != "/getty/v1/attachments/files"
  )
    return route.fallback()
  const body = request.postDataJSON()
  calls.push({
    path: p,
    query: url.search,
    method,
    body,
    headers: request.headers(),
  })
  const ok = (data) =>
    route.fulfill({ json: { status: 200, success: true, message: "OK", data } })
  if (p.endsWith("/photo"))
    return route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: svg,
    })
  if (p === "/getty/v1/attachments/files")
    return ok({
      file: "new-file-id",
      method: "PUT",
      url: "https://storage.example.test/advert?signature=test",
      headers: { "content-type": "image/png" },
    })
  if (p === "/getty/v1/tenant/vendors/options")
    return ok([{ id: vendor, name: "Getty Medical Stores" }])
  if (p === `/getty/v1/product/vendors/${vendor}/products/options`)
    return ok([
      {
        id: productId,
        variant: "variant-1",
        name: "Adjustable examination chair",
        variantName: "Default",
        currency: "NGN",
        price: 10000,
        salePrice: 8500,
        discount: 8500,
      },
    ])
  if (p === "/getty/ecommerce/featured")
    return ok({
      records: [
        entry,
        {
          ...entry,
          id: "another-advert",
          caption: "Supplies for your practice",
          ordinal: 1,
        },
        {
          ...entry,
          id: "expired-advert",
          caption: "EXPIRED ADVERT",
          ends: "2020-01-02T00:00:00Z",
          ordinal: 2,
        },
      ],
      isNext: false,
      nextCursor: null,
    })
  if (p === `/getty/v1/featured/${advert}`) {
    if (method === "DELETE") return route.fulfill({ status: 204 })
    return ok(entry)
  }
  if (p === "/getty/v1/featured") {
    if (method === "POST")
      return ok([
        { status: "success", message: "Featured product added successfully" },
      ])
    if (method === "PATCH") return ok("OK")
    const next = url.searchParams.get("cursor") !== "42"
    return ok({ records: [entry], isNext: next, nextCursor: next ? 42 : null })
  }
  return route.fulfill({
    status: 404,
    json: { status: 404, success: false, message: "Fixture route missing" },
  })
})
const page = await context.newPage(),
  errors = []
page.on("pageerror", (error) => errors.push(error.message))
const base = process.env.AUDIT_BASE_URL || "http://localhost:3000"
async function inspect(name) {
  for (const width of [320, 375, 390, 414, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.waitForTimeout(100)
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1
      ),
      true,
      `${name} overflow at ${width}`
    )
    await page.screenshot({ path: `${out}/${name}-${width}.png` })
  }
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze()
  assert.deepEqual(
    axe.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
    [],
    `${name} accessibility`
  )
}
try {
  await page.goto(`${base}/admin/featured`, { waitUntil: "networkidle" })
  await page
    .getByRole("cell")
    .filter({ hasText: "Comfort for everyday care" })
    .waitFor()
  await inspect("featured-management")
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await page.getByText("Page 2", { exact: true }).waitFor()
  await page.getByRole("button", { name: "Previous", exact: true }).click()
  await page.getByText("Page 1", { exact: true }).waitFor()
  assert.ok(calls.some((c) => c.query?.includes("cursor=42")))
  await page
    .getByRole("searchbox", { name: "Search featured products" })
    .fill("gloves")
  await page.waitForTimeout(450)
  assert.ok(calls.some((c) => c.query?.includes("search=gloves")))
  await page
    .getByRole("searchbox", { name: "Search featured products" })
    .fill("")
  await page
    .getByRole("button", { name: "Add featured product", exact: true })
    .click()
  await page.waitForURL("**/admin/featured/new")
  const createForm = page
    .locator("form")
    .filter({ has: page.getByLabel("Vendor", { exact: true }) })
  await createForm.getByLabel("Vendor", { exact: true }).selectOption(vendor)
  await createForm
    .getByLabel("Published product", { exact: true })
    .selectOption(productId)
  await createForm
    .getByLabel("Caption", { exact: true })
    .fill("Supplies for everyday care")
  await createForm.getByLabel("Choose advert image").setInputFiles({
    name: "advert.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5XcAAAAASUVORK5CYII=",
      "base64"
    ),
  })
  await createForm.getByText("Ready. Upload the image before saving.").waitFor()
  assert.equal(
    storageAttempts,
    0,
    "Selection only initiates; it must not send storage bytes"
  )
  await createForm
    .getByRole("button", { name: "Upload image", exact: true })
    .click()
  await createForm
    .getByText("The image could not be uploaded. Please try again.")
    .waitFor()
  assert.equal(
    calls.filter((c) => c.path === "/getty/v1/featured" && c.method === "POST")
      .length,
    0
  )
  await createForm
    .getByRole("button", { name: "Upload image", exact: true })
    .click()
  await createForm
    .getByText("Image uploaded. Save the featured product to finish.")
    .waitFor()
  assert.equal(
    calls.find((c) => c.path === "storage").headers.authorization,
    undefined
  )
  await createForm.getByLabel(/^Starts/).fill("2099-10-15T09:00")
  await createForm.getByLabel(/^Ends/).fill("2099-10-14T09:00")
  await createForm
    .getByRole("button", { name: "Create featured product", exact: true })
    .click()
  await createForm.getByText("End time must be after the start time.").waitFor()
  await createForm.getByLabel(/^Ends/).fill("2099-10-22T23:59")
  const preview = page.getByRole("complementary", {
    name: "Storefront preview",
  })
  await preview
    .getByText("Supplies for everyday care", { exact: true })
    .waitFor()
  await preview.getByText("Getty Medical Stores", { exact: true }).waitFor()
  assert.ok(
    (await preview.locator("img").getAttribute("src")).startsWith("blob:")
  )
  assert.ok(
    (
      await preview
        .getByRole("link", { name: "View product (opens in a new tab)" })
        .getAttribute("href")
    ).endsWith(productId)
  )
  await inspect("featured-form")
  await createForm
    .getByRole("button", { name: "Create featured product", exact: true })
    .click()
  await page.waitForURL("**/admin/featured")
  const created = calls.find(
    (c) => c.path === "/getty/v1/featured" && c.method === "POST"
  )
  assert.deepEqual(created.body, {
    tenant: vendor,
    product: productId,
    photo: "new-file-id",
    caption: "Supplies for everyday care",
    starts: "2099-10-15T09:00:00+01:00",
    ends: "2099-10-22T23:59:00+01:00",
    ordinal: 0,
  })
  const dialog = page.getByRole("dialog")
  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await dialog.getByLabel("Caption", { exact: true }).fill("Updated caption")
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click()
  await dialog.waitFor({ state: "hidden" })
  const updated = calls.find((c) => c.method === "PATCH")
  assert.equal(updated.body.photo, photo)
  assert.equal(updated.body.id, advert)
  assert.equal(storageAttempts, 2)
  await page.getByRole("button", { name: "Delete", exact: true }).click()
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click()
  assert.equal(calls.filter((c) => c.method === "DELETE").length, 0)
  await page.getByRole("button", { name: "Delete", exact: true }).click()
  await dialog
    .getByRole("button", { name: "Delete featured product", exact: true })
    .click()
  await dialog.waitFor({ state: "hidden" })
  assert.equal(calls.filter((c) => c.method === "DELETE").length, 1)
  await page.goto(base, { waitUntil: "networkidle" })
  const hero = page.getByRole("complementary", { name: "Featured products" })
  await hero.getByText("Comfort for everyday care").waitFor()
  assert.ok(
    (await hero.locator("img").getAttribute("src")).includes(
      `/getty/ecommerce/featured/${advert}/photo`
    )
  )
  await hero.getByRole("button", { name: "Next featured product" }).click()
  await hero.getByText("Supplies for your practice").waitFor()
  assert.equal(await page.getByText("EXPIRED ADVERT").count(), 0)
  await inspect("featured-storefront")
  assert.deepEqual(errors, [])
  await writeFile(
    `${out}/results.json`,
    JSON.stringify(
      {
        passed: true,
        widths: [320, 375, 390, 414, 768, 1024, 1280, 1440, 1920],
        checks: [
          "management",
          "create",
          "storage-failure-retry",
          "edit-retains-photo",
          "delete-confirmation",
          "cursor-pagination",
          "search",
          "schedule-validation",
          "dedicated-public-image",
          "expired-advert-hidden",
          "accessibility",
        ],
      },
      null,
      2
    )
  )
  console.log("Featured product browser checks passed")
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png` })
  throw error
} finally {
  await context.close()
  await browser.close()
}
