import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import Module, { createRequire } from "node:module"
import { test } from "node:test"
import ts from "typescript"
const require = createRequire(import.meta.url),
  root = process.cwd()
const resolve = Module._resolveFilename
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
const load = (relative) => require(path.join(root, relative))
const { apiRequest, GettyApiError, gettyClient } = load("lib/api/client.ts")
const { gettyAuthClient } = load("lib/api/transport.ts")
const { gettyUrl } = load("lib/api/config.ts")
const session = load("features/auth/api/session-store.ts")
const { login, logout } = load("features/auth/api/auth.ts")
const { confirmPasswordChange } = load("features/auth/api/change-password.ts")
const { requestPasswordResetOtp, verifyPasswordResetOtp, resetPassword } = load(
  "features/auth/api/password-reset.ts"
)
const { backendRole } = load("features/auth/server/backend-role.ts")
const {
  getLiveCategories,
  getLiveProducts,
  getLiveProduct,
  getProductThumbnail,
} = load("features/products/api/live-catalog.ts")
const { liveCart, canUseBuyerCart } = load("features/cart/api/live-cart.ts")
const { DEVICE_CART_KEY, deviceCart, readDeviceItems, loadBuyerCart } = load(
  "features/cart/api/device-cart.ts"
)
const { confirmSignup, beginSignup } = load("features/auth/api/onboarding.ts")
const { signupPhoneDetails, signupCountries } = load("lib/signup-phone.ts")
const { safeReturnPath, authHref, checkoutHref, postLoginPath, accountHome } =
  load("lib/auth/navigation.ts")
const schemas = load("lib/api/getty-contract.ts")
const { inventoryRequest } = load("features/inventory/api/inventory.ts")
const { portalRecords, portalProduct, portalTenant, changePortalRecord } = load(
  "features/admin/api/portal.ts"
)
const { getAdminDashboard } = load("features/admin/api/dashboard.ts")
const { createTenantAccount } = load("features/admin/api/accounts.ts")
const {
  getManagedProduct,
  getProductResource,
  saveProductResource,
  deleteProductResource,
  saveProductOverview,
  submitManagedProductForReview,
  approveManagedProduct,
} = load("features/admin/api/product-management.ts")
const {
  createProductPhotoUpload,
  attachProductPhotos,
  getProductPhotoPage,
  productPhotoUploadTarget,
  prepareProductImageUpload,
  uploadProductImage,
  uploadProductImages,
} = load("features/admin/api/product-photos.ts")
const { buildCategoryTree, filterCategoryTree, categoryRows } = load(
  "features/admin/utils/category-tree.ts"
)
const fixtureUser = {
  id: "fixture-buyer",
  name: "Fixture Buyer",
  email: "buyer@example.test",
  role: "customer",
}
const storage = new Map()
const tabStorage = new Map()
const storageListeners = new Set()
const storageApi = (values) => ({
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
})
globalThis.window = {
  localStorage: storageApi(storage),
  sessionStorage: storageApi(tabStorage),
  addEventListener: (type, listener) => {
    if (type === "storage") storageListeners.add(listener)
  },
}
function storageEvent(key = session.SESSION_STORAGE_KEY) {
  for (const listener of storageListeners)
    listener({ key, storageArea: window.localStorage })
}
function reloadSessionStore(t) {
  const filename = require.resolve(
    path.join(root, "features/auth/api/session-store.ts")
  )
  const original = require.cache[filename]
  const originalListeners = new Set(storageListeners)
  delete require.cache[filename]
  const restored = require(filename)
  t.after(() => {
    require.cache[filename] = original
    for (const listener of storageListeners) {
      if (!originalListeners.has(listener)) storageListeners.delete(listener)
    }
  })
  return restored
}
function mock(t, handler) {
  const clients = [gettyClient, gettyAuthClient]
  const previous = clients.map((client) => client.defaults.adapter)
  session.clearSession()
  // Exercise the real Axios interceptors and serialization, replacing only I/O.
  const adapter = async (config) => {
    const response = await handler(new URL(config.url), {
      method: config.method === "get" ? undefined : config.method.toUpperCase(),
      headers: new Headers(config.headers.toJSON()),
      body: config.data,
      credentials: config.withCredentials ? "include" : "omit",
      signal: config.signal,
    })
    return {
      config,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      data: await response.text(),
    }
  }
  clients.forEach((client) => {
    client.defaults.adapter = adapter
  })
  t.after(() => {
    clients.forEach((client, index) => {
      client.defaults.adapter = previous[index]
    })
    session.clearSession()
    storage.clear()
    tabStorage.clear()
  })
}

const ids = [
  "10000000-0000-4000-8000-000000000001",
  "10000000-0000-4000-8000-000000000002",
  "10000000-0000-4000-8000-000000000003",
  "10000000-0000-4000-8000-000000000004",
]
const envelope = (data, status = 200) => ({
  status,
  success: true,
  message: "OK",
  data,
})
const baseProduct = {
  id: ids[0],
  name: "Sterile gloves",
  brand: null,
  description: null,
  seller: "Fixture vendor",
  category: { id: ids[1], name: "Consumables" },
  subcategory: null,
  currency: "NGN",
  price: 100,
  priceFmt: "NGN 100",
  inStock: true,
  rating: { average: null, count: 0 },
  links: { self: "unused", photos: "unused", ratings: "unused" },
}
const line = {
  id: ids[3],
  seller: ids[3],
  product: ids[0],
  variant: ids[2],
  name: "Gloves",
  sku: "G100",
  options: { size: "M" },
  unit: "box",
  pack: 100,
  quantity: 3,
  currency: "NGN",
  price: 100,
  subtotal: 300,
  minimum: 2,
  available: 20,
  purchasable: true,
}
const cart = {
  id: ids[3],
  currency: "NGN",
  status: "active",
  expires: null,
  modified: null,
  version: 1,
  expired: false,
  items: [line],
  subtotal: 300,
}

test("live requests use the corrected origin and reject application proxy paths", () => {
  assert.equal(
    gettyUrl("/auth/getty/login"),
    "https://api.gettymedicalstores.com/auth/getty/login"
  )
  for (const invalid of [
    "/api/auth/login",
    "http://localhost:3000/api/cart",
    "//evil.example/getty/x",
    "https://evil.example/getty/x",
    "/getty/../api/cart",
  ])
    assert.throws(() => gettyUrl(invalid))
  assert.equal(existsSync(path.join(root, "app/api")), false)
})
test("login persists its profile and token pair without storing the password", async (t) => {
  mock(t, (url, options) => {
    assert.equal(
      url.href,
      "https://api.gettymedicalstores.com/auth/getty/login"
    )
    assert.equal(options.method, "POST")
    assert.equal(options.credentials, "include")
    assert.equal(options.headers.has("Authorization"), false)
    assert.deepEqual(JSON.parse(options.body), {
      email: "buyer@example.test",
      password: "FixturePassword1!",
    })
    return Response.json({
      ...envelope({
        id: ids[0],
        name: "Fixture Buyer",
        email: "buyer@example.test",
        type: "consumer",
        role: "admin",
      }),
      tokens: {
        accessToken: "fixture-access",
        refreshToken: "fixture-refresh",
        fingerprint: "fixture-fingerprint",
      },
    })
  })
  const result = await login(" Buyer@Example.Test ", "FixturePassword1!")
  assert.equal(result.user.role, "customer")
  assert.equal(session.accessToken(), "fixture-access")
  assert.equal(
    [...storage.values()].join("").includes("FixturePassword1!"),
    false
  )
  assert.equal(session.readSession().refreshToken, "fixture-refresh")
  assert.equal(session.readSession().fingerprint, "fixture-fingerprint")
  assert.equal(tabStorage.size, 0)
})
test("tenant administrator profiles cannot promote themselves into Getty staff", () => {
  assert.equal(backendRole("consumer", "admin"), "customer")
  assert.equal(backendRole("vendor", "admin"), "supplier")
  assert.equal(backendRole("support", "superadmin"), "admin")
  assert.equal(backendRole(undefined, "admin"), "customer")
  assert.equal(backendRole(" Support ", " ADMIN "), "admin")
})
test("the login response without an ID routes support administrators to their dashboard", async (t) => {
  const opaqueToken =
    "fixture-protected..fixture-iv.fixture-ciphertext.fixture-tag"
  const events = []
  mock(t, (url, options) => {
    if (url.pathname.endsWith("/logout")) {
      assert.equal(
        options.headers.get("Authorization"),
        `Bearer ${opaqueToken}`
      )
      return new Response(null, { status: 204 })
    }
    return Response.json({
      ...envelope({
        name: "Fixture Operations",
        email: "ops@example.test",
        phone: "08000000000",
        role: "admin",
        tenant: "Fixture Medical Organisation",
        type: "support",
        status: "active",
        media: null,
        tenantStatus: "verified",
        resetPassword: false,
      }),
      tokens: {
        fingerprint: "fixture-fingerprint",
        accessToken: opaqueToken,
        refreshToken: "fixture-refresh",
      },
    })
  })
  const unsubscribe = session.subscribeSession(() =>
    events.push(session.readSession().user?.role ?? null)
  )
  t.after(unsubscribe)
  const { user } = await login("ops@example.test", "FixturePassword1!")
  assert.equal(user.id, "ops@example.test")
  assert.equal(user.role, "admin")
  assert.equal(user.profileRole, "admin")
  assert.equal(user.tenantType, "support")
  assert.equal(user.tenant, "Fixture Medical Organisation")
  assert.equal(user.status, "active")
  assert.equal(user.tenantStatus, "verified")
  assert.equal(user.resetPassword, false)
  assert.equal(session.accessToken(), opaqueToken)
  assert.equal(postLoginPath(user.role, "/products"), "/admin")

  // A new tab has no tab storage but restores the same durable login.
  tabStorage.clear()
  const restored = reloadSessionStore(t)
  assert.deepEqual(restored.readSession().user, user)
  assert.equal(restored.accessToken(), opaqueToken)
  assert.equal(restored.readSession().refreshToken, "fixture-refresh")
  assert.equal(restored.readSession().fingerprint, "fixture-fingerprint")
  await logout()
  assert.deepEqual(events, ["admin", null])
  unsubscribe()
})
test("login honours tenant roles for supplier and customer dashboards", async (t) => {
  let tenant = "vendor"
  mock(t, () =>
    Response.json({
      ...envelope({
        name: "Fixture Account",
        email: "account@example.test",
        role: "admin",
        type: tenant,
        media: null,
      }),
      tokens: { accessToken: "fixture-access" },
    })
  )
  const vendor = await login("account@example.test", "FixturePassword1!")
  assert.equal(vendor.user.role, "supplier")
  assert.equal(postLoginPath(vendor.user.role), "/supplier")
  tenant = "consumer"
  const customer = await login("account@example.test", "FixturePassword1!")
  assert.equal(customer.user.role, "customer")
  assert.equal(postLoginPath(customer.user.role), "/customer")
})
test("incomplete account roles cannot establish a login session", async (t) => {
  mock(t, () =>
    Response.json({
      ...envelope({ name: "Fixture Account", email: "account@example.test" }),
      tokens: { accessToken: "fixture-access" },
    })
  )
  await assert.rejects(
    login("account@example.test", "FixturePassword1!"),
    (error) => error.status === 502
  )
  assert.equal(session.readSession().user, null)
})
test("post-login navigation stays in the correct workspace and preserves customer shopping", () => {
  for (const role of ["admin", "supplier", "customer"]) {
    const home = accountHome(role)
    assert.equal(postLoginPath(role), home)
    assert.equal(
      postLoginPath(role, `${home}/orders?status=pending`),
      `${home}/orders?status=pending`
    )
    for (const other of ["/admin", "/supplier", "/customer"].filter(
      (path) => path !== home
    )) {
      assert.equal(postLoginPath(role, `${other}/orders`), home)
      assert.equal(
        postLoginPath(
          role,
          `/%${other.charCodeAt(1).toString(16)}${other.slice(2)}/orders`
        ),
        home
      )
    }
    for (const invalid of [
      "https://outside.example",
      "//outside.example",
      "/login",
      "/api/auth/logout",
    ]) {
      assert.equal(postLoginPath(role, invalid), home)
    }
  }
  assert.equal(postLoginPath("admin", "/"), "/admin")
  assert.equal(postLoginPath("supplier", "/products"), "/supplier")
  assert.equal(
    postLoginPath("customer", "/checkout?installments=6"),
    "/checkout?installments=6"
  )
  assert.equal(
    postLoginPath("customer", "/products/sterile-gloves"),
    "/products/sterile-gloves"
  )
})
test("authenticated calls require a session and rejected cookie renewal does not erase it", async (t) => {
  let calls = 0
  mock(t, (url, options) => {
    calls++
    assert.equal(
      options.headers.get("Authorization"),
      url.pathname === "/auth/getty/refresh" ? null : "Bearer fixture-access"
    )
    return Response.json({ message: "Expired" }, { status: 401 })
  })
  await assert.rejects(
    apiRequest("/getty/v1/order/cart"),
    (e) => e.status === 401
  )
  assert.equal(calls, 0)
  session.saveSession(fixtureUser, "fixture-access")
  await assert.rejects(
    apiRequest("/getty/v1/order/cart"),
    (e) => e.status === 401
  )
  assert.equal(calls, 2)
  assert.equal(session.readSession().user.id, fixtureUser.id)
})
test("password change submits only current and new passwords without verification", async (t) => {
  const calls = []
  const input = {
    currentPassword: " current password ",
    newPassword: " new password ",
  }
  mock(t, (url, options) => {
    calls.push({ url, options })
    assert.equal(options.headers.get("Authorization"), "Bearer fixture-access")
    assert.equal(url.pathname, "/getty/v1/tenant/password/change")
    assert.equal(options.method, "PATCH")
    assert.deepEqual(JSON.parse(options.body), input)
    return Response.json(envelope(null))
  })
  await assert.rejects(confirmPasswordChange(input), (e) => e.status === 401)
  session.saveSession(fixtureUser, "fixture-access")
  await confirmPasswordChange({
    ...input,
    reference: ids[0],
    otp: "001234",
    confirmation: input.newPassword,
  })
  assert.equal(calls.length, 1)
  assert.equal(session.readSession().user.id, fixtureUser.id)
})

test("password changes validate before sending and preserve backend errors", async (t) => {
  let calls = 0
  mock(t, () => {
    calls++
    return Response.json(
      {
        status: 400,
        success: false,
        message: "Current password is incorrect.",
      },
      { status: 400 }
    )
  })
  session.saveSession(fixtureUser, "fixture-access")
  for (const input of [
    { currentPassword: "", newPassword: "NewPassword123!" },
    { currentPassword: "OldPassword123!", newPassword: "short" },
  ]) {
    await assert.rejects(confirmPasswordChange(input), (e) => e.status === 400)
  }
  assert.equal(calls, 0)
  await assert.rejects(
    confirmPasswordChange({
      currentPassword: "OldPassword123!",
      newPassword: "NewPassword123!",
    }),
    (e) => e.status === 400 && e.message === "Current password is incorrect."
  )
  assert.equal(calls, 1)
  assert.equal(session.readSession().user.id, fixtureUser.id)
})

test("public reads do not refresh or send credentials when an account is signed in", async (t) => {
  let calls = 0
  mock(t, (url, options) => {
    calls++
    assert.equal(url.pathname, "/getty/ecommerce/catalog/categories")
    assert.equal(options.headers.has("Authorization"), false)
    assert.equal(options.credentials, "omit")
    return Response.json(
      { status: 401, success: false, message: "Unavailable" },
      { status: 401 }
    )
  })
  session.saveSession(fixtureUser, "fixture-access")
  await assert.rejects(getLiveCategories(), (e) => e.status === 401)
  assert.equal(calls, 1)
  assert.equal(session.readSession().user.id, fixtureUser.id)
})

test("public catalog omits credentials and forwards filters without invented inventory counts", async (t) => {
  let seen
  mock(t, (url, options) => {
    assert.equal(options.headers.has("Authorization"), false)
    assert.equal(options.credentials, "omit")
    assert.equal(url.origin, "https://api.gettymedicalstores.com")
    if (url.pathname.endsWith("/categories"))
      return Response.json(
        envelope([
          {
            id: ids[1],
            name: "Consumables",
            description: null,
            subcategories: [],
          },
        ])
      )
    seen = url
    return Response.json(
      envelope({
        records: [baseProduct],
        cursor: 9,
        nextCursor: 7,
        previousCursor: 11,
        isNext: true,
        isPrevious: true,
      })
    )
  })
  session.saveSession(fixtureUser, "fixture-access")
  const result = await getLiveProducts({
    category: ids[1],
    cursor: 9,
    navigation: "previous",
    minimumPrice: 50,
    maximumPrice: 200,
    availability: "in-stock",
  })
  assert.equal(seen.pathname, "/getty/ecommerce/catalog/products")
  assert.equal(seen.searchParams.get("minPrice"), "50")
  assert.equal(seen.searchParams.get("showAll"), "false")
  assert.equal(seen.searchParams.get("navigation"), "previous")
  assert.equal(result.pagination.mode, "cursor")
  assert.equal(result.items[0].stockKnown, false)
  assert.equal((await getLiveCategories())[0].countKnown, false)
  await assert.rejects(
    getLiveProducts({ cursor: Number.MAX_SAFE_INTEGER + 1 }),
    (e) => e.status === 400
  )
})
test("product card thumbnails load the first public photo without account credentials", async (t) => {
  mock(t, (url, options) => {
    assert.equal(
      url.pathname,
      `/getty/ecommerce/catalog/products/${ids[0]}/photos`
    )
    assert.equal(url.searchParams.get("limit"), "1")
    assert.equal(url.searchParams.get("showAll"), "false")
    assert.equal(options.headers.has("Authorization"), false)
    assert.equal(options.credentials, "omit")
    return Response.json(
      envelope({
        records: [
          { id: ids[3], name: "Gloves", mime: "image/png", url: "/temporary" },
        ],
        nextCursor: null,
        limit: 1,
      })
    )
  })
  session.saveSession(fixtureUser, "fixture-access")
  assert.equal(
    await getProductThumbnail(ids[0]),
    gettyUrl(`/getty/ecommerce/catalog/products/${ids[0]}/photos/${ids[3]}/src?showAll=false`)
  )
})
test("products without uploaded photos have no thumbnail", async (t) => {
  mock(t, () =>
    Response.json(envelope({ records: [], nextCursor: null, limit: 1 }))
  )
  assert.equal(await getProductThumbnail(ids[0]), null)
})
test("product details retain variants and use stable live image redirects", async (t) => {
  const variant = {
    id: ids[2],
    name: "Medium",
    sku: "G100",
    options: { size: "M" },
    isDefault: true,
    price: 100,
    priceFmt: "NGN 100",
    saleUnit: "box",
    unitsPerPack: 100,
    minimumOrderQuantity: 2,
    inStock: true,
  }
  mock(t, (url, options) => {
    assert.equal(options.headers.has("Authorization"), false)
    assert.equal(url.searchParams.get("showAll"), "false")
    if (url.pathname.endsWith("/photos"))
      return Response.json(
        envelope({
          records: [
            {
              id: ids[3],
              name: "Gloves",
              mime: "image/png",
              url: "/temporary",
            },
          ],
          nextCursor: null,
          limit: 100,
        })
      )
    return Response.json(
      envelope({
        ...baseProduct,
        detail: null,
        specifications: [],
        variants: [variant],
        taxes: [],
        taxInclusive: true,
      })
    )
  })
  const product = await getLiveProduct(`sterile-gloves-${ids[0]}`)
  assert.equal(product.variants[0].id, ids[2])
  assert.equal(product.variants[0].minimumOrderQuantity, 2)
  assert.equal(
    product.image,
    `https://api.gettymedicalstores.com/getty/ecommerce/catalog/products/${ids[0]}/photos/${ids[3]}/src?showAll=false`
  )
  assert.equal(await getLiveProduct("invalid-product-slug"), null)
})
test("live Getty GUIDs are accepted without requiring RFC UUID version bits", async (t) => {
  const categoryId = "f364b9f3-8c98-c7b0-f678-35b50036512b"
  const variantId = "5aa605ec-1fd8-afe2-2010-3ee5a991f1b0"
  mock(t, (url) => {
    if (url.pathname.endsWith("/categories"))
      return Response.json(
        envelope([
          {
            id: categoryId,
            name: "Dental Equipment",
            description: null,
            subcategories: [],
          },
        ])
      )
    assert.equal(url.pathname, `/getty/v1/order/cart/items/${variantId}`)
    return Response.json(
      envelope({ ...cart, items: [{ ...line, variant: variantId }] })
    )
  })
  assert.equal((await getLiveCategories())[0].id, categoryId)
  session.saveSession(fixtureUser, "fixture-access")
  assert.equal(
    (await liveCart("PUT", variantId, { quantity: 3 })).items[0].variantId,
    variantId
  )
  assert.equal(schemas.GettyIdSchema.safeParse("../invalid-id").success, false)
})
test("cart updates send final pack quantities directly and keep unavailable lines", async (t) => {
  const calls = []
  mock(t, (url, options) => {
    calls.push({ url, options })
    return Response.json(envelope(cart))
  })
  session.saveSession(fixtureUser, "fixture-access")
  const result = await liveCart("PUT", ids[2], { quantity: 3 })
  assert.equal(calls[0].url.pathname, `/getty/v1/order/cart/items/${ids[2]}`)
  assert.equal(
    calls[0].options.headers.get("Authorization"),
    "Bearer fixture-access"
  )
  assert.deepEqual(JSON.parse(calls[0].options.body), { quantity: 3 })
  assert.equal(result.mode, "remote")
  assert.equal(result.items[0].minimum, 2)
  await assert.rejects(
    liveCart("PUT", ids[2], { quantity: 1.5 }),
    (e) => e.status === 400
  )
  await liveCart("DELETE", ids[2])
  assert.equal(calls[1].options.method, "DELETE")
})
test("signup confirmation keeps leading-zero codes and anonymous requests omit tokens", async (t) => {
  mock(t, (url, options) => {
    assert.equal(url.pathname, "/getty/ecommerce/onboarding/v1/confirm")
    assert.equal(options.headers.has("Authorization"), false)
    assert.equal(JSON.parse(options.body).otp, "001234")
    return Response.json(envelope({ tenant: ids[0], status: "onboarded" }))
  })
  session.saveSession(fixtureUser, "fixture-access")
  const body = schemas.ConsumerConfirmationInputSchema.parse({
    reference: ids[3],
    otp: "001234",
  })
  assert.equal((await confirmSignup(body)).status, "onboarded")
})
test("signup extracts the selected phone country and follows the customer onboarding contract", async (t) => {
  assert.ok(signupCountries.length > 200)
  assert.equal(signupCountries[0].code, "NG")
  assert.deepEqual(signupPhoneDetails("0814 244 5807", "NG"), {
    phone: "+2348142445807",
    country: "NG",
  })
  assert.deepEqual(signupPhoneDetails("+44 (7400) 123456", "GB"), {
    phone: "+447400123456",
    country: "GB",
  })
  assert.throws(() => signupPhoneDetails("+44 7700 900123", "NG"))
  mock(t, (url, options) => {
    assert.equal(url.pathname, "/getty/ecommerce/onboarding/v1")
    assert.equal(options.method, "POST")
    assert.equal(options.headers.has("Authorization"), false)
    assert.deepEqual(JSON.parse(options.body), {
      name: "Acacia Consumer Account",
      email: "ada@example.com",
      phone: "+2348142445807",
      address: "12 Example Street, Abuja",
      country: "NG",
      contact: "Ada Okafor",
    })
    return Response.json(
      {
        status: 201,
        success: true,
        message: "Check your email for the verification code.",
        data: {
          reference: ids[0],
          codeExpiresAt: "2026-10-06T22:15:00Z",
          expiresAt: "2026-10-07T04:00:00Z",
        },
      },
      { status: 201 }
    )
  })
  assert.equal(
    (
      await beginSignup({
        name: "Acacia Consumer Account",
        email: "ada@example.com",
        ...signupPhoneDetails("0814 244 5807", "NG"),
        address: "12 Example Street, Abuja",
        contact: "Ada Okafor",
      })
    ).reference,
    ids[0]
  )
})
test("signup rejects an incomplete response instead of reporting completion", async (t) => {
  mock(t, () => Response.json(envelope({ reference: ids[0] })))
  await assert.rejects(
    beginSignup({
      name: "Fixture Clinic",
      contact: "Fixture Buyer",
      email: "buyer@example.test",
      phone: "08000000000",
      address: "Fixture address",
      country: "NG",
    }),
    (e) => e.status === 502
  )
})
test("inventory adjustments use the live endpoint and preserve retry IDs", async (t) => {
  const body = {
    request: ids[0],
    product: ids[1],
    variant: ids[2],
    type: "receipt",
    quantity: 5,
  }
  const calls = []
  mock(t, (url, options) => {
    calls.push(JSON.parse(options.body))
    assert.equal(url.pathname, "/getty/v1/inventory/stocks")
    return Response.json(envelope("OK"))
  })
  session.saveSession(fixtureUser, "fixture-access")
  const validated = schemas.StockInputSchema.parse(body)
  await inventoryRequest("/getty/v1/inventory/stocks", {
    method: "POST",
    body: JSON.stringify(validated),
  })
  await inventoryRequest("/getty/v1/inventory/stocks", {
    method: "POST",
    body: JSON.stringify(validated),
  })
  assert.equal(calls[0].request, calls[1].request)
  assert.equal(
    schemas.StockInputSchema.safeParse({ ...body, quantity: 1.5 }).success,
    false
  )
  assert.equal(
    schemas.StockInputSchema.safeParse({
      ...body,
      quantity: Number.MAX_SAFE_INTEGER + 1,
    }).success,
    false
  )
  assert.equal(
    schemas.CartItemInputSchema.safeParse({ quantity: 0 }).success,
    false
  )
})
test("API errors keep onboarding decisions and do not manufacture success", async (t) => {
  mock(t, () =>
    Response.json(
      {
        success: false,
        message: "Review required",
        data: { decision: "REVIEW", message: "A similar account name exists." },
      },
      { status: 409 }
    )
  )
  await assert.rejects(
    apiRequest(
      "/getty/ecommerce/onboarding/v1",
      { method: "POST", body: "{}" },
      "public"
    ),
    (e) =>
      e instanceof GettyApiError &&
      e.status === 409 &&
      e.message === "A similar account name exists."
  )
})
test("network failure never falls back to demo data", async (t) => {
  mock(t, () => {
    throw new TypeError("network error")
  })
  await assert.rejects(getLiveCategories(), (e) => e.status === 503)
})
test("sign-out clears the local bearer session even if server revocation fails", async (t) => {
  mock(t, () => Response.json({ message: "Unavailable" }, { status: 503 }))
  session.saveSession(fixtureUser, "fixture-access")
  await assert.rejects(logout())
  assert.equal(session.accessToken(), null)
})
test("authentication preserves checkout destinations and rejects redirect loops", () => {
  const destination = checkoutHref("monthly", "6")
  assert.equal(
    new URL(
      authHref("/login", destination),
      "https://store.example"
    ).searchParams.get("redirect"),
    destination
  )
  for (const invalid of [
    undefined,
    ["/cart"],
    "//evil.example",
    "/\\evil.example",
    "/%2f%2fevil.example",
    "/login?redirect=/login",
    "/x/../register",
    "/%6cogin",
    "/api/auth/logout",
  ])
    assert.equal(safeReturnPath(invalid), null)
  assert.equal(
    safeReturnPath("/products?search=first%20aid"),
    "/products?search=first%20aid"
  )
})

test("an expired-looking access token remains available for server-led renewal after reload", (t) => {
  mock(t, () => {
    throw new Error("No network request expected")
  })
  const expiredToken = `fixture.${Buffer.from(JSON.stringify({ exp: 1 })).toString("base64url")}.fixture`
  session.saveSession(fixtureUser, {
    accessToken: expiredToken,
    refreshToken: "fixture-refresh",
    fingerprint: "fixture-fingerprint",
  })
  const restored = reloadSessionStore(t)
  assert.equal(restored.accessToken(), expiredToken)
  assert.equal(restored.readSession().refreshToken, "fixture-refresh")
  assert.equal(
    restored.readSession().sessionId,
    session.readSession().sessionId
  )
})

test("legacy tab logins migrate once and a durable sign-out prevents their resurrection", (t) => {
  mock(t, () => {
    throw new Error("No network request expected")
  })
  storage.clear()
  const legacy = JSON.stringify({
    origin: "https://api.gettymedicalstores.com",
    user: fixtureUser,
    accessToken: "fixture-legacy-access",
  })
  tabStorage.set("getty-live-session-v1", legacy)
  const migrated = reloadSessionStore(t)
  assert.equal(migrated.accessToken(), "fixture-legacy-access")
  assert.equal(migrated.readSession().user.role, "customer")
  assert.equal(migrated.readSession().refreshToken, null)
  assert.equal(tabStorage.has("getty-live-session-v1"), false)
  assert.ok(storage.has(session.SESSION_STORAGE_KEY))
  migrated.clearSession()
  tabStorage.set("getty-live-session-v1", legacy)
  const signedOut = reloadSessionStore(t)
  assert.equal(signedOut.accessToken(), null)
  assert.equal(signedOut.readSession().user, null)
})

test("persistent sessions from another API origin or malformed storage are ignored", (t) => {
  mock(t, () => {
    throw new Error("No network request expected")
  })
  session.saveSession(fixtureUser, "fixture-access")
  const record = JSON.parse(storage.get(session.SESSION_STORAGE_KEY))
  storage.set(
    session.SESSION_STORAGE_KEY,
    JSON.stringify({ ...record, origin: "https://outside.example" })
  )
  assert.equal(session.syncSession().user, null)
  storage.set(session.SESSION_STORAGE_KEY, "invalid-json")
  assert.equal(session.syncSession().accessToken, null)
})

test("token rotation retains the account and older renewals cannot overwrite a later login", (t) => {
  mock(t, () => {
    throw new Error("No network request expected")
  })
  session.saveSession(fixtureUser, {
    accessToken: "fixture-access",
    refreshToken: "fixture-refresh",
    fingerprint: "fixture-fingerprint",
  })
  const original = session.readSession()
  assert.equal(
    session.updateSessionTokens(original, {
      accessToken: "fixture-new-access",
      refreshToken: "fixture-new-refresh",
    }),
    true
  )
  assert.equal(session.readSession().sessionId, original.sessionId)
  assert.equal(session.readSession().fingerprint, "fixture-fingerprint")
  assert.equal(
    session.updateSessionTokens(original, {
      accessToken: "fixture-stale-access",
    }),
    false
  )
  assert.equal(session.clearSession(original), false)
  const rotated = session.readSession()
  session.saveSession(
    { ...fixtureUser, id: "another-buyer" },
    "fixture-other-access"
  )
  assert.equal(
    session.updateSessionTokens(rotated, {
      accessToken: "fixture-stale-access",
    }),
    false
  )
  assert.equal(session.clearSession(rotated), false)
  assert.equal(session.readSession().user.id, "another-buyer")
  session.clearSession()
  assert.equal(
    session.updateSessionTokens(rotated, {
      accessToken: "fixture-stale-access",
    }),
    false
  )
  assert.equal(session.readSession().accessToken, null)
})

test("another tab's login, token rotation and logout update this tab's session", (t) => {
  mock(t, () => {
    throw new Error("No network request expected")
  })
  session.readSession()
  session.saveSession(fixtureUser, {
    accessToken: "fixture-access",
    refreshToken: "fixture-refresh",
  })
  const first = JSON.parse(storage.get(session.SESSION_STORAGE_KEY))
  const changes = []
  const unsubscribe = session.subscribeSession(() =>
    changes.push(session.readSession().accessToken)
  )
  t.after(unsubscribe)
  storage.set(
    session.SESSION_STORAGE_KEY,
    JSON.stringify({
      ...first,
      accessToken: "fixture-rotated",
      refreshToken: "fixture-rotated-refresh",
    })
  )
  storageEvent()
  assert.equal(session.readSession().refreshToken, "fixture-rotated-refresh")
  assert.equal(session.readSession().sessionId, first.sessionId)
  storage.set(
    session.SESSION_STORAGE_KEY,
    JSON.stringify({
      ...first,
      sessionId: "fixture-second-login",
      user: { ...fixtureUser, id: "second-buyer" },
      accessToken: "fixture-second-token",
    })
  )
  storageEvent()
  assert.equal(session.readSession().user.id, "second-buyer")
  storage.delete(session.SESSION_STORAGE_KEY)
  storageEvent()
  assert.equal(session.readSession().user, null)
  assert.deepEqual(changes, ["fixture-rotated", "fixture-second-token", null])
  unsubscribe()
})

test("blocked browser storage preserves a usable in-memory login", (t) => {
  mock(t, () => {
    throw new Error("No network request expected")
  })
  const local = window.localStorage
  const tab = window.sessionStorage
  const blocked = {
    getItem() {
      throw new Error("blocked")
    },
    setItem() {
      throw new Error("blocked")
    },
    removeItem() {
      throw new Error("blocked")
    },
  }
  window.localStorage = blocked
  window.sessionStorage = blocked
  try {
    session.saveSession(fixtureUser, {
      accessToken: "fixture-access",
      refreshToken: "fixture-refresh",
    })
    assert.equal(session.syncSession().accessToken, "fixture-access")
    assert.equal(session.syncSession().refreshToken, "fixture-refresh")
    session.clearSession()
    assert.equal(session.readSession().user, null)
  } finally {
    window.localStorage = local
    window.sessionStorage = tab
  }
})

test("a delayed resource response cannot affect a newer login", async (t) => {
  let respond
  const started = deferred()
  mock(
    t,
    () =>
      new Promise((resolve) => {
        respond = resolve
        started.resolve()
      })
  )
  session.saveSession(fixtureUser, "fixture-first-access")
  const pending = apiRequest("/getty/v1/order/cart")
  await started.promise
  session.saveSession(
    { ...fixtureUser, id: "another-buyer" },
    "fixture-second-access"
  )
  respond(Response.json({ message: "Expired" }, { status: 401 }))
  await assert.rejects(pending, (error) => error.status === 409)
  assert.equal(session.readSession().user.id, "another-buyer")
  assert.equal(session.readSession().accessToken, "fixture-second-access")
})

test("explicit logout clears credentials before the remote request and cannot clear a later login", async (t) => {
  let respond
  const started = deferred()
  mock(t, (_url, options) => {
    assert.equal(session.readSession().user, null)
    assert.equal(
      options.headers.get("Authorization"),
      "Bearer fixture-first-access"
    )
    return new Promise((resolve) => {
      respond = resolve
      started.resolve()
    })
  })
  session.saveSession(fixtureUser, {
    accessToken: "fixture-first-access",
    refreshToken: "fixture-first-refresh",
    fingerprint: "fixture-first-fingerprint",
  })
  const pending = logout()
  const record = JSON.parse(storage.get(session.SESSION_STORAGE_KEY))
  assert.equal(record.user, null)
  assert.equal(record.accessToken, null)
  assert.equal(record.refreshToken, null)
  assert.equal(record.fingerprint, null)
  await started.promise
  session.saveSession(
    { ...fixtureUser, id: "another-buyer" },
    "fixture-second-access"
  )
  respond(new Response(null, { status: 204 }))
  await pending
  assert.equal(session.readSession().user.id, "another-buyer")
})

test("access rejection, network failures and aborted requests preserve the signed-in profile", async (t) => {
  let mode = "forbidden"
  mock(t, (_url, options) => {
    if (mode === "offline") throw new TypeError("offline")
    if (mode === "aborted") throw options.signal.reason
    return Response.json({ message: "Forbidden" }, { status: 403 })
  })
  session.saveSession(fixtureUser, {
    accessToken: "fixture-access",
    refreshToken: "fixture-refresh",
  })
  await assert.rejects(
    apiRequest("/getty/v1/order/cart"),
    (error) => error.status === 403
  )
  mode = "offline"
  await assert.rejects(
    apiRequest("/getty/v1/order/cart"),
    (error) => error.status === 503
  )
  mode = "aborted"
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(
    apiRequest("/getty/v1/order/cart", { signal: controller.signal }),
    (error) => error.name === "AbortError"
  )
  assert.equal(session.readSession().user.id, fixtureUser.id)
  assert.equal(session.readSession().refreshToken, "fixture-refresh")
})

const refreshPath = "/auth/getty/refresh"
const tokenPair = {
  accessToken: "fixture-expired",
  refreshToken: "fixture-refresh",
  fingerprint: "fixture-fingerprint",
}
const rotatedPair = {
  accessToken: "fixture-renewed",
  refreshToken: "fixture-rotated-refresh",
  fingerprint: "fixture-rotated-fingerprint",
}
const expiredResponse = () =>
  Response.json({ success: false, message: "Expired" }, { status: 401 })
const renewedResponse = (tokens = rotatedPair) =>
  Response.json({ ...envelope(null), tokens })
const deferred = () => {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

test("expired bearer requests refresh through the live endpoint, persist rotation and retry the original mutation once", async (t) => {
  const calls = []
  mock(t, (url, options) => {
    calls.push({ url, options })
    if (url.pathname === refreshPath) {
      assert.equal(url.origin, "https://api.gettymedicalstores.com")
      assert.equal(options.method, "POST")
      assert.equal(options.headers.has("Authorization"), false)
      assert.equal(options.credentials, "include")
      assert.deepEqual(JSON.parse(options.body), {})
      return renewedResponse()
    }
    if (options.headers.get("Authorization") === "Bearer fixture-expired")
      return expiredResponse()
    assert.equal(options.headers.get("Authorization"), "Bearer fixture-renewed")
    return Response.json(envelope(cart))
  })
  session.saveSession(fixtureUser, tokenPair)
  const before = session.readSession()
  const body = JSON.stringify({ quantity: 4 })
  await apiRequest(`/getty/v1/order/cart/items/${ids[2]}?example=1`, {
    method: "PUT",
    body,
    headers: { "X-Request-ID": "fixture-retry-id" },
  })
  assert.equal(calls.length, 3)
  assert.equal(calls[2].url.href, calls[0].url.href)
  assert.equal(calls[2].options.body, body)
  assert.equal(calls[2].options.method, "PUT")
  assert.equal(calls[2].options.headers.get("X-Request-ID"), "fixture-retry-id")
  assert.equal(session.readSession().sessionId, before.sessionId)
  assert.deepEqual(session.readSession().user, before.user)
  const record = JSON.parse(storage.get(session.SESSION_STORAGE_KEY))
  for (const field of Object.keys(rotatedPair))
    assert.equal(record[field], rotatedPair[field])
})

test("simultaneous expired authenticated requests share one refresh while public reads remain anonymous", async (t) => {
  let refreshes = 0,
    replays = 0,
    publicReads = 0
  const started = deferred(),
    finish = deferred()
  mock(t, async (url, options) => {
    if (url.pathname === refreshPath) {
      refreshes++
      started.resolve()
      await finish.promise
      return renewedResponse()
    }
    if (url.pathname.endsWith("/catalog/categories")) {
      assert.equal(options.headers.has("Authorization"), false)
      assert.equal(options.credentials, "omit")
      publicReads++
      return Response.json(envelope([]))
    }
    if (options.headers.get("Authorization") === "Bearer fixture-expired")
      return expiredResponse()
    assert.equal(options.headers.get("Authorization"), "Bearer fixture-renewed")
    replays++
    return Response.json(envelope([]))
  })
  session.saveSession(fixtureUser, tokenPair)
  const requests = [
    apiRequest("/getty/v1/order/cart"),
    apiRequest("/getty/ecommerce/catalog/categories", {}, "public"),
    apiRequest("/getty/v1/inventory/stocks"),
  ]
  await started.promise
  finish.resolve()
  await Promise.all(requests)
  assert.equal(refreshes, 1)
  assert.equal(replays, 2)
  assert.equal(publicReads, 1)
})

test("a late 401 reuses the already rotated token instead of refreshing again", async (t) => {
  const finishLate = deferred()
  let refreshes = 0
  mock(t, async (url, options) => {
    if (url.pathname === refreshPath) {
      refreshes++
      return renewedResponse()
    }
    if (options.headers.get("Authorization") === "Bearer fixture-expired") {
      if (url.searchParams.has("late")) await finishLate.promise
      return expiredResponse()
    }
    return Response.json(envelope([]))
  })
  session.saveSession(fixtureUser, tokenPair)
  const late = apiRequest("/getty/v1/order/cart?late=1")
  await apiRequest("/getty/v1/order/cart")
  finishLate.resolve()
  await late
  assert.equal(refreshes, 1)
})

test("rejected refresh credentials preserve the login and request reauthentication", async (t) => {
  let calls = 0
  mock(t, () => {
    calls++
    return expiredResponse()
  })
  session.saveSession(fixtureUser, tokenPair)
  await assert.rejects(
    apiRequest("/getty/v1/order/cart"),
    (error) =>
      error.status === 401 && error.message.includes("renew your session")
  )
  assert.equal(calls, 2)
  assert.equal(session.readSession().user.id, fixtureUser.id)
  assert.equal(session.readSession().refreshToken, "fixture-refresh")
  assert.equal(session.readSession().refreshRejected, true)
})

test("failed or incomplete renewal preserves the session and a later attempt can recover", async (t) => {
  let mode = "offline",
    refreshes = 0
  mock(t, (url, options) => {
    if (url.pathname !== refreshPath)
      return options.headers.get("Authorization") === "Bearer fixture-renewed"
        ? Response.json(envelope([]))
        : expiredResponse()
    refreshes++
    if (mode === "offline") throw new TypeError("network error")
    if (mode === "outage")
      return Response.json({ message: "Try later" }, { status: 503 })
    if (mode === "incomplete")
      return renewedResponse({ refreshToken: "fixture-invalid-pair" })
    if (mode === "invalid-body")
      return Response.json({ message: "Request invalid" }, { status: 400 })
    return renewedResponse()
  })
  session.saveSession(fixtureUser, tokenPair)
  for (const [failure, status] of [
    ["offline", 503],
    ["outage", 503],
    ["incomplete", 502],
    ["invalid-body", 400],
  ]) {
    mode = failure
    await assert.rejects(
      apiRequest("/getty/v1/order/cart"),
      (error) => error.status === status
    )
    assert.equal(session.readSession().user.id, fixtureUser.id)
    assert.equal(session.readSession().refreshToken, "fixture-refresh")
  }
  mode = "success"
  await apiRequest("/getty/v1/order/cart")
  assert.equal(refreshes, 5)
  assert.equal(session.accessToken(), "fixture-renewed")
})

test("a second resource rejection ends retrying without destroying the renewed login", async (t) => {
  let refreshes = 0,
    resources = 0
  mock(t, (url) => {
    if (url.pathname === refreshPath) {
      refreshes++
      return renewedResponse()
    }
    resources++
    return expiredResponse()
  })
  session.saveSession(fixtureUser, tokenPair)
  await assert.rejects(
    apiRequest("/getty/v1/order/cart"),
    (error) => error.status === 401
  )
  assert.equal(refreshes, 1)
  assert.equal(resources, 2)
  assert.equal(session.accessToken(), "fixture-renewed")
})

test("anonymous login failures never renew or clear the existing account", async (t) => {
  mock(t, (url, options) => {
    assert.equal(url.pathname, "/auth/getty/login")
    assert.equal(options.headers.has("Authorization"), false)
    return expiredResponse()
  })
  session.saveSession(fixtureUser, tokenPair)
  await assert.rejects(
    login("buyer@example.test", "FixturePassword1!"),
    (error) => error.status === 401
  )
  assert.equal(session.accessToken(), "fixture-expired")
})

test("a late refresh success cannot restore an account after logout", async (t) => {
  const started = deferred(),
    finish = deferred()
  let resources = 0
  mock(t, async (url) => {
    if (url.pathname === refreshPath) {
      started.resolve()
      await finish.promise
      return renewedResponse()
    }
    resources++
    return expiredResponse()
  })
  session.saveSession(fixtureUser, tokenPair)
  const request = apiRequest("/getty/v1/order/cart")
  await started.promise
  session.clearSession()
  finish.resolve()
  await assert.rejects(request, (error) => error.status === 409)
  assert.equal(session.readSession().user, null)
  assert.equal(resources, 1)
})

test("a late refresh rejection cannot clear a new login", async (t) => {
  const started = deferred(),
    finish = deferred()
  mock(t, async (url) => {
    if (url.pathname === refreshPath) {
      started.resolve()
      await finish.promise
    }
    return expiredResponse()
  })
  session.saveSession(fixtureUser, tokenPair)
  const request = apiRequest("/getty/v1/order/cart")
  await started.promise
  session.saveSession(
    { ...fixtureUser, id: "another-buyer" },
    "fixture-other-access"
  )
  finish.resolve()
  await assert.rejects(request, (error) => error.status === 409)
  assert.equal(session.readSession().user.id, "another-buyer")
  assert.equal(session.accessToken(), "fixture-other-access")
})

test("aborting one waiting request leaves renewal running for the others", async (t) => {
  const started = deferred(),
    finish = deferred()
  let refreshes = 0,
    replays = 0
  mock(t, async (url, options) => {
    if (url.pathname === refreshPath) {
      refreshes++
      assert.equal(options.signal, undefined)
      started.resolve()
      await finish.promise
      return renewedResponse()
    }
    if (options.headers.get("Authorization") === "Bearer fixture-expired")
      return expiredResponse()
    replays++
    return Response.json(envelope([]))
  })
  session.saveSession(fixtureUser, tokenPair)
  const controller = new AbortController()
  const cancelled = apiRequest("/getty/v1/order/cart", {
    signal: controller.signal,
  })
  const continuing = apiRequest("/getty/v1/order/cart")
  await started.promise
  controller.abort()
  await assert.rejects(cancelled, (error) => error.name === "AbortError")
  finish.resolve()
  await continuing
  assert.equal(refreshes, 1)
  assert.equal(replays, 1)
  assert.equal(session.accessToken(), "fixture-renewed")
})

test("a token rotated by another tab while waiting for the Web Lock is reused", async (t) => {
  let refreshes = 0,
    lockCalls = 0
  const original = Object.getOwnPropertyDescriptor(globalThis, "navigator")
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      locks: {
        request: async (name, callback) => {
          lockCalls++
          assert.equal(
            name,
            "getty-session-refresh:https://api.gettymedicalstores.com"
          )
          const record = JSON.parse(storage.get(session.SESSION_STORAGE_KEY))
          storage.set(
            session.SESSION_STORAGE_KEY,
            JSON.stringify({ ...record, ...rotatedPair })
          )
          return callback()
        },
      },
    },
  })
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "navigator", original)
    else delete globalThis.navigator
  })
  mock(t, (url, options) => {
    if (url.pathname === refreshPath) {
      refreshes++
      return renewedResponse()
    }
    if (options.headers.get("Authorization") === "Bearer fixture-expired")
      return expiredResponse()
    assert.equal(options.headers.get("Authorization"), "Bearer fixture-renewed")
    return Response.json(envelope([]))
  })
  session.saveSession(fixtureUser, tokenPair)
  await apiRequest("/getty/v1/order/cart")
  assert.equal(lockCalls, 1)
  assert.equal(refreshes, 0)
})

test("renewal can return only an access token and preserves the existing refresh credentials", async (t) => {
  mock(t, (url, options) => {
    if (url.pathname === refreshPath)
      return renewedResponse({ accessToken: "fixture-renewed" })
    if (options.headers.get("Authorization") === "Bearer fixture-expired")
      return Response.json({ status: 401, success: false, message: "Expired" })
    return Response.json(envelope([]))
  })
  session.saveSession(fixtureUser, tokenPair)
  await apiRequest("/getty/v1/order/cart")
  assert.equal(session.accessToken(), "fixture-renewed")
  assert.equal(session.readSession().refreshToken, "fixture-refresh")
  assert.equal(session.readSession().fingerprint, "fixture-fingerprint")
})

test("a forbidden refresh response preserves the account without any retry loop", async (t) => {
  let calls = 0
  mock(t, (url) => {
    calls++
    return url.pathname === refreshPath
      ? Response.json({ message: "Refresh revoked" }, { status: 403 })
      : expiredResponse()
  })
  session.saveSession(fixtureUser, tokenPair)
  await assert.rejects(
    apiRequest("/getty/v1/order/cart"),
    (error) => error.status === 401
  )
  assert.equal(session.readSession().user.id, fixtureUser.id)
  assert.equal(session.readSession().refreshRejected, true)
  assert.equal(calls, 2)
})

test("the Vendors list requests only vendor tenants and handles numeric cursor fields", async (t) => {
  let response = {
    records: [{ id: ids[0], name: "Fixture Vendor" }],
    next: 15,
    previous: 0,
  }
  mock(t, (url, options) => {
    assert.equal(url.pathname, "/getty/v1/tenant/tenants")
    assert.equal(url.searchParams.get("type"), "vendor")
    assert.equal(url.searchParams.get("search"), "Fixture")
    assert.equal(options.headers.get("Authorization"), "Bearer fixture-access")
    return Response.json(envelope(response))
  })
  session.saveSession(fixtureUser, "fixture-access")
  const page = await portalRecords("suppliers", "?search=Fixture&type=support")
  assert.equal(page.nextCursor, "15")
  assert.equal(page.previousCursor, null)
  response = { ...response, next: 0, previous: 0 }
  assert.equal(
    (await portalRecords("suppliers", "?search=Fixture")).nextCursor,
    null
  )
})

test("the Customers list uses the tenant API with customer type and retains search and pagination", async (t) => {
  const customer = {
    id: ids[0],
    name: "Fixture Customer",
    email: "customer@example.test",
    phone: "08012345678",
    status: "active",
  }
  mock(t, (url, options) => {
    assert.equal(url.pathname, "/getty/v1/tenant/tenants")
    assert.equal(url.searchParams.get("type"), "customer")
    assert.equal(url.searchParams.getAll("type").length, 1)
    assert.equal(url.searchParams.get("search"), "Fixture")
    assert.equal(url.searchParams.get("cursor"), "15")
    assert.equal(url.searchParams.get("navigation"), "next")
    assert.equal(url.searchParams.get("limit"), "50")
    assert.equal(options.headers.get("Authorization"), "Bearer fixture-access")
    return Response.json(
      envelope({
        records: [customer],
        next: 30,
        previous: 0,
        isNext: true,
        isPrevious: true,
      })
    )
  })
  session.saveSession({ ...fixtureUser, role: "admin" }, "fixture-access")
  const page = await portalRecords(
    "customers",
    "?search=Fixture&type=vendor&type=support&cursor=15&navigation=next&limit=50"
  )
  assert.deepEqual(page.records, [customer])
  assert.equal(page.nextCursor, "30")
  assert.equal(page.previousCursor, "0")
})

test("profile pagination uses next/previous when their availability flags are present", async (t) => {
  let response = {
    records: [],
    next: 12,
    previous: 3,
    isNext: true,
    isPrevious: true,
  }
  mock(t, (url) => {
    assert.equal(url.pathname, "/getty/v1/tenant/profiles")
    assert.equal(url.searchParams.get("cursor"), "9")
    assert.equal(url.searchParams.get("navigation"), "previous")
    return Response.json(envelope(response))
  })
  session.saveSession(fixtureUser, "fixture-access")
  const page = await portalRecords("profiles", "?cursor=9&navigation=previous")
  assert.equal(page.nextCursor, "12")
  assert.equal(page.previousCursor, "3")
  response = { ...response, isNext: false, isPrevious: false }
  const last = await portalRecords("profiles", "?cursor=9&navigation=previous")
  assert.equal(last.nextCursor, null)
  assert.equal(last.previousCursor, null)
})

test("nested management categories remain selectable and use documented CRUD payloads", async (t) => {
  const calls = []
  mock(t, (url, options) => {
    calls.push({ url, options })
    if (!options.method) {
      assert.equal(url.search, "")
      return Response.json(
        envelope([
          {
            id: ids[0],
            name: "Medical supplies",
            parent: null,
            subcategories: [
              {
                id: ids[1],
                name: "Dressings",
                parent: ids[0],
                subcategories: [],
              },
            ],
          },
        ])
      )
    }
    return Response.json(
      envelope(
        options.method === "POST"
          ? [{ status: "success", message: "Created" }]
          : "OK"
      )
    )
  })
  session.saveSession(fixtureUser, "fixture-access")
  const categories = await portalRecords("categories", "?search=ignored")
  assert.equal(categories.records.length, 2)
  assert.equal(
    categories.records[1].categoryPath,
    "Medical supplies / Dressings"
  )
  assert.equal(categories.records[1].parentName, "Medical supplies")
  await changePortalRecord("categories", "POST", {
    parent: ids[0],
    name: "Dressings",
    description: "Sterile dressings",
  })
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    parent: ids[0],
    categories: [{ name: "Dressings", description: "Sterile dressings" }],
  })
  await changePortalRecord("categories", "PATCH", {
    id: ids[1],
    name: "Dressings",
    description: "Updated description",
  })
  assert.equal(calls[2].options.method, "PATCH")
  assert.equal(JSON.parse(calls[2].options.body).id, ids[1])
  await changePortalRecord("categories", "DELETE", { id: ids[1] })
  assert.equal(calls[3].url.pathname, `/getty/v1/product/categories/${ids[1]}`)
  await assert.rejects(
    changePortalRecord("categories", "POST", { name: "No parent" }),
    (error) => error.status === 400
  )
  assert.equal(calls.length, 4)
})

test("top-level category creation sends an explicit null parent and surfaces server rejection", async (t) => {
  let rejectRoot = false
  mock(t, (url, options) => {
    assert.equal(
      url.href,
      "https://api.gettymedicalstores.com/getty/v1/product/categories"
    )
    assert.equal(options.method, "POST")
    assert.equal(options.headers.get("Authorization"), "Bearer fixture-access")
    assert.deepEqual(JSON.parse(options.body), {
      parent: null,
      categories: [
        { name: "Medical equipment", description: "Equipment for clinics" },
      ],
    })
    return Response.json(
      envelope([
        rejectRoot
          ? { status: "error", message: "Root creation is unavailable" }
          : { status: "success", message: "Created" },
      ])
    )
  })
  session.saveSession(fixtureUser, "fixture-access")
  const input = {
    parent: null,
    name: "Medical equipment",
    description: "Equipment for clinics",
  }
  await changePortalRecord("categories", "POST", input)
  rejectRoot = true
  await assert.rejects(
    changePortalRecord("categories", "POST", input),
    (error) =>
      error.status === 422 && error.message === "Root creation is unavailable"
  )
})

test("nested category envelopes preserve parent IDs when children omit them", async (t) => {
  mock(t, () =>
    Response.json(
      envelope({
        records: [
          {
            id: ids[0],
            name: "Equipment",
            parent: null,
            subcategories: [
              {
                id: ids[1],
                name: "Diagnostics",
                subcategories: [{ id: ids[2], name: "Imaging" }],
              },
            ],
          },
        ],
      })
    )
  )
  session.saveSession(fixtureUser, "fixture-access")
  const { records } = await portalRecords("categories")
  assert.deepEqual(
    records.map(({ id, parent }) => ({ id, parent })),
    [
      { id: ids[0], parent: null },
      { id: ids[1], parent: ids[0] },
      { id: ids[2], parent: ids[1] },
    ]
  )
  assert.equal(records[2].categoryPath, "Equipment / Diagnostics / Imaging")
  assert.equal(
    buildCategoryTree(records)[0].children[0].children[0].record.id,
    ids[2]
  )
})

test("category trees group by ID regardless of name or order and keep complete branches on a page", () => {
  const records = [
    { id: "child-b", parent: "b", name: "Supplies" },
    { id: "a", parent: null, name: "Equipment" },
    { id: "b", parent: null, name: "Equipment" },
    { id: "child-a", parent: "a", name: "Supplies" },
    { id: "grandchild", parent: "child-a", name: "Dressings" },
  ]
  const tree = buildCategoryTree(records)
  assert.deepEqual(
    tree.map(({ record }) => record.id),
    ["a", "b"]
  )
  assert.deepEqual(
    categoryRows(tree.slice(0, 1)).map(({ node }) => node.record.id),
    ["a", "child-a", "grandchild"]
  )
  assert.deepEqual(
    categoryRows(tree.slice(1, 2)).map(({ node }) => node.record.id),
    ["b", "child-b"]
  )
  assert.deepEqual(
    categoryRows(tree, new Set(["a"])).map(({ node }) => node.record.id),
    ["a", "b", "child-b"]
  )
  assert.equal(categoryRows(tree)[2].depth, 2)
  assert.equal(categoryRows(tree)[2].parentPath, "Equipment / Supplies")
})

test("category search retains ancestors of matches, searches descriptions and does not mutate the full tree", () => {
  const tree = buildCategoryTree([
    { id: "a", parent: null, name: "Equipment" },
    { id: "b", parent: "a", name: "Diagnostics" },
    {
      id: "c",
      parent: "b",
      name: "Imaging",
      description: "Digital X-ray units",
    },
    { id: "d", parent: "a", name: "Chairs" },
    { id: "e", parent: null, name: "Materials" },
  ])
  const matches = filterCategoryTree(tree, " X-RAY ")
  assert.deepEqual(
    categoryRows(matches).map(({ node }) => node.record.id),
    ["a", "b", "c"]
  )
  assert.deepEqual(
    categoryRows(filterCategoryTree(tree, "equipment")).map(
      ({ node }) => node.record.id
    ),
    ["a", "b", "c", "d"]
  )
  assert.equal(tree[0].children.length, 2)
  assert.equal(categoryRows(tree).length, 5)
  assert.equal(filterCategoryTree(tree, "no matching category").length, 0)
  assert.strictEqual(filterCategoryTree(tree, "  "), tree)
})

test("incomplete or cyclic category relationships remain visible exactly once", () => {
  const tree = buildCategoryTree([
    { id: "orphan", parent: "missing", name: "Orphan" },
    { id: "self", parent: "self", name: "Self" },
    { id: "a", parent: "b", name: "A" },
    { id: "b", parent: "a", name: "B" },
    { id: "c", parent: "a", name: "C" },
    { id: "c", parent: "a", name: "Duplicate" },
  ])
  const idsInTree = categoryRows(tree).map(({ node }) => node.record.id)
  assert.equal(idsInTree.length, 5)
  assert.deepEqual(
    new Set(idsInTree),
    new Set(["orphan", "self", "a", "b", "c"])
  )
})

test("taxes list, create, edit and delete use their documented live methods and percentage payloads", async (t) => {
  const calls = []
  mock(t, (url, options) => {
    calls.push({ url, options })
    if (!options.method)
      return Response.json(
        envelope([{ id: ids[0], name: "Fixture tax", rate: 7.5 }])
      )
    return Response.json(
      envelope(
        options.method === "POST"
          ? [{ status: "success", message: "Created" }]
          : "OK"
      )
    )
  })
  session.saveSession(fixtureUser, "fixture-access")
  const taxes = await portalRecords("taxes", "?limit=50")
  assert.equal(taxes.records[0].rate, 7.5)
  assert.equal(
    calls[0].url.href,
    "https://api.gettymedicalstores.com/getty/v1/product/taxes"
  )
  await changePortalRecord("taxes", "POST", {
    name: "Fixture tax",
    rate: 7.5,
    unsupported: "ignored",
  })
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    name: "Fixture tax",
    rate: 7.5,
  })
  await changePortalRecord("taxes", "PATCH", {
    id: ids[0],
    name: "Fixture tax",
    rate: 0,
  })
  assert.deepEqual(JSON.parse(calls[2].options.body), {
    id: ids[0],
    name: "Fixture tax",
    rate: 0,
  })
  await changePortalRecord("taxes", "DELETE", { id: ids[0] })
  assert.equal(calls[3].url.pathname, `/getty/v1/product/taxes/${ids[0]}`)
  assert.equal(calls[3].options.method, "DELETE")
  for (const rate of [-1, 101, NaN])
    await assert.rejects(
      changePortalRecord("taxes", "POST", { name: "Invalid", rate }),
      (error) => error.status === 400
    )
  assert.equal(calls.length, 4)
})

test("a failed item in an otherwise successful mutation envelope is not reported as saved", async (t) => {
  mock(t, () =>
    Response.json(
      envelope([{ status: "error", message: "A tax with that name exists." }])
    )
  )
  session.saveSession(fixtureUser, "fixture-access")
  await assert.rejects(
    changePortalRecord("taxes", "POST", { name: "Fixture tax", rate: 5 }),
    (error) =>
      error.status === 422 && error.message === "A tax with that name exists."
  )
})

test("vendor detail and product editing read the documented nested response shapes", async (t) => {
  mock(t, (url) => {
    if (url.pathname.startsWith("/getty/v1/tenant/tenants/")) {
      assert.equal(url.pathname, `/getty/v1/tenant/tenants/${ids[0]}`)
      return Response.json(
        envelope({
          id: ids[0],
          name: "Fixture Vendor",
          type: "vendor",
          country: "NG",
          address: {},
        })
      )
    }
    assert.equal(url.pathname, `/getty/v1/product/products/${ids[1]}`)
    return Response.json(
      envelope({
        product: { id: ids[1], category: ids[2], name: "Gloves" },
        variants: [{ id: ids[3], isDefault: true, price: 1250, quantity: 0 }],
        specifications: [],
        detail: null,
        taxes: [],
      })
    )
  })
  session.saveSession(fixtureUser, "fixture-access")
  assert.equal((await portalTenant(ids[0])).type, "vendor")
  const product = await portalProduct(ids[1])
  assert.equal(product.record.categoryId, ids[2])
  assert.equal(product.record.price, 1250)
  assert.equal(product.record.quantity, 0)
})

test("product administration retains POST/PATCH bodies and deletes by encoded ID", async (t) => {
  const calls = []
  mock(t, (url, options) => {
    calls.push({ url, options })
    return Response.json(envelope({ id: ids[0] }))
  })
  session.saveSession(fixtureUser, "fixture-access")
  const product = {
    name: "Gloves",
    category: ids[1],
    description: "Sterile gloves",
    currency: "NGN",
    price: 1250,
    quantity: 20,
  }
  await changePortalRecord("products", "POST", product)
  await changePortalRecord("products", "PATCH", {
    ...product,
    id: ids[0],
    brand: "Fixture",
  })
  await changePortalRecord("products", "DELETE", { id: ids[0] })
  assert.equal(calls[0].url.pathname, "/getty/v1/product/products")
  assert.deepEqual(JSON.parse(calls[0].options.body), product)
  assert.equal(calls[1].options.method, "PATCH")
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    ...product,
    id: ids[0],
    brand: "Fixture",
  })
  assert.equal(calls[2].url.pathname, `/getty/v1/product/products/${ids[0]}`)
})

test("product workspace reads the aggregate record and refuses a mismatched product", async (t) => {
  let returnedId = ids[0]
  mock(t, (url, options) => {
    assert.equal(url.pathname, `/getty/v1/product/products/${ids[0]}`)
    assert.equal(options.headers.get("Authorization"), "Bearer fixture-access")
    return Response.json(
      envelope({
        product: {
          id: returnedId,
          name: "Fixture gloves",
          status: "draft",
          currency: "NGN",
        },
        category: { id: ids[1], name: "Consumables" },
        detail: null,
        variants: [{ id: ids[2], name: "Medium", price: 100, isDefault: true }],
        specifications: [{ id: ids[3], name: "Material", value: "Nitrile" }],
        taxes: [],
        certificates: [],
      })
    )
  })
  session.saveSession(fixtureUser, "fixture-access")
  const data = await getManagedProduct(ids[0])
  assert.equal(data.product.status, "draft")
  assert.equal(data.specifications[0].value, "Nitrile")
  returnedId = ids[1]
  await assert.rejects(
    getManagedProduct(ids[0]),
    (error) => error.status === 502
  )
})

test("the supplied product details shape preserves media links, nullable fields and live stock", async (t) => {
  const productId = "01a11273-ddcd-7dc4-b84e-fe1c822c3b1c"
  const links = {
    self: `/getty/v1/product/products/${productId}`,
    attachments: `/getty/v1/attachment/files?ownerType=product&ownerId=${productId}`,
    photos: `/getty/ecommerce/catalog/products/${productId}/photos`,
  }
  const detail = {
    id: productId,
    product: productId,
    model: null,
    usage: null,
    origin: null,
    sterile: null,
    dispatch: null,
    warnings: null,
    warranty: null,
    coldchain: null,
    shelflife: null,
    disposable: null,
    instructions: null,
    manufacturer: null,
  }
  mock(t, (url, options) => {
    assert.equal(url.pathname, links.self)
    assert.equal(options.headers.get("Authorization"), "Bearer fixture-access")
    return Response.json(
      envelope({
        product: {
          id: productId,
          name: "Test product",
          brand: null,
          status: "published",
          category: ids[1],
          currency: "NGN",
          reviewed: "2026-10-07T11:54:13.511515+01:00",
          reviewer: ids[3],
          rejection: null,
          description: "This is a test product",
        },
        category: {
          id: ids[1],
          name: "Dental Materials",
          slug: "dental-materials",
          active: true,
          parent: null,
          ordinal: 20,
          description: null,
        },
        detail,
        variants: [
          {
            id: productId,
            sku: "SKU-01a11273ddcd7dc4b84efe1c822c3b1c",
            name: "Default",
            price: 400000,
            active: true,
            barcode: null,
            options: {},
            product: productId,
            widthCm: null,
            heightCm: null,
            lengthCm: null,
            quantity: 14,
            reserved: 0,
            saleUnit: "piece",
            weightKg: null,
            isDefault: true,
            threshold: 5,
            unitsPerPack: 1,
            availableQuantity: 14,
            minimumOrderQuantity: 1,
          },
        ],
        taxes: [
          {
            id: ids[2],
            tax: ids[3],
            name: "VAT",
            rate: 7.5,
            product: productId,
          },
        ],
        certificates: [],
        specifications: [],
        links,
      })
    )
  })
  session.saveSession({ ...fixtureUser, role: "supplier" }, "fixture-access")
  const result = await getManagedProduct(productId)
  assert.deepEqual(result.links, links)
  assert.deepEqual(result.detail, detail)
  assert.equal(result.product.status, "published")
  assert.equal(result.product.rejection, null)
  assert.equal(result.product.brand, null)
  assert.equal(result.category.slug, "dental-materials")
  assert.equal(result.variants[0].quantity, 14)
  assert.equal(result.variants[0].availableQuantity, 14)
  assert.equal(result.variants[0].price, 400000)
  assert.equal(result.taxes[0].rate, 7.5)
})

test("the product photo link loads public saved images and forwards both cursor fields", async (t) => {
  const photosLink = `/getty/ecommerce/catalog/products/${ids[0]}/photos`
  const cursor = { entry: "2026-10-07T11:54:13.511515", id: ids[1] }
  const calls = []
  mock(t, (url, options) => {
    calls.push(url)
    assert.equal(url.pathname, photosLink)
    assert.equal(url.searchParams.get("limit"), "24")
    assert.equal(options.credentials, "omit")
    assert.equal(options.headers.has("Authorization"), false)
    const nextPage = url.searchParams.has("cursorEntry")
    if (nextPage) {
      assert.equal(url.searchParams.get("cursorEntry"), cursor.entry)
      assert.equal(url.searchParams.get("cursorId"), cursor.id)
    } else {
      assert.equal(url.searchParams.has("cursorId"), false)
    }
    return Response.json(
      envelope({
        records: [
          {
            id: nextPage ? ids[2] : ids[1],
            name: nextPage ? "back.webp" : "front.webp",
            mime: "image/webp",
            url: `${photosLink}/${nextPage ? ids[2] : ids[1]}/src`,
          },
        ],
        nextCursor: nextPage ? null : cursor,
        limit: 24,
      })
    )
  })
  session.saveSession({ ...fixtureUser, role: "supplier" }, "fixture-access")
  const first = await getProductPhotoPage(ids[0], photosLink)
  const second = await getProductPhotoPage(
    ids[0],
    `https://api.gettymedicalstores.com${photosLink}`,
    first.nextCursor
  )
  assert.equal(calls.length, 2)
  assert.equal(first.records[0].id, ids[1])
  assert.equal(
    first.records[0].url,
    `https://api.gettymedicalstores.com${photosLink}/${ids[1]}/src`
  )
  assert.equal(second.records[0].id, ids[2])
  assert.equal(second.nextCursor, null)
})

test("the supplied get-photos response retains image metadata and ends pagination at a null cursor", async (t) => {
  const product = "01a0ffdc-d7bc-7ced-81ec-c8b07e281025"
  const file = "01a11600-c433-7000-8000-100000056e27"
  const url = `/getty/ecommerce/catalog/products/${product}/photos/${file}/src`
  mock(t, (request) => {
    assert.equal(
      request.pathname,
      `/getty/ecommerce/catalog/products/${product}/photos`
    )
    return Response.json(
      envelope({
        records: [
          { id: file, name: "product-photo.jpg", mime: "image/jpeg", url },
        ],
        nextCursor: null,
        limit: 20,
      })
    )
  })
  assert.deepEqual(await getProductPhotoPage(product), {
    records: [
      {
        id: file,
        name: "product-photo.jpg",
        mime: "image/jpeg",
        url: `https://api.gettymedicalstores.com${url}`,
      },
    ],
    nextCursor: null,
    limit: 20,
  })
})

test("photo source URLs preserve returned query parameters and reject unrelated files or origins", async (t) => {
  const path = `/getty/ecommerce/catalog/products/${ids[0]}/photos/${ids[1]}/src`
  let url = `${path}?version=verified`
  mock(t, () =>
    Response.json(
      envelope({
        records: [{ id: ids[1], name: "front.jpg", mime: "image/jpeg", url }],
        nextCursor: null,
        limit: 20,
      })
    )
  )
  assert.equal(
    (await getProductPhotoPage(ids[0])).records[0].url,
    `https://api.gettymedicalstores.com${path}?version=verified`
  )
  url = `https://api.gettymedicalstores.com${path}`
  assert.equal((await getProductPhotoPage(ids[0])).records[0].url, url)
  for (const invalid of [
    "",
    "invalid-url",
    `https://other.example.test${path}`,
    `http://api.gettymedicalstores.com${path}`,
    `/getty/ecommerce/catalog/products/${ids[0]}/photos/${ids[2]}/src`,
    `/getty/ecommerce/catalog/products/${ids[2]}/photos/${ids[1]}/src`,
  ]) {
    url = invalid
    await assert.rejects(
      getProductPhotoPage(ids[0]),
      (error) => error instanceof GettyApiError && error.status === 502
    )
  }
})

test("product photo reads reject unrelated links and malformed cursors before requesting data", async (t) => {
  const photosLink = `/getty/ecommerce/catalog/products/${ids[0]}/photos`
  const calls = []
  mock(t, (url) => {
    calls.push(url)
    return Response.json(envelope({ records: [], nextCursor: null, limit: 24 }))
  })
  for (const link of [
    `https://other.example.test${photosLink}`,
    `http://api.gettymedicalstores.com${photosLink}`,
    `/getty/ecommerce/catalog/products/${ids[1]}/photos`,
    `/getty/v1/attachment/files?ownerType=product&ownerId=${ids[0]}`,
    `${photosLink}#unused-fragment`,
  ])
    await assert.rejects(
      getProductPhotoPage(ids[0], link),
      (error) => error instanceof GettyApiError && error.status === 502
    )
  await assert.rejects(getProductPhotoPage(ids[0], photosLink, { id: ids[1] }))
  assert.equal(calls.length, 0)
  assert.deepEqual((await getProductPhotoPage(ids[0])).records, [])
  assert.equal(calls.length, 1)
})

test("product photo errors stay retryable and incomplete responses never appear as an empty gallery", async (t) => {
  let response = { records: [], limit: 24 }
  mock(t, () => Response.json(envelope(response)))
  await assert.rejects(
    getProductPhotoPage(ids[0]),
    (error) => error instanceof GettyApiError && error.status === 502
  )
  response = { records: [], nextCursor: null, limit: 24 }
  assert.deepEqual((await getProductPhotoPage(ids[0])).records, [])
})

test("specifications use authenticated product-scoped CRUD and preserve null units and zero order", async (t) => {
  const calls = []
  mock(t, (url, options) => {
    calls.push({ url, options })
    assert.equal(options.headers.get("Authorization"), "Bearer fixture-access")
    assert.equal(options.credentials, "include")
    return Response.json(
      envelope(
        !options.method
          ? [
              {
                id: ids[2],
                product: ids[0],
                name: "Material",
                value: "Nitrile",
                unit: null,
                ordinal: 0,
              },
            ]
          : [{ status: "success", message: "Saved" }]
      )
    )
  })
  session.saveSession(fixtureUser, "fixture-access")
  const specs = await getProductResource(ids[0], "specifications")
  assert.equal(specs[0].name, "Material")
  const fields = {
    product: "ignored-product",
    name: " Material ",
    value: "Nitrile",
    unit: null,
    ordinal: 0,
  }
  await saveProductResource(ids[0], "specifications", "POST", fields)
  await saveProductResource(ids[0], "specifications", "PATCH", {
    ...fields,
    id: ids[2],
    ordinal: 2,
  })
  await deleteProductResource(ids[0], "specifications", ids[2])
  assert.equal(
    calls[0].url.pathname,
    `/getty/v1/product/products/${ids[0]}/specifications`
  )
  assert.equal(
    calls[1].url.pathname,
    "/getty/v1/product/products/specifications"
  )
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    product: ids[0],
    name: "Material",
    value: "Nitrile",
    unit: null,
    ordinal: 0,
  })
  assert.equal(calls[2].options.method, "PATCH")
  assert.equal(JSON.parse(calls[2].options.body).id, ids[2])
  assert.equal(calls[3].options.method, "DELETE")
  assert.equal(
    calls[3].url.pathname,
    `/getty/v1/product/products/${ids[0]}/specifications/${ids[2]}`
  )
  for (const input of [
    { ...fields, name: " " },
    { ...fields, ordinal: -1 },
    { ...fields, ordinal: 1.5 },
    { ...fields, value: "" },
  ]) {
    await assert.rejects(
      saveProductResource(ids[0], "specifications", "POST", input),
      (error) => error.status === 400
    )
  }
  await assert.rejects(
    saveProductResource(ids[0], "specifications", "PATCH", fields),
    (error) => error.status === 400
  )
  assert.equal(calls.length, 4)
})

test("product detail writes preserve unknown boolean values and use POST then PATCH", async (t) => {
  const calls = []
  mock(t, (url, options) => {
    calls.push({ url, options })
    return Response.json(envelope(options.method ? "OK" : null))
  })
  session.saveSession(fixtureUser, "fixture-access")
  assert.equal(await getProductResource(ids[0], "detail"), null)
  const fields = {
    manufacturer: "Fixture Medical",
    model: "N100",
    origin: null,
    usage: "Examination",
    instructions: null,
    warnings: null,
    sterile: null,
    disposable: true,
    coldchain: false,
    shelflife: null,
    warranty: 0,
    dispatch: 2,
  }
  await saveProductResource(ids[0], "detail", "POST", fields)
  await saveProductResource(ids[0], "detail", "PATCH", {
    ...fields,
    dispatch: 3,
  })
  assert.equal(
    calls[0].url.pathname,
    `/getty/v1/product/products/${ids[0]}/detail`
  )
  assert.equal(calls[1].url.pathname, "/getty/v1/product/products/detail")
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    product: ids[0],
    ...fields,
  })
  assert.equal(calls[2].options.method, "PATCH")
  assert.equal(JSON.parse(calls[2].options.body).dispatch, 3)
})

test("variant management validates quantities and sends packaging/options without changing inventory", async (t) => {
  const calls = []
  mock(t, (url, options) => {
    calls.push({ url, options })
    return Response.json(envelope(options.method ? "OK" : []))
  })
  session.saveSession(fixtureUser, "fixture-access")
  await getProductResource(ids[0], "variants")
  const fields = {
    sku: "N-M-100",
    name: "Medium",
    isDefault: false,
    active: true,
    options: { size: "M" },
    price: 0,
    saleUnit: "box",
    unitsPerPack: 100,
    minimumOrderQuantity: 1,
  }
  await saveProductResource(ids[0], "variants", "POST", {
    ...fields,
    quantity: 99,
    status: "approved",
  })
  await saveProductResource(ids[0], "variants", "PATCH", {
    ...fields,
    id: ids[2],
    weightKg: null,
    barcode: null,
  })
  await deleteProductResource(ids[0], "variants", ids[2])
  assert.equal(
    calls[0].url.pathname,
    `/getty/v1/product/products/${ids[0]}/variants`
  )
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    product: ids[0],
    ...fields,
  })
  assert.equal(calls[2].options.method, "PATCH")
  assert.equal(
    calls[3].url.pathname,
    `/getty/v1/product/products/${ids[0]}/variants/${ids[2]}`
  )
  for (const input of [
    { ...fields, unitsPerPack: 0 },
    { ...fields, price: -1 },
    { ...fields, minimumOrderQuantity: 1.5 },
    { ...fields, options: { size: "" } },
  ]) {
    await assert.rejects(
      saveProductResource(ids[0], "variants", "POST", input),
      (error) => error.status === 400
    )
  }
  assert.equal(calls.length, 4)
})

test("product tax assignment attaches and removes a rate without deleting the tax definition", async (t) => {
  const calls = []
  mock(t, (url, options) => {
    calls.push({ url, options })
    return Response.json(envelope(options.method ? "OK" : []))
  })
  session.saveSession(fixtureUser, "fixture-access")
  await getProductResource(ids[0], "taxes")
  await saveProductResource(ids[0], "taxes", "POST", { tax: ids[2] })
  await deleteProductResource(ids[0], "taxes", ids[2])
  assert.equal(calls[1].url.pathname, "/getty/v1/product/products/taxes")
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    product: ids[0],
    tax: ids[2],
  })
  assert.equal(
    calls[2].url.pathname,
    `/getty/v1/product/products/${ids[0]}/taxes/${ids[2]}`
  )
  await assert.rejects(
    saveProductResource(ids[0], "taxes", "PATCH", { tax: ids[2] }),
    (error) => error.status === 400
  )
  assert.equal(calls.length, 3)
})

test("ordinary product editing cannot submit review fields or a different product ID", async (t) => {
  const fields = {
    name: "Gloves",
    brand: "Fixture",
    category: ids[1],
    description: "Nitrile gloves",
    currency: "NGN",
    price: 100,
    quantity: 0,
  }
  mock(t, (url, options) => {
    assert.equal(url.pathname, "/getty/v1/product/products")
    assert.equal(options.method, "PATCH")
    assert.deepEqual(JSON.parse(options.body), { id: ids[0], ...fields })
    return Response.json(envelope("OK"))
  })
  session.saveSession({ ...fixtureUser, role: "supplier" }, "fixture-access")
  await saveProductOverview(ids[0], {
    ...fields,
    id: ids[3],
    status: "approved",
    reviewed: "now",
    reviewer: ids[3],
  })
})

test("vendor draft creation sends the selected status and later submission sends pending", async (t) => {
  const calls = []
  mock(t, (url, options) => {
    calls.push({
      url: url.pathname,
      method: options.method,
      body: JSON.parse(options.body),
    })
    return Response.json(envelope("OK"))
  })
  session.saveSession({ ...fixtureUser, role: "supplier" }, "fixture-access")
  const fields = {
    name: "Gloves",
    category: ids[1],
    description: "Nitrile gloves",
    currency: "NGN",
    price: 100,
    quantity: 8,
  }
  await changePortalRecord("products", "POST", { ...fields, status: "draft" })
  await changePortalRecord("products", "POST", { ...fields, status: "pending" })
  await saveProductOverview(ids[0], { ...fields, brand: "" }, "draft")
  await submitManagedProductForReview({
    product: {
      id: ids[0],
      name: fields.name,
      brand: "",
      category: fields.category,
      description: fields.description,
      currency: "NGN",
      status: "draft",
    },
    category: { id: ids[1], name: "Supplies" },
    detail: null,
    variants: [{ id: ids[2], isDefault: true, price: 100, quantity: 8 }],
    specifications: [],
    taxes: [],
    certificates: [],
  })
  assert.deepEqual(calls, [
    {
      url: "/getty/v1/product/products",
      method: "POST",
      body: { ...fields, status: "draft" },
    },
    {
      url: "/getty/v1/product/products",
      method: "POST",
      body: { ...fields, status: "pending" },
    },
    {
      url: "/getty/v1/product/products",
      method: "PATCH",
      body: { id: ids[0], ...fields, brand: "", status: "draft" },
    },
    {
      url: "/getty/v1/product/products",
      method: "PATCH",
      body: { id: ids[0], ...fields, brand: "", status: "pending" },
    },
  ])
})

test("admin product approval posts the selected product ID to the review endpoint", async (t) => {
  mock(t, (url, options) => {
    assert.equal(url.pathname, "/getty/v1/product/reviews/approve")
    assert.equal(options.method, "POST")
    assert.deepEqual(JSON.parse(options.body), { id: ids[0] })
    assert.equal(options.headers.get("Authorization"), "Bearer fixture-access")
    return Response.json(envelope("OK"))
  })
  session.saveSession({ ...fixtureUser, role: "admin" }, "fixture-access")
  await approveManagedProduct(ids[0])
})

const signedPhotoUpload = (file, name, mime = "image/webp") => ({
  file,
  provider: "rustfs",
  bucket: "getty-bucket",
  object: `${ids[0]}/2026/10/07/${file}/${name}`,
  method: "PUT",
  url: `https://storage.example.test/getty-bucket/${ids[0]}/2026/10/07/${file}/${name}?X-Amz-SignedHeaders=content-type%3Bhost&X-Amz-Signature=fixture`,
  headers: { "content-type": mime },
  expiresAt: "2026-10-07T11:10:11.672601743",
  deadline: "2026-10-07T11:25:11.416718",
  status: "created",
})

test("product uploads accept the returned file identifier and signed storage target", () => {
  const response = signedPhotoUpload(ids[1], "3.webp")
  const expected = {
    id: ids[1],
    url: response.url,
    method: "PUT",
    headers: { "content-type": "image/webp" },
    fields: {},
  }
  assert.deepEqual(productPhotoUploadTarget(response), expected)
  assert.deepEqual(productPhotoUploadTarget(envelope(response)), expected)
})

test("incomplete or invalid storage targets cannot advance a product upload", () => {
  const response = signedPhotoUpload(ids[1], "3.webp")
  for (const invalid of [
    { ...response, file: null },
    { ...response, file: "" },
    { ...response, url: null },
    { ...response, url: "invalid-url" },
    { ...response, url: "http://storage.example.test/image" },
    { ...response, method: "DELETE" },
  ])
    assert.throws(
      () => productPhotoUploadTarget(envelope(invalid)),
      (error) => error instanceof GettyApiError && error.status === 502
    )
})

test("product photo staging uses the documented upload and attachment requests", async (t) => {
  const calls = []
  mock(t, (url, options) => {
    calls.push({
      url: url.pathname,
      method: options.method,
      body: JSON.parse(options.body),
    })
    return Response.json(envelope("OK"))
  })
  session.saveSession({ ...fixtureUser, role: "supplier" }, "fixture-access")
  await createProductPhotoUpload({
    name: "gloves-front.jpg",
    mime: "image/jpeg",
    extension: "jpg",
    size: 1024,
  })
  await attachProductPhotos(ids[0], [ids[1]])
  assert.deepEqual(calls, [
    {
      url: "/getty/v1/attachments/files",
      method: "POST",
      body: {
        name: "gloves-front.jpg",
        mime: "image/jpeg",
        extension: "jpg",
        size: 1024,
      },
    },
    {
      url: "/getty/v1/product/products/photos",
      method: "POST",
      body: { product: ids[0], files: [ids[1]] },
    },
  ])
})

test("the supplied upload response sends the raw image before attaching data.file", async (t) => {
  const response = signedPhotoUpload(ids[1], "3.webp")
  const image = new File(["webp image"], "3.webp", { type: "image/webp" })
  const calls = []
  mock(t, (url, options) => {
    assert.equal(options.headers.get("Authorization"), "Bearer fixture-access")
    if (url.pathname === "/getty/v1/attachments/files") {
      calls.push("prepare")
      assert.deepEqual(JSON.parse(options.body), {
        name: image.name,
        mime: image.type,
        extension: "webp",
        size: image.size,
      })
      return Response.json(envelope(response))
    }
    assert.equal(url.pathname, "/getty/v1/product/products/photos")
    calls.push("attach")
    assert.deepEqual(JSON.parse(options.body), {
      product: ids[0],
      files: [response.file],
    })
    return Response.json(envelope("OK"))
  })
  session.saveSession({ ...fixtureUser, role: "supplier" }, "fixture-access")
  const signed = t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push("upload")
    assert.equal(url, response.url)
    assert.equal(options.method, response.method)
    assert.deepEqual(options.headers, response.headers)
    assert.equal(options.credentials, "omit")
    assert.equal(options.body, image)
    return new Response(null, { status: 200 })
  })
  assert.equal(await uploadProductImage(ids[0], image), response.file)
  assert.equal(signed.mock.calls.length, 1)
  assert.deepEqual(calls, ["prepare", "upload", "attach"])
})

test("a signed product image upload completes before its file is attached", async (t) => {
  const calls = []
  mock(t, (url, options) => {
    calls.push({
      path: url.pathname,
      method: options.method,
      body: options.body,
    })
    if (url.pathname === "/getty/v1/attachments/files")
      return Response.json(
        envelope({
          id: ids[1],
          upload: {
            url: "https://uploads.example.test/product-image",
            method: "PUT",
          },
        })
      )
    assert.equal(url.pathname, "/getty/v1/product/products/photos")
    assert.deepEqual(JSON.parse(options.body), {
      product: ids[0],
      files: [ids[1]],
    })
    return Response.json(envelope("OK"))
  })
  session.saveSession({ ...fixtureUser, role: "supplier" }, "fixture-access")
  const signed = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://uploads.example.test/product-image")
    assert.equal(options.method, "PUT")
    assert.equal(options.headers["Content-Type"], "image/png")
    assert.equal(options.headers.Authorization, undefined)
    return new Response(null, { status: 200 })
  })
  await uploadProductImage(
    ids[0],
    new File(["image data"], "front.png", { type: "image/png" })
  )
  assert.equal(signed.mock.calls.length, 1)
  assert.deepEqual(
    calls.map((call) => call.path),
    ["/getty/v1/attachments/files", "/getty/v1/product/products/photos"]
  )
})

test("batch image uploads attach together and retries reuse completed files", async (t) => {
  const calls = []
  const uploadedFiles = new Map()
  const files = [
    new File(["front"], "front.png", { type: "image/png" }),
    new File(["back"], "back.png", { type: "image/png" }),
  ]
  mock(t, (url, options) => {
    const body = JSON.parse(options.body)
    if (url.pathname === "/getty/v1/attachments/files") {
      calls.push(`prepare:${body.name}`)
      return Response.json(
        envelope(
          signedPhotoUpload(
            body.name === "front.png" ? ids[1] : ids[2],
            body.name,
            body.mime
          )
        )
      )
    }
    calls.push("attach")
    assert.deepEqual(body, { product: ids[0], files: [ids[1], ids[2]] })
    return Response.json(envelope("OK"))
  })
  session.saveSession({ ...fixtureUser, role: "supplier" }, "fixture-access")
  let failBack = true
  t.mock.method(globalThis, "fetch", async (url) => {
    const name = new URL(url).pathname.split("/").at(-1)
    calls.push(`upload:${name}`)
    if (name === "back.png" && failBack) {
      failBack = false
      return new Response(null, { status: 503 })
    }
    return new Response(null, { status: 200 })
  })
  await assert.rejects(
    uploadProductImages(ids[0], files, { uploadedFiles }),
    (error) => error.status === 503
  )
  assert.equal(uploadedFiles.size, 1)
  assert.equal(calls.includes("attach"), false)
  const progress = []
  assert.deepEqual(
    await uploadProductImages(ids[0], files, {
      uploadedFiles,
      onProgress: (completed, total) => progress.push([completed, total]),
    }),
    [ids[1], ids[2]]
  )
  assert.deepEqual(calls, [
    "prepare:front.png",
    "upload:front.png",
    "prepare:back.png",
    "upload:back.png",
    "prepare:back.png",
    "upload:back.png",
    "attach",
  ])
  assert.deepEqual(progress, [
    [0, 2],
    [1, 2],
    [2, 2],
  ])
})

test("selection only initiates images; confirmation and retries reuse their prepared storage URLs", async (t) => {
  const files = [
    new File(["front"], "front.png", { type: "image/png" }),
    new File(["back"], "back.png", { type: "image/png" }),
  ]
  const targets = files.map((file, index) =>
    signedPhotoUpload(ids[index + 1], file.name, file.type)
  )
  const calls = []
  const uploadedFiles = new Map()
  mock(t, (url, options) => {
    const body = JSON.parse(options.body)
    if (url.pathname === "/getty/v1/attachments/files") {
      const index = files.findIndex((file) => file.name === body.name)
      assert.deepEqual(body, {
        name: files[index].name,
        mime: files[index].type,
        extension: "png",
        size: files[index].size,
      })
      calls.push(`prepare:${body.name}`)
      return Response.json(envelope(targets[index]))
    }
    assert.equal(url.pathname, "/getty/v1/product/products/photos")
    assert.equal(uploadedFiles.size, 2)
    assert.deepEqual(body, { product: ids[0], files: [ids[1], ids[2]] })
    calls.push("attach")
    return Response.json(envelope("OK"))
  })
  session.saveSession({ ...fixtureUser, role: "supplier" }, "fixture-access")
  let failBack = true
  const storage = t.mock.method(globalThis, "fetch", async (url, options) => {
    const index = targets.findIndex((target) => target.url === url)
    assert.notEqual(index, -1)
    assert.equal(options.method, "PUT")
    assert.equal(options.body, files[index])
    assert.deepEqual(options.headers, targets[index].headers)
    assert.equal(options.credentials, "omit")
    calls.push(`upload:${files[index].name}`)
    if (index === 1 && failBack) {
      failBack = false
      return new Response(null, { status: 503 })
    }
    return new Response(null, { status: 200 })
  })
  const preparedUploads = new Map(
    await Promise.all(
      files.map(async (file) => [file, await prepareProductImageUpload(file)])
    )
  )
  assert.equal(storage.mock.calls.length, 0)
  assert.deepEqual(calls, ["prepare:front.png", "prepare:back.png"])

  await assert.rejects(
    uploadProductImages(ids[0], files, { preparedUploads, uploadedFiles }),
    (error) => error.status === 503
  )
  assert.equal(uploadedFiles.size, 1)
  assert.equal(calls.includes("attach"), false)
  assert.deepEqual(
    await uploadProductImages(ids[0], files, {
      preparedUploads,
      uploadedFiles,
    }),
    [ids[1], ids[2]]
  )
  assert.deepEqual(calls, [
    "prepare:front.png",
    "prepare:back.png",
    "upload:front.png",
    "upload:back.png",
    "upload:back.png",
    "attach",
  ])
})

test("confirmation with an unprepared image cannot initiate or partially upload the selection", async (t) => {
  mock(t, () => assert.fail("Confirmation must not initiate missing uploads"))
  t.mock.method(globalThis, "fetch", () =>
    assert.fail("No storage upload before every image is ready")
  )
  session.saveSession({ ...fixtureUser, role: "supplier" }, "fixture-access")
  const files = [
    new File(["front"], "front.png", { type: "image/png" }),
    new File(["back"], "back.png", { type: "image/png" }),
  ]
  const preparedUploads = new Map([
    [
      files[0],
      productPhotoUploadTarget(
        signedPhotoUpload(ids[1], "front.png", "image/png")
      ),
    ],
  ])
  await assert.rejects(
    uploadProductImages(ids[0], files, { preparedUploads }),
    (error) => error.status === 400 && /not ready/.test(error.message)
  )
})

test("product resource errors retain server messages and malformed lists never appear empty", async (t) => {
  mock(t, (url, options) =>
    Response.json(
      envelope(
        options.method
          ? [{ status: "error", message: "The specification already exists." }]
          : { unexpected: [] }
      )
    )
  )
  session.saveSession(fixtureUser, "fixture-access")
  await assert.rejects(
    saveProductResource(ids[0], "specifications", "POST", {
      name: "Material",
      value: "Nitrile",
      unit: null,
      ordinal: 0,
    }),
    (error) =>
      error.status === 422 &&
      error.message === "The specification already exists."
  )
  await assert.rejects(
    getProductResource(ids[0], "specifications"),
    (error) => error.status === 502
  )
})

test("profile creation handles the supplied error envelope even if HTTP status is 200", async (t) => {
  mock(t, (url, options) => {
    assert.equal(url.pathname, "/getty/v1/tenant/profile")
    assert.equal(options.method, "POST")
    assert.equal(JSON.parse(options.body).role, "operations")
    return Response.json({
      status: 405,
      error: "Method Not Allowed",
      path: "/getty/v1/tenant/profile",
    })
  })
  session.saveSession(fixtureUser, "fixture-access")
  await assert.rejects(
    createTenantAccount("profile", {
      name: "Fixture Team",
      email: "team@example.test",
      role: "operations",
    }),
    (error) => error.status === 405 && error.message === "Method Not Allowed"
  )
})

test("account creation validates input and documented successful response envelopes", async (t) => {
  let incomplete = false
  mock(t, (url, options) => {
    assert.equal(options.method, "POST")
    if (incomplete)
      return Response.json({ status: 201, success: true, message: "OK" })
    return Response.json(
      {
        ...envelope(
          url.pathname.endsWith("vendor")
            ? { tenant: ids[0], status: "onboarded" }
            : null
        ),
        status: 201,
      },
      { status: 201 }
    )
  })
  session.saveSession(fixtureUser, "fixture-access")
  const vendor = {
    name: "Fixture Vendor",
    email: "vendor@example.test",
    phone: "08000000000",
    profile: "Fixture Admin",
    country: "NG",
  }
  const profile = {
    name: "Fixture Team",
    email: "team@example.test",
    role: "operations",
  }
  assert.equal((await createTenantAccount("vendor", vendor)).status, 201)
  assert.equal((await createTenantAccount("profile", profile)).status, 201)
  await assert.rejects(
    createTenantAccount("profile", { ...profile, role: "unknown" }),
    (error) => error.status === 400
  )
  incomplete = true
  await assert.rejects(
    createTenantAccount("vendor", vendor),
    (error) => error.status === 502
  )
})

test("password recovery accepts the documented six-digit OTP without dropping leading zeros", () => {
  const { verifyPasswordResetOtpSchema } = load(
    "features/auth/schemas/password-reset-schema.ts"
  )
  const input = {
    reference: ids[0],
    otp: "001234",
  }
  assert.equal(verifyPasswordResetOtpSchema.parse(input).otp, "001234")
  assert.equal(
    verifyPasswordResetOtpSchema.safeParse({ ...input, otp: "1234" }).success,
    false
  )
})

test("password recovery requests encode the username and remain public for signed-in users", async (t) => {
  const now = Date.UTC(2026, 9, 7, 9, 44)
  t.mock.method(Date, "now", () => now)
  mock(t, (url, options) => {
    assert.equal(
      url.pathname,
      "/getty/account/v1/password/reset/buyer%2Brecovery%40example.test"
    )
    assert.equal(options.method, "POST")
    assert.equal(options.headers.has("Authorization"), false)
    assert.equal(options.credentials, "omit")
    assert.equal(options.body, undefined)
    return Response.json(envelope({ reference: ids[0] }))
  })
  session.saveSession(fixtureUser, {
    accessToken: "existing-token",
    refreshToken: "existing-refresh",
  })
  const existing = session.syncSession()
  const result = await requestPasswordResetOtp({
    email: " buyer+recovery@example.test ",
  })
  assert.deepEqual(result, {
    reference: ids[0],
    expiresAt: null,
    resendAt: now + 300_000,
  })
  assert.equal(session.syncSession().sessionId, existing.sessionId)
})

test("password recovery uses the supplied absolute expiresAt for expiry and resend and accepts a direct reference", async (t) => {
  const now = Date.UTC(2026, 9, 7, 9, 44)
  const expiresAt = Date.UTC(2026, 9, 7, 9, 46)
  t.mock.method(Date, "now", () => now)
  let direct = false
  mock(t, () =>
    Response.json(
      direct
        ? ids[1]
        : envelope({
            reference: ids[0],
            ttl: 120,
            expiresAt: "2026-10-07T09:46:00Z",
          })
    )
  )
  assert.deepEqual(
    await requestPasswordResetOtp({ email: "buyer@example.test" }),
    { reference: ids[0], expiresAt, resendAt: expiresAt }
  )
  direct = true
  assert.deepEqual(
    await requestPasswordResetOtp({ email: "buyer@example.test" }),
    { reference: ids[1], expiresAt: null, resendAt: now + 300_000 }
  )
})

test("password recovery starts a five-minute resend delay when expiresAt is missing, null or blank, even with ttl", async (t) => {
  let now = Date.UTC(2026, 9, 7, 9, 44)
  t.mock.method(Date, "now", () => now)
  let responseExpiry
  mock(t, () =>
    Response.json(
      envelope({ reference: ids[0], ttl: 120, expiresAt: responseExpiry })
    )
  )
  for (const emptyExpiry of [undefined, null, "", "   "]) {
    responseExpiry = emptyExpiry
    const result = await requestPasswordResetOtp({
      email: "buyer@example.test",
    })
    assert.deepEqual(result, {
      reference: ids[0],
      expiresAt: null,
      resendAt: now + 300_000,
    })
    // A later successful resend starts its own delay from that response.
    now += 300_000
  }
})

test("password recovery respects time zone offsets and elapsed server deadlines instead of restarting the resend delay", async (t) => {
  const now = Date.UTC(2026, 9, 7, 9, 46)
  const expiresAt = Date.UTC(2026, 9, 7, 9, 45)
  t.mock.method(Date, "now", () => now)
  mock(t, () =>
    Response.json(
      envelope({
        reference: ids[0],
        ttl: 120,
        expiresAt: "2026-10-07T10:45:00+01:00",
      })
    )
  )
  const result = await requestPasswordResetOtp({ email: "buyer@example.test" })
  assert.deepEqual(result, {
    reference: ids[0],
    expiresAt,
    resendAt: expiresAt,
  })
  assert.ok(result.resendAt <= now)
})

test("recovery verification sends the entered OTP and retains the returned reference and OTP with leading zeros", async (t) => {
  mock(t, (url, options) => {
    assert.equal(url.pathname, "/getty/account/v1/password/reset/verify")
    assert.equal(options.method, "POST")
    assert.equal(options.headers.has("Authorization"), false)
    assert.equal(options.credentials, "omit")
    assert.deepEqual(JSON.parse(options.body), {
      reference: ids[0],
      otp: "001234",
    })
    return Response.json(envelope({ reference: ids[1], otp: "009876" }))
  })
  assert.deepEqual(
    await verifyPasswordResetOtp({ reference: ids[0], otp: "001234" }),
    { reference: ids[1], otp: "009876" }
  )
})

test("password recovery forwards the new verification reference and OTP to password confirmation", async (t) => {
  const requests = []
  mock(t, (url, options) => {
    requests.push(url.pathname)
    assert.equal(options.headers.has("Authorization"), false)
    assert.equal(options.credentials, "omit")
    if (
      url.pathname === "/getty/account/v1/password/reset/buyer%40example.test"
    ) {
      assert.equal(options.method, "POST")
      return Response.json(envelope({ reference: ids[0], expiresAt: null }))
    }
    if (url.pathname === "/getty/account/v1/password/reset/verify") {
      assert.equal(options.method, "POST")
      assert.deepEqual(JSON.parse(options.body), {
        reference: ids[0],
        otp: "001234",
      })
      return Response.json(envelope({ reference: ids[1], otp: "009876" }))
    }
    assert.equal(url.pathname, "/getty/account/v1/password/reset/confirm")
    assert.equal(options.method, "PATCH")
    assert.deepEqual(JSON.parse(options.body), {
      reference: ids[1],
      otp: "009876",
      password: "PasswordX3",
    })
    return Response.json(envelope(null))
  })
  const challenge = await requestPasswordResetOtp({
    email: "buyer@example.test",
  })
  const verified = await verifyPasswordResetOtp({
    reference: challenge.reference,
    otp: "001234",
  })
  await resetPassword({
    reference: verified.reference,
    otp: verified.otp,
    password: "PasswordX3",
    confirmPassword: "PasswordX3",
  })
  assert.deepEqual(requests, [
    "/getty/account/v1/password/reset/buyer%40example.test",
    "/getty/account/v1/password/reset/verify",
    "/getty/account/v1/password/reset/confirm",
  ])
})

test("recovery verification rejects missing or invalid returned OTPs instead of reusing the entered code", async (t) => {
  let returned
  let requests = 0
  mock(t, (url) => {
    assert.equal(url.pathname, "/getty/account/v1/password/reset/verify")
    requests++
    return Response.json(envelope(returned))
  })
  const invalidResponses = [
    { reference: ids[1] },
    { reference: ids[1], otp: null },
    { reference: ids[1], otp: "" },
    { reference: ids[1], otp: "1234" },
    { reference: ids[1], otp: "abcdef" },
    { reference: ids[1], otp: 123456 },
    { reference: "", otp: "009876" },
  ]
  for (const response of invalidResponses) {
    returned = response
    await assert.rejects(
      verifyPasswordResetOtp({ reference: ids[0], otp: "001234" }),
      (error) =>
        error.status === 502 && /verification details/.test(error.message)
    )
  }
  assert.equal(requests, invalidResponses.length)
})

test("recovery completion uses the confirmed PATCH endpoint and exact public reference/OTP/password payload", async (t) => {
  mock(t, (url, options) => {
    assert.equal(url.pathname, "/getty/account/v1/password/reset/confirm")
    assert.equal(options.method, "PATCH")
    assert.equal(options.headers.has("Authorization"), false)
    assert.equal(options.headers.get("Content-Type"), "application/json")
    assert.equal(options.credentials, "omit")
    assert.deepEqual(JSON.parse(options.body), {
      reference: ids[1],
      otp: "001234",
      password: "PasswordX3",
    })
    return Response.json(envelope(null))
  })
  session.saveSession(fixtureUser, {
    accessToken: "existing-token",
    refreshToken: "existing-refresh",
  })
  const existing = session.syncSession()
  await resetPassword({
    reference: ids[1],
    otp: "001234",
    password: "PasswordX3",
    confirmPassword: "PasswordX3",
  })
  assert.equal(session.syncSession().sessionId, existing.sessionId)
})

test("recovery rejects invalid references, OTPs and mismatched passwords before making requests", async (t) => {
  let calls = 0
  mock(t, () => {
    calls++
    return Response.json(envelope(null))
  })
  const input = {
    reference: ids[0],
    otp: "001234",
    password: "PasswordX3",
    confirmPassword: "PasswordX3",
  }
  await assert.rejects(resetPassword({ ...input, reference: "" }))
  await assert.rejects(resetPassword({ ...input, otp: "1234" }))
  await assert.rejects(
    verifyPasswordResetOtp({ reference: ids[0], otp: "1234" })
  )
  await assert.rejects(
    resetPassword({ ...input, confirmPassword: "MismatchX3" })
  )
  assert.equal(calls, 0)
})

test("recovery completion accepts a backend 204 without requiring sign-in", async (t) => {
  mock(t, (url, options) => {
    assert.equal(url.pathname, "/getty/account/v1/password/reset/confirm")
    assert.equal(options.method, "PATCH")
    assert.equal(options.headers.has("Authorization"), false)
    assert.equal(options.credentials, "omit")
    return new Response(null, { status: 204 })
  })
  assert.equal(
    await resetPassword({
      reference: ids[0],
      otp: "001234",
      password: "PasswordX3",
      confirmPassword: "PasswordX3",
    }),
    undefined
  )
  assert.equal(session.syncSession().user, null)
})

test("recovery completion surfaces backend errors without reporting success or renewing the session", async (t) => {
  let httpStatus = 400
  mock(t, (url, options) => {
    assert.equal(url.pathname, "/getty/account/v1/password/reset/confirm")
    assert.equal(options.method, "PATCH")
    assert.equal(options.headers.has("Authorization"), false)
    return Response.json(
      { status: 400, success: false, message: "The reset code has expired." },
      { status: httpStatus }
    )
  })
  const input = {
    reference: ids[0],
    otp: "001234",
    password: "PasswordX3",
    confirmPassword: "PasswordX3",
  }
  for (const status of [400, 200]) {
    httpStatus = status
    await assert.rejects(
      resetPassword(input),
      (error) =>
        error.status === 400 && error.message === "The reset code has expired."
    )
  }
})

test("recovery rejects missing references and surfaces backend verification errors without renewing", async (t) => {
  let rejectOtp = false
  mock(t, (url, options) => {
    assert.equal(
      url.pathname.startsWith("/getty/account/v1/password/reset/"),
      true
    )
    assert.equal(options.headers.has("Authorization"), false)
    return rejectOtp
      ? Response.json(
          {
            status: 401,
            success: false,
            message: "The code is invalid or expired.",
          },
          { status: 401 }
        )
      : Response.json(envelope({}))
  })
  await assert.rejects(
    requestPasswordResetOtp({ email: "buyer@example.test" }),
    (error) => error.status === 502
  )
  await assert.rejects(
    verifyPasswordResetOtp({ reference: ids[0], otp: "001234" }),
    (error) => error.status === 502
  )
  session.saveSession(fixtureUser, {
    accessToken: "existing-token",
    refreshToken: "existing-refresh",
  })
  const existing = session.syncSession()
  rejectOtp = true
  await assert.rejects(
    verifyPasswordResetOtp({ reference: ids[0], otp: "001234" }),
    (error) =>
      error.status === 401 &&
      error.message === "The code is invalid or expired."
  )
  assert.equal(session.syncSession().sessionId, existing.sessionId)
})

test("stored recovery challenges require live references and allow an unspecified server expiry", () => {
  const { passwordRecoveryChallengeSchema } = load(
    "features/auth/schemas/password-reset-schema.ts"
  )
  const challenge = {
    email: "buyer@example.test",
    reference: ids[0],
    expiresAt: null,
    resendAt: Date.now() + 60000,
  }
  assert.equal(
    passwordRecoveryChallengeSchema.safeParse(challenge).success,
    true
  )
  assert.equal(
    passwordRecoveryChallengeSchema.safeParse({
      email: challenge.email,
      challengeId: "old-mock-id",
      maskedEmail: "b***@example.test",
      expiresAt: Date.now(),
      resendAt: Date.now(),
    }).success,
    false
  )
})

test("the management product list preserves filters and nextCursor/previousCursor pagination", async (t) => {
  mock(t, (url) => {
    assert.equal(url.pathname, "/getty/v1/product/products")
    assert.equal(url.searchParams.get("category"), ids[0])
    assert.equal(url.searchParams.get("search"), "gloves")
    assert.equal(url.searchParams.get("cursor"), "20")
    return Response.json(
      envelope({
        records: [{ id: ids[1], name: "Gloves", price: 1250 }],
        isNext: true,
        nextCursor: 10,
        isPrevious: true,
        previousCursor: 30,
      })
    )
  })
  session.saveSession(fixtureUser, "fixture-access")
  const result = await portalRecords(
    "products",
    `?category=${ids[0]}&search=gloves&cursor=20&navigation=next`
  )
  assert.equal(result.records[0].name, "Gloves")
  assert.equal(result.nextCursor, "10")
  assert.equal(result.previousCursor, "30")
})

test("fresh login survives a background resource rejection and failed refresh", async (t) => {
  const calls = []
  mock(t, (url) => {
    calls.push(url.pathname)
    if (url.pathname === "/auth/getty/login")
      return Response.json({
        ...envelope({
          name: "Fixture Operations",
          email: "ops@example.test",
          role: "admin",
          type: "support",
        }),
        tokens: tokenPair,
      })
    return expiredResponse()
  })
  await login("ops@example.test", "FixturePassword1!")
  const original = session.readSession()
  await assert.rejects(liveCart(), (error) => error.status === 403)
  assert.deepEqual(calls, ["/auth/getty/login"])
  await assert.rejects(
    apiRequest("/getty/v1/product/products"),
    (error) => error.status === 401
  )
  assert.equal(session.readSession().sessionId, original.sessionId)
  assert.deepEqual(session.readSession().user, original.user)
  assert.equal(session.readSession().accessToken, tokenPair.accessToken)
  assert.equal(session.readSession().refreshToken, tokenPair.refreshToken)
  assert.equal(session.readSession().refreshRejected, true)
})

test("rejected renewal is not retried on navigation or restored browser sessions", async (t) => {
  let refreshes = 0
  mock(t, (url) => {
    if (url.pathname === refreshPath) refreshes++
    return expiredResponse()
  })
  session.saveSession(fixtureUser, tokenPair)
  await assert.rejects(
    apiRequest("/getty/v1/order/cart"),
    (error) => error.status === 401
  )
  await assert.rejects(
    apiRequest("/getty/v1/product/products"),
    (error) => error.status === 401
  )
  await assert.rejects(
    apiRequest("/getty/v1/product/categories"),
    (error) => error.status === 401
  )
  assert.equal(refreshes, 1)
  const restored = reloadSessionStore(t)
  assert.equal(restored.readSession().refreshRejected, true)
  assert.equal(restored.readSession().user.id, fixtureUser.id)
})

test("signing in again resets rejected renewal so new credentials can refresh", async (t) => {
  let allow = false,
    refreshes = 0
  mock(t, (url, options) => {
    if (url.pathname === refreshPath) {
      refreshes++
      return allow ? renewedResponse() : expiredResponse()
    }
    return options.headers.get("Authorization") === "Bearer fixture-renewed"
      ? Response.json(envelope([]))
      : expiredResponse()
  })
  session.saveSession(fixtureUser, tokenPair)
  await assert.rejects(
    apiRequest("/getty/v1/order/cart"),
    (error) => error.status === 401
  )
  assert.equal(session.readSession().refreshRejected, true)
  allow = true
  session.saveSession(fixtureUser, tokenPair)
  assert.equal(session.readSession().refreshRejected, false)
  await apiRequest("/getty/v1/order/cart")
  assert.equal(refreshes, 2)
  assert.equal(session.accessToken(), "fixture-renewed")
})

test("another tab's refresh rejection is synchronized without losing the account", (t) => {
  mock(t, () => {
    throw new Error("No network request expected")
  })
  session.saveSession(fixtureUser, tokenPair)
  const record = JSON.parse(storage.get(session.SESSION_STORAGE_KEY))
  storage.set(
    session.SESSION_STORAGE_KEY,
    JSON.stringify({ ...record, refreshRejected: true })
  )
  storageEvent()
  assert.equal(session.readSession().refreshRejected, true)
  assert.equal(session.readSession().sessionId, record.sessionId)
  assert.equal(session.readSession().user.id, fixtureUser.id)
  assert.equal(
    session.updateSessionTokens(session.readSession(), rotatedPair),
    true
  )
  assert.equal(session.readSession().refreshRejected, false)
})

test("an older refresh rejection cannot mark a new login as needing reauthentication", (t) => {
  mock(t, () => {
    throw new Error("No network request expected")
  })
  session.saveSession(fixtureUser, tokenPair)
  const original = session.readSession()
  session.saveSession({ ...fixtureUser, id: "another-buyer" }, rotatedPair)
  assert.equal(session.markRefreshRejected(original), false)
  assert.equal(session.readSession().refreshRejected, false)
})

test("the buyer cart blocks staff and vendors locally while remaining available to consumers", async (t) => {
  let calls = 0
  mock(t, () => {
    calls++
    return Response.json(envelope(cart))
  })
  assert.equal(canUseBuyerCart(null), false)
  for (const role of ["admin", "supplier"]) {
    const user = { ...fixtureUser, role }
    session.saveSession(user, tokenPair)
    assert.equal(canUseBuyerCart(user), false)
    await assert.rejects(liveCart(), (error) => error.status === 403)
    await assert.rejects(liveCart("DELETE"), (error) => error.status === 403)
    assert.equal(session.readSession().user.role, role)
  }
  assert.equal(calls, 0)
  session.saveSession(fixtureUser, tokenPair)
  assert.equal(canUseBuyerCart(fixtureUser), true)
  assert.equal((await liveCart()).items.length, 1)
  assert.equal(calls, 1)
})

test("guest bag items survive locally and merge once into the customer cart after sign-in", async (t) => {
  const previousDispatch = window.dispatchEvent
  window.dispatchEvent = () => true
  t.after(() => {
    window.dispatchEvent = previousDispatch
  })
  const guestItem = {
    productId: ids[0],
    variantId: ids[2],
    quantity: 5,
    minimum: 2,
    product: {
      id: ids[0],
      name: "Gloves",
      slug: ids[0],
      description: "Box of 100",
      price: 100,
      image: "/images/product-placeholder.svg",
      category: { id: ids[1], name: "Consumables", slug: "consumables" },
      stock: 0,
      stockKnown: false,
      inStock: true,
      source: "remote",
      active: true,
      createdAt: "",
      variantId: ids[2],
    },
  }
  let merges = 0
  mock(t, (url, options) => {
    assert.equal(url.pathname.startsWith("/getty/v1/order/cart"), true)
    assert.equal(options.headers.get("Authorization"), "Bearer fixture-expired")
    if (options.method === "POST") {
      merges++
      assert.equal(url.pathname, "/getty/v1/order/cart/merge")
      const payload = JSON.parse(options.body)
      assert.deepEqual(payload.items, [{ variant: ids[2], quantity: 5 }])
      return Response.json(
        envelope({
          token: payload.token,
          replayed: false,
          results: [{ variant: ids[2], quantity: 5, status: "merged", resultingQuantity: 8 }],
          cart: { ...cart, items: [{ ...line, quantity: 8, subtotal: 800 }], subtotal: 800 },
        })
      )
    }
    return Response.json(
      envelope({
        ...cart,
        items: [
          { ...line, quantity: merges ? 8 : 3, subtotal: merges ? 800 : 300 },
        ],
        subtotal: merges ? 800 : 300,
      })
    )
  })
  window.localStorage.setItem(DEVICE_CART_KEY, JSON.stringify([guestItem]))
  assert.equal(deviceCart(readDeviceItems()).itemCount, 5)
  session.saveSession(fixtureUser, tokenPair)
  assert.equal((await loadBuyerCart()).items[0].quantity, 8)
  assert.deepEqual(readDeviceItems(), [])
  assert.equal((await loadBuyerCart()).items[0].quantity, 8)
  assert.equal(merges, 1)
})

test("reauthentication links preserve safe destinations without redirecting to login again", () => {
  const { reauthenticationHref } = load("lib/auth/navigation.ts")
  const url = new URL(
    reauthenticationHref("/admin/products?search=gloves"),
    "https://getty.invalid"
  )
  assert.equal(url.pathname, "/login")
  assert.equal(url.searchParams.get("reauthenticate"), "1")
  assert.equal(
    url.searchParams.get("redirect"),
    "/admin/products?search=gloves"
  )
  for (const path of ["/login", "//outside.example", "https://outside.example"])
    assert.equal(reauthenticationHref(path), "/login?reauthenticate=1")
})

test("cookie-only renewal persists the profile, drops the stale bearer and survives reload", async (t) => {
  let refreshes = 0
  mock(t, (url, options) => {
    assert.equal(options.credentials, "include")
    if (url.pathname === refreshPath) {
      refreshes++
      assert.equal(options.headers.has("Authorization"), false)
      assert.deepEqual(JSON.parse(options.body), {})
      return Response.json(envelope(null))
    }
    if (options.headers.has("Authorization")) return expiredResponse()
    return Response.json(envelope(cart))
  })
  session.saveSession(fixtureUser, tokenPair)
  const before = session.readSession()
  await apiRequest("/getty/v1/order/cart")
  await apiRequest("/getty/v1/inventory/stocks")
  assert.equal(refreshes, 1)
  assert.equal(session.readSession().sessionId, before.sessionId)
  assert.equal(session.readSession().authMode, "cookie")
  assert.equal(session.readSession().accessToken, null)
  assert.equal(session.readSession().credentialVersion, 1)
  const restored = reloadSessionStore(t).readSession()
  assert.deepEqual(restored.user, fixtureUser)
  assert.equal(restored.authMode, "cookie")
  assert.equal(restored.refreshRejected, false)
})

test("empty successful refresh bodies are accepted while malformed responses preserve credentials", async (t) => {
  let response = new Response("<html>not a refresh response</html>", {
    status: 200,
  })
  mock(t, (url, options) => {
    if (url.pathname === refreshPath) return response
    return options.headers.has("Authorization")
      ? expiredResponse()
      : Response.json(envelope(cart))
  })
  session.saveSession(fixtureUser, tokenPair)
  await assert.rejects(
    apiRequest("/getty/v1/order/cart"),
    (error) => error.status === 502
  )
  assert.equal(session.accessToken(), tokenPair.accessToken)
  for (const status of [200, 204]) {
    session.saveSession(fixtureUser, tokenPair)
    response = new Response(null, { status })
    await apiRequest("/getty/v1/order/cart")
    assert.equal(session.readSession().authMode, "cookie")
  }
})

test("cookie renewal shares a queue across repeated expirations even without a JSON refresh token", async (t) => {
  let expired = true,
    refreshes = 0
  let finish = deferred(),
    started = deferred()
  mock(t, async (url) => {
    if (url.pathname === refreshPath) {
      refreshes++
      started.resolve()
      await finish.promise
      expired = false
      return new Response(null, { status: 200 })
    }
    if (url.pathname.endsWith("/catalog/categories"))
      return Response.json(envelope([]))
    return expired ? expiredResponse() : Response.json(envelope([]))
  })
  session.saveSession(fixtureUser, "fixture-access-with-server-cookies")
  for (let generation = 1; generation <= 2; generation++) {
    expired = true
    finish = deferred()
    started = deferred()
    const requests = [
      apiRequest("/getty/v1/order/cart"),
      apiRequest("/getty/v1/inventory/stocks"),
      apiRequest("/getty/ecommerce/catalog/categories", {}, "public"),
    ]
    await started.promise
    finish.resolve()
    await Promise.all(requests)
    assert.equal(refreshes, generation)
    assert.equal(session.readSession().credentialVersion, generation)
    assert.equal(session.readSession().authMode, "cookie")
  }
})

test("all queued requests stop after one cookie renewal when the replay still returns 401", async (t) => {
  let refreshes = 0,
    requests = 0
  const started = deferred(),
    finish = deferred()
  mock(t, async (url) => {
    if (url.pathname === refreshPath) {
      refreshes++
      started.resolve()
      await finish.promise
      return Response.json(envelope(null))
    }
    requests++
    return expiredResponse()
  })
  session.saveSession(fixtureUser, tokenPair)
  const results = Promise.allSettled([
    apiRequest("/getty/v1/order/cart"),
    apiRequest("/getty/v1/inventory/stocks"),
    apiRequest("/getty/v1/product/products"),
  ])
  await started.promise
  finish.resolve()
  for (const result of await results) {
    assert.equal(result.status, "rejected")
    assert.equal(result.reason.status, 401)
  }
  assert.equal(requests, 6)
  assert.equal(refreshes, 1)
  assert.equal(session.readSession().user.id, fixtureUser.id)
})

test("failed cookie renewal rejects every queued request without logging the user out", async (t) => {
  let refreshes = 0
  const started = deferred(),
    finish = deferred()
  mock(t, async (url) => {
    if (url.pathname === refreshPath) {
      refreshes++
      started.resolve()
      await finish.promise
    }
    return expiredResponse()
  })
  session.saveSession(fixtureUser, tokenPair)
  const results = Promise.allSettled([
    apiRequest("/getty/v1/order/cart"),
    apiRequest("/getty/v1/inventory/stocks"),
  ])
  await started.promise
  finish.resolve()
  assert.equal(
    (await results).every(
      (result) => result.status === "rejected" && result.reason.status === 401
    ),
    true
  )
  assert.equal(refreshes, 1)
  assert.equal(session.readSession().refreshRejected, true)
  assert.equal(session.readSession().user.id, fixtureUser.id)
})

test("HTTP 200 envelopes with status 401 also trigger the Axios renewal interceptor", async (t) => {
  let refreshes = 0
  mock(t, (url, options) => {
    if (url.pathname === refreshPath) {
      refreshes++
      return renewedResponse()
    }
    return options.headers.get("Authorization") ===
      `Bearer ${tokenPair.accessToken}`
      ? Response.json({ status: 401, success: false, message: "Expired" })
      : Response.json(envelope(cart))
  })
  session.saveSession(fixtureUser, tokenPair)
  await apiRequest("/getty/v1/order/cart")
  assert.equal(refreshes, 1)
  assert.equal(session.accessToken(), rotatedPair.accessToken)
})

test("cookie-authenticated logout still calls the backend and clears the local account first", async (t) => {
  mock(t, (url, options) => {
    assert.equal(url.pathname, "/auth/getty/logout")
    assert.equal(options.credentials, "include")
    assert.equal(options.headers.has("Authorization"), false)
    assert.deepEqual(JSON.parse(options.body), {})
    assert.equal(session.readSession().user, null)
    return new Response(null, { status: 204 })
  })
  session.saveSession(fixtureUser, tokenPair)
  session.updateSessionTokens(session.readSession())
  await logout()
  assert.equal(session.readSession().user, null)
})

test("a cookie-only rotation in another tab is reused before refresh and obsolete responses cannot overwrite it", async (t) => {
  const { refreshSession } = load("features/auth/api/refresh-session.ts")
  mock(t, () => {
    assert.fail("An already renewed cookie session must not call refresh again")
  })
  session.saveSession(fixtureUser, tokenPair)
  session.updateSessionTokens(session.readSession())
  const before = session.readSession()
  const record = JSON.parse(storage.get(session.SESSION_STORAGE_KEY))
  storage.set(
    session.SESSION_STORAGE_KEY,
    JSON.stringify({
      ...record,
      credentialVersion: record.credentialVersion + 1,
    })
  )
  storageEvent()
  const renewed = await refreshSession(before)
  assert.equal(renewed.authMode, "cookie")
  assert.equal(renewed.credentialVersion, 2)
  assert.equal(session.updateSessionTokens(before, tokenPair), false)
  assert.equal(session.markRefreshRejected(before), false)
  assert.equal(session.clearSession(before), false)
})

test("authentication endpoints and plain resource 403s never recursively refresh", async (t) => {
  const calls = []
  mock(t, (url) => {
    calls.push(url.pathname)
    return Response.json(
      { message: "Denied" },
      { status: url.pathname.startsWith("/auth/") ? 401 : 403 }
    )
  })
  session.saveSession(fixtureUser, tokenPair)
  for (const endpoint of [
    "/auth/getty/refresh",
    "/auth/getty/logout",
    "/getty/v1/product/products",
  ])
    await assert.rejects(apiRequest(endpoint), (error) =>
      [401, 403].includes(error.status)
    )
  assert.deepEqual(calls, [
    "/auth/getty/refresh",
    "/auth/getty/logout",
    "/getty/v1/product/products",
  ])
})

test("admin dashboard uses the authenticated endpoint and preserves zero totals", async (t) => {
  const data = {
    totalAccounts: 1,
    customers: 0,
    vendors: 1,
    totalProducts: 2,
    totalCategories: 24,
    pendingProductReviews: 0,
    orderTrend: [
      { month: "26-10", value: 0 },
      { month: "25-11", value: 0 },
    ],
    recentOrdersAwaitingAttention: [],
    recentProductsAwaitingApproval: [],
  }
  let calls = 0
  mock(t, (url, options) => {
    calls++
    assert.equal(url.pathname, "/getty/v1/dashboard")
    assert.equal(options.method, undefined)
    assert.equal(options.body, undefined)
    assert.equal(options.headers.get("Authorization"), "Bearer fixture-access")
    return Response.json(envelope(data))
  })
  await assert.rejects(getAdminDashboard(), (e) => e.status === 401)
  assert.equal(calls, 0)
  session.saveSession({ ...fixtureUser, role: "admin" }, "fixture-access")
  const result = await getAdminDashboard()
  assert.deepEqual(result, {
    ...data,
    orderTrend: [...data.orderTrend].reverse(),
  })
  assert.equal(calls, 1)
})

test("admin dashboard rejects incomplete totals instead of showing invented zeros", async (t) => {
  mock(t, () => Response.json(envelope({ totalAccounts: 1 })))
  session.saveSession({ ...fixtureUser, role: "admin" }, "fixture-access")
  await assert.rejects(getAdminDashboard(), (e) => e.status === 502)
})

test("customer detail uses the same tenant detail endpoint and preserves nested information", async (t) => {
  const customer = {
    id: ids[0],
    name: "Example Customer",
    type: "customer",
    email: "example@example.test",
    address: { city: "Abuja" },
    organisation: { name: "Example Organisation" },
  }
  mock(t, (url, options) => {
    assert.equal(url.pathname, `/getty/v1/tenant/tenants/${ids[0]}`)
    assert.equal(options.headers.get("Authorization"), "Bearer fixture-access")
    return Response.json(envelope(customer))
  })
  session.saveSession({ ...fixtureUser, role: "admin" }, "fixture-access")
  assert.deepEqual(await portalTenant(ids[0]), customer)
})
