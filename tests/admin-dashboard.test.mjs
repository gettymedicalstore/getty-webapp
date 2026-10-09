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

const {
  default: AdminDashboard,
  AdminDashboardOverview,
  OrderTrend,
} = require("../features/admin/components/admin-dashboard.tsx")
const { adminDashboardSchema } = require("../features/admin/api/dashboard.ts")
const data = {
  totalAccounts: 1,
  customers: 0,
  vendors: 1,
  totalProducts: 2,
  totalCategories: 24,
  pendingProductReviews: 0,
  orderTrend: Array.from({ length: 12 }, (_, index) => ({
    month:
      index < 2
        ? `25-${11 + index}`
        : `26-${String(index - 1).padStart(2, "0")}`,
    value: 0,
  })),
  recentOrdersAwaitingAttention: [],
  recentProductsAwaitingApproval: [],
}
function overview(input = data) {
  return renderToStaticMarkup(
    React.createElement(AdminDashboardOverview, { data: input })
  )
}

test("admin overview renders the provided empty dashboard without illustrative records", () => {
  const html = overview()
  for (const label of [
    "Total accounts",
    "Customers",
    "Vendors",
    "Products",
    "Categories",
    "0 pending",
    "No orders need attention",
    "You’re all caught up",
    "No orders were placed during this period.",
  ]) {
    assert.ok(html.includes(label), label)
  }
  assert.equal((html.match(/aria-pressed=/g) ?? []).length, 12)
  assert.ok(html.includes("Nov 2025: 0 orders"))
  assert.ok(html.includes("Oct 2026: 0 orders"))
  assert.ok(html.includes('href="/admin/vendors"'))
  assert.equal(html.includes("NaN"), false)
  assert.equal(html.includes("Revenue"), false)
})

test("order trend exposes accurate monthly totals and handles missing months", () => {
  const html = renderToStaticMarkup(
    React.createElement(OrderTrend, {
      records: [
        { month: "26-01", value: 112 },
        { month: "26-03", value: 14 },
      ],
    })
  )
  assert.ok(html.includes("126"))
  assert.ok(html.includes("2 months shown"))
  assert.ok(html.includes("Jan 2026: 112 orders"))
  assert.ok(html.includes("Mar 2026: 14 orders"))
  assert.equal(html.includes("Feb 2026"), false)
  const empty = overview({
    ...data,
    totalAccounts: 0,
    vendors: 0,
    orderTrend: [],
  })
  assert.ok(empty.includes("No order trend data yet"))
  assert.equal(empty.includes("NaN"), false)
})

test("dashboard schema rejects invalid counts, months and duplicate monthly buckets", () => {
  for (const invalid of [
    { totalProducts: -1 },
    { totalAccounts: "1" },
    { orderTrend: [{ month: "26-13", value: 1 }] },
    {
      orderTrend: [
        { month: "26-01", value: 1 },
        { month: "26-01", value: 2 },
      ],
    },
  ])
    assert.equal(
      adminDashboardSchema.safeParse({ ...data, ...invalid }).success,
      false
    )
})

test("admin dashboard keeps loading distinct from empty results and uses its own cache", () => {
  const client = new QueryClient()
  const render = () =>
    renderToStaticMarkup(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(AdminDashboard)
      )
    )
  client.setQueryData(["portal", "summary"], { revenue: 999 })
  assert.ok(render().includes("Loading admin dashboard"))
  client.setQueryData(["admin", "dashboard"], data)
  const html = render()
  assert.ok(html.includes("Total accounts"))
  assert.equal(html.includes("Loading admin dashboard"), false)
  client.clear()
})
