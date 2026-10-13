import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import Module, { createRequire } from "node:module"
import { test } from "node:test"
import ts from "typescript"
const require = createRequire(import.meta.url),
  root = process.cwd(),
  resolve = Module._resolveFilename
Module._resolveFilename = function (request, ...args) {
  return resolve.call(
    this,
    request.startsWith("@/") ? path.join(root, request.slice(2)) : request,
    ...args
  )
}
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename
  )
const { isOwnProduct } = require("../features/admin/api/product-ownership.ts")
const portal = require("../features/admin/api/portal.ts")
test("ownership matches the exact product ID in the authenticated own-products list", async () => {
  const original = portal.portalRecords
  const calls = []
  portal.portalRecords = async (...args) => {
    calls.push(args)
    return { records: [{ id: "other", name: "Gloves" }], nextCursor: null }
  }
  try {
    assert.equal(await isOwnProduct("owned", "Gloves"), false)
    portal.portalRecords = async (...args) => {
      calls.push(args)
      return { records: [{ id: "owned", name: "Gloves" }], nextCursor: null }
    }
    assert.equal(await isOwnProduct("owned", "Gloves"), true)
    assert.equal(calls[0][0], "products")
    assert.deepEqual(Object.fromEntries(new URLSearchParams(calls[0][1])), {
      search: "Gloves",
      cursor: "0",
      navigation: "next",
      limit: "50",
    })
  } finally {
    portal.portalRecords = original
  }
})
test("ownership checks later pages and rejects failed or cyclic responses", async () => {
  const original = portal.portalRecords
  const calls = []
  portal.portalRecords = async (section, query) => {
    calls.push(query)
    return new URLSearchParams(query).get("cursor") === "0"
      ? { records: [], nextCursor: "42" }
      : { records: [{ id: "owned" }], nextCursor: null }
  }
  try {
    assert.equal(await isOwnProduct("owned", "Gloves & masks"), true)
    assert.equal(calls.length, 2)
    portal.portalRecords = async () => {
      throw new Error("Access denied")
    }
    await assert.rejects(() => isOwnProduct("owned", "Gloves"), /Access denied/)
    portal.portalRecords = async () => ({ records: [], nextCursor: "0" })
    await assert.rejects(
      () => isOwnProduct("owned", "Gloves"),
      /verify product ownership/
    )
  } finally {
    portal.portalRecords = original
  }
})
