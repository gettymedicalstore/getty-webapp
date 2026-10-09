import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import Module, { createRequire } from "node:module"
import { test } from "node:test"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

const require = createRequire(import.meta.url)
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

const { summarizeOrders } = require("../features/orders/utils/order-summary.ts")
const Summary =
  require("../features/orders/components/order-dashboard-summary.tsx").default
const { workspaceMenus } = require("../lib/navigation/workspace-menu.ts")

test("order summaries count payment progress and combine known order values", () => {
  assert.deepEqual(
    summarizeOrders([
      { paymentStatus: "paid", total: 200 },
      { paymentStatus: "pending", total: 100 },
      { paymentStatus: "partially-paid", total: 50 },
      { paymentStatus: "failed", total: 25 },
    ]),
    {
      count: 4,
      paid: 1,
      awaitingPayment: 2,
      failed: 1,
      value: 375,
      currency: "NGN",
    }
  )
})

test("unknown payment states and mixed currencies never produce misleading totals", () => {
  assert.equal(summarizeOrders([{ total: 10 }]).paid, null)
  assert.equal(summarizeOrders([{ paymentStatus: "paid" }]).value, null)
  assert.equal(
    summarizeOrders([
      { total: 10, currency: "NGN" },
      { total: 5, currency: "USD" },
    ]).value,
    null
  )
  assert.equal(summarizeOrders([{ total: NaN }]).value, null)
  assert.equal(summarizeOrders([]).count, 0)
})

test("order dashboard distinguishes unavailable metrics from genuine zero orders", () => {
  const render = (orders) =>
    renderToStaticMarkup(
      React.createElement(Summary, {
        workspace: "customer",
        loading: false,
        orders,
      })
    )
  const missing = render(undefined)
  assert.ok(missing.includes("Your summary will appear"))
  assert.ok(missing.includes("—"))
  assert.equal(missing.includes('role="progressbar"'), false)
  const empty = render([])
  assert.ok(empty.includes("Your next purchase starts here"))
  assert.ok(empty.includes(">0<"))
  const ready = render([
    { paymentStatus: "paid", total: 25 },
    { paymentStatus: "failed", total: 10 },
  ])
  assert.ok(ready.includes('aria-valuenow="1"'))
  assert.ok(ready.includes('aria-valuemax="2"'))
  assert.ok(ready.includes("1 order has a failed payment"))
})

test("vendor order dashboard links to vendor operations and Orders is first in navigation", () => {
  const html = renderToStaticMarkup(
    React.createElement(Summary, { workspace: "supplier", loading: false })
  )
  for (const href of [
    "/supplier/products",
    "/supplier/inventory",
    "/supplier/account",
  ])
    assert.ok(html.includes(`href="${href}"`))
  assert.equal(html.includes('href="/cart"'), false)
  assert.equal(workspaceMenus.supplier[0].href, "/supplier/orders")
  assert.equal(
    workspaceMenus.supplier.some((item) => item.label === "Dashboard"),
    false
  )
})
