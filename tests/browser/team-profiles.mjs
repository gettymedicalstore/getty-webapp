import { createRequire } from "node:module"
import assert from "node:assert/strict"
import { fixtures, id } from "./fixtures.mjs"

const require = createRequire(
  `${process.env.AUDIT_TOOLS_DIR || "/private/tmp/getty-browser-audit"}/package.json`
)
const { chromium } = require("playwright")
const browser = await chromium.launch({ channel: "chrome", headless: true })
const base = process.env.AUDIT_BASE_URL || "http://localhost:3000"
const memberId = "22222222-2222-4222-8222-222222222222"
const member = {
  id: memberId,
  tenant: id,
  name: "Ada Okafor",
  email: "ada@example.test",
  phone: null,
  status: "active",
  role: "user",
  photo: null,
  phoneVerified: false,
  emailVerified: true,
  reset: true,
  cursor: 42,
}
try {
  for (const role of ["admin", "supplier", "customer"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    })
    await fixtures(context, role)
    await context.addInitScript(() => {
      const session = JSON.parse(localStorage.getItem("getty-live-session-v2"))
      session.user.profileRole = "admin"
      localStorage.setItem("getty-live-session-v2", JSON.stringify(session))
    })
    const writes = [],
      reads = []
    await context.route(
      "https://api.gettymedicalstores.com/**",
      async (route) => {
        const request = route.request(),
          url = new URL(request.url())
        const ok = (data, status = 200) =>
          route.fulfill({
            status,
            json: { status, success: true, message: "OK", data },
          })
        if (url.pathname === "/getty/v1/tenant/roles")
          return ok([
            { key: "admin", name: "Administrator" },
            { key: "user", name: "User" },
          ])
        if (url.pathname === "/getty/v1/tenant/profiles") {
          reads.push(url.search)
          return ok({
            records: [member],
            totalRecords: 25,
            next: 42,
            previous: 0,
            isNext: true,
            isPrevious: false,
          })
        }
        if (url.pathname === "/getty/v1/tenant/profile") {
          writes.push({
            method: request.method(),
            body: request.postDataJSON(),
          })
          return ok(
            request.method() === "POST" ? null : "OK",
            request.method() === "POST" ? 201 : 200
          )
        }
        return route.fallback()
      }
    )
    const page = await context.newPage()
    await page.goto(`${base}/${role}/settings`)
    await page.getByRole("heading", { name: "Organisation team" }).waitFor()
    await page.getByRole("cell", { name: /Ada Okafor/ }).waitFor()
    await page
      .getByRole("button", { name: "Add team profile", exact: true })
      .click()
    let dialog = page.getByRole("dialog")
    await dialog
      .getByRole("textbox", { name: "Full name", exact: true })
      .fill("Bola Ade")
    await dialog
      .getByRole("textbox", { name: "Email address", exact: true })
      .fill("bola@example.test")
    await dialog.getByRole("combobox", { name: "Role" }).selectOption("user")
    await dialog
      .getByRole("button", { name: "Create account", exact: true })
      .click()
    await dialog
      .getByRole("heading", { name: "Team profile created" })
      .waitFor()
    await dialog.getByRole("button", { name: "Done", exact: true }).click()
    assert.equal(writes[0].method, "POST")
    assert.equal(writes[0].body.role, "user")
    await page.getByRole("button", { name: "Edit", exact: true }).click()
    dialog = page.getByRole("dialog")
    await dialog
      .getByRole("textbox", { name: "Full name", exact: true })
      .fill("Ada Updated")
    await dialog.getByRole("combobox", { name: "Role" }).selectOption("admin")
    await dialog
      .getByRole("button", { name: "Save changes", exact: true })
      .click()
    await dialog.waitFor({ state: "hidden" })
    assert.deepEqual(writes[1], {
      method: "PUT",
      body: {
        id: memberId,
        name: "Ada Updated",
        email: "ada@example.test",
        phone: null,
        role: "admin",
      },
    })
    if (role === "admin") {
      for (const width of [320, 375, 390, 414, 768, 1024, 1280, 1440, 1920]) {
        await page.setViewportSize({ width, height: 1000 })
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth
        )
        assert.ok(overflow <= 1, `Settings overflow at ${width}: ${overflow}px`)
      }
      await page.setViewportSize({ width: 390, height: 1000 })
      await page.getByRole("button", { name: "Edit", exact: true }).click()
      await page.getByRole("dialog").waitFor()
      assert.ok(
        await page
          .getByRole("dialog")
          .evaluate((element) => element.scrollWidth <= element.clientWidth + 1)
      )
      await page.getByRole("button", { name: "Cancel", exact: true }).click()
    }
    await page.getByRole("button", { name: "Delete", exact: true }).click()
    dialog = page.getByRole("dialog")
    await dialog
      .getByRole("button", { name: "Delete profile", exact: true })
      .click()
    await dialog.waitFor({ state: "hidden" })
    assert.deepEqual(writes[2], { method: "DELETE", body: { id: memberId } })
    await page.getByRole("button", { name: "Next", exact: true }).click()
    await page.waitForTimeout(300)
    assert.ok(
      reads.some((query) => new URLSearchParams(query).get("cursor") === "42")
    )
    await context.close()
  }
  console.log(
    "Team management passed for support, vendor and customer admins; create/edit/delete, role lookup, cursor navigation and nine responsive widths."
  )
} finally {
  await browser.close()
}
