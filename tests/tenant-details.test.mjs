import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import Module, { createRequire } from "node:module"
import { test } from "node:test"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

const require = createRequire(import.meta.url)
const { QueryClient, QueryClientProvider } = require("@tanstack/react-query")
const root = process.cwd()
const resolve = Module._resolveFilename
Module._resolveFilename = function (request, ...args) {
  return resolve.call(
    this,
    request.startsWith("@/") ? path.join(root, request.slice(2)) : request,
    ...args
  )
}
for (const extension of [".ts", ".tsx"])
  require.extensions[extension] = (module, filename) =>
    module._compile(
      ts.transpileModule(readFileSync(filename, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText,
      filename
    )

let pathname = "/admin/customers/customer-id"
let search = ""
const originalLoad = Module._load
Module._load = function (request, ...args) {
  if (request === "next/navigation")
    return {
      usePathname: () => pathname,
      useSearchParams: () => new URLSearchParams(search),
    }
  return originalLoad.call(this, request, ...args)
}
const TenantWorkspace =
  require("../features/admin/components/tenant-workspace.tsx").default
Module._load = originalLoad
const {
  tenantDetailGroups,
} = require("../features/admin/utils/tenant-details.ts")
const fixture = {
  id: "customer-id",
  name: "Example Healthcare",
  type: "customer",
  status: "active",
  email: "contact@example.test",
  phone: "+2348000000000",
  country: "NG",
  timezone: "Africa/Lagos",
  address: { city: "Abuja", line1: "Example street" },
  registration: { number: "RC-123", approved: false },
  staffCount: 0,
  customInformation: { preferredLanguage: "English" },
}
function render(kind, tab, data = fixture) {
  pathname = `/admin/${kind}/${data.id}`
  search = tab ? `tab=${tab}` : ""
  const client = new QueryClient()
  client.setQueryData(["managed-tenant", data.id], data)
  const html = renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(TenantWorkspace, { tenantId: data.id, kind })
    )
  )
  client.clear()
  return html
}

test("customer and vendor pages link to their own sections", () => {
  for (const kind of ["customers", "vendors"]) {
    const html = render(kind, "overview")
    assert.ok(html.includes("Example Healthcare"))
    assert.ok(html.includes("Account overview"))
    for (const tab of ["overview", "contact", "business", "account"]) {
      assert.ok(html.includes(`href="/admin/${kind}/customer-id?tab=${tab}"`))
    }
    if (kind === "vendors") {
      assert.ok(html.includes('href="/admin/vendors/customer-id?tab=products"'))
      assert.equal(html.includes("Back to vendors"), false)
    } else {
      assert.ok(html.includes('href="/admin/customers"'))
      assert.ok(html.includes("Back to customers"))
    }
    assert.equal(html.includes("Refresh"), false)
    assert.equal(html.includes('role="dialog"'), false)
  }
})

test("vendor products tab is scoped to the vendor and is absent for customers", () => {
  const vendor = render("vendors", "products", {
    ...fixture,
    id: "vendor-id",
    name: "Gaarrri Stores",
  })
  assert.ok(vendor.includes("Vendor products"))
  assert.ok(vendor.includes("Browse products listed by Gaarrri Stores."))
  assert.ok(vendor.includes("Search vendor products"))
  assert.equal(vendor.includes("Filter by vendor"), false)
  assert.equal(vendor.includes("Back to vendors"), false)
  assert.equal(
    render("customers", "products").includes("Vendor products"),
    false
  )
})

test("contact and business tabs render nested data without object stringification", () => {
  const contact = render("customers", "contact")
  assert.ok(contact.includes("Abuja"))
  assert.ok(contact.includes("Example street"))
  assert.ok(contact.includes("contact@example.test"))
  assert.equal(contact.includes("RC-123"), false)
  const business = render("vendors", "business")
  assert.ok(business.includes("RC-123"))
  assert.ok(business.includes("No"))
  assert.equal(business.includes("[object Object]"), false)
})

test("additional account data stays visible while credential fields stay hidden", () => {
  const data = {
    ...fixture,
    accessToken: "hidden-token",
    customInformation: {
      password: "hidden-password",
      preferredLanguage: "English",
    },
  }
  const grouped = tenantDetailGroups(data)
  assert.ok(grouped.account.some(([key]) => key === "staffCount"))
  assert.equal(
    grouped.account.some(([key]) => key === "accessToken"),
    false
  )
  const html = render("customers", "account", data)
  assert.ok(html.includes("English"))
  assert.ok(html.includes(">0<"))
  assert.equal(html.includes("hidden-token"), false)
  assert.equal(html.includes("hidden-password"), false)
})

test("unrecognised tabs fall back to overview and missing business data has an empty state", () => {
  assert.ok(render("customers", "unknown").includes("Account overview"))
  assert.ok(
    render("vendors", "business", {
      id: "vendor-id",
      name: "Example Vendor",
    }).includes("No details provided yet")
  )
})
