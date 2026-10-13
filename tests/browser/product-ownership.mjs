import { createRequire } from "node:module"
import assert from "node:assert/strict"
import { fixtures, id } from "./fixtures.mjs"
const require = createRequire(
  `${process.env.AUDIT_TOOLS_DIR || "/private/tmp/getty-browser-audit"}/package.json`
)
const { chromium } = require("playwright")
const browser = await chromium.launch({ channel: "chrome", headless: true })
const base = process.env.AUDIT_BASE_URL || "http://localhost:3000"
try {
  for (const mode of ["own", "other", "unavailable", "supplier"]) {
    const context = await browser.newContext()
    await fixtures(context, mode === "supplier" ? "supplier" : "admin")
    const writes = [],
      checks = []
    await context.route(
      "https://api.gettymedicalstores.com/**",
      async (route) => {
        const request = route.request(),
          url = new URL(request.url())
        const ok = (data) =>
          route.fulfill({ json: { status: 200, success: true, data } })
        if (url.pathname === "/getty/v1/product/products") {
          checks.push(url.search)
          if (mode === "unavailable")
            return route.fulfill({
              status: 503,
              json: { success: false, message: "Temporarily unavailable" },
            })
          return ok({
            records: [
              {
                id: mode === "own" ? id : "another-product",
                name: "Adjustable examination chair",
              },
            ],
            nextCursor: 0,
            isNext: false,
          })
        }
        if (url.pathname === `/getty/v1/product/products/${id}/specifications`)
          return ok([
            {
              id: "spec-1",
              name: "Material",
              value: "Steel",
              unit: null,
              ordinal: 0,
            },
          ])
        if (
          url.pathname === "/getty/v1/product/products/specifications" &&
          request.method() !== "GET"
        ) {
          writes.push({
            method: request.method(),
            body: request.postDataJSON(),
          })
          return ok("OK")
        }
        return route.fallback()
      }
    )
    const page = await context.newPage()
    await page.goto(
      `${base}/${mode === "supplier" ? "supplier" : "admin"}/products/${id}?tab=specifications`
    )
    await page.getByRole("cell", { name: "Steel", exact: true }).waitFor()
    if (mode === "own" || mode === "supplier") {
      await page
        .getByRole("button", { name: "Add specification", exact: true })
        .waitFor()
      await page
        .getByRole("button", { name: "Edit Material", exact: true })
        .click()
      await page
        .getByRole("textbox", { name: "Value", exact: true })
        .fill("Stainless steel")
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click()
      await page
        .getByRole("button", { name: "Add specification", exact: true })
        .waitFor()
      assert.equal(writes.length, 1)
      assert.equal(writes[0].method, "PATCH")
      assert.equal(writes[0].body.product, id)
      assert.equal(writes[0].body.value, "Stainless steel")
      await page
        .getByRole("button", { name: "Add specification", exact: true })
        .click()
      await page
        .getByRole("textbox", { name: "Specification name", exact: true })
        .fill("Capacity")
      await page
        .getByRole("textbox", { name: "Value", exact: true })
        .fill("100")
      await page
        .getByRole("button", { name: "Add specification", exact: true })
        .click()
      await page
        .getByRole("button", { name: "Edit Material", exact: true })
        .waitFor()
      assert.equal(writes.length, 2)
      assert.equal(writes[1].method, "POST")
      if (mode === "supplier") assert.equal(checks.length, 0)
    } else {
      await page
        .getByText(
          mode === "other"
            ? "Specifications are read-only. You can manage specifications for your own products."
            : "Specifications are read-only while product ownership cannot be verified.",
          { exact: false }
        )
        .waitFor()
      assert.equal(
        await page
          .getByRole("button", { name: "Add specification", exact: true })
          .count(),
        0
      )
      assert.equal(
        await page
          .getByRole("button", { name: "Edit Material", exact: true })
          .count(),
        0
      )
      assert.equal(
        await page
          .getByRole("button", { name: "Remove Material", exact: true })
          .count(),
        0
      )
      assert.equal(writes.length, 0)
    }
    await context.close()
  }
  console.log(
    "Specification ownership checks passed: own, other vendor, failed ownership check and supplier."
  )
} finally {
  await browser.close()
}
