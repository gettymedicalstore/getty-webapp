// Synthetic records for layout checks; all backend requests are intercepted.
export const id = "10000000-0000-4000-8000-000000000001"
const categoryId = "10000000-0000-4000-8000-000000000002"
const fileId = "10000000-0000-4000-8000-000000000003"
export const product = {
  id,
  name: "Adjustable examination chair",
  brand: "Careline",
  description: "Adjustable support for everyday clinical examinations.",
  seller: "Careline Medical",
  category: { id: categoryId, name: "Clinical equipment" },
  subcategory: null,
  currency: "NGN",
  price: 400000,
  priceFmt: "₦400,000.00",
  inStock: true,
  rating: { average: 4.5, count: 3 },
  links: {
    self: `/getty/ecommerce/catalog/products/${id}`,
    photos: `/getty/ecommerce/catalog/products/${id}/photos`,
    ratings: `/getty/ecommerce/catalog/products/${id}/ratings`,
  },
}
const variant = {
  id,
  product: id,
  name: "Default",
  sku: "EXAM-100",
  price: 400000,
  priceFmt: "₦400,000.00",
  quantity: 14,
  availableQuantity: 14,
  reserved: 0,
  threshold: 5,
  active: true,
  isDefault: true,
  options: {},
  inStock: true,
  saleUnit: "piece",
  unitsPerPack: 1,
  minimumOrderQuantity: 1,
}
export async function fixtures(context, role) {
  if (role)
    await context.addInitScript(
      ({ role, id }) =>
        localStorage.setItem(
          "getty-live-session-v2",
          JSON.stringify({
            origin: "https://api.gettymedicalstores.com",
            sessionId: "browser-audit",
            user: {
              id,
              email: "review@example.test",
              name: "Clinical Care Procurement",
              role,
              profileRole: role === "admin" ? "admin" : "administrator",
              tenantType:
                role === "admin"
                  ? "support"
                  : role === "supplier"
                    ? "vendor"
                    : "customer",
              tenant: "Careline Medical Supplies",
              status: "active",
              tenantStatus: "onboarded",
            },
            accessToken: "synthetic-audit-token",
            refreshToken: null,
            fingerprint: null,
          })
        ),
      { role, id }
    )
  await context.route(
    "https://api.gettymedicalstores.com/**",
    async (route) => {
      const u = new URL(route.request().url()),
        p = u.pathname
      if (route.request().method() !== "GET")
        return route.fulfill({
          status: 400,
          json: {
            status: 400,
            success: false,
            message: "Browser review does not perform live writes.",
          },
        })
      if (p.endsWith("/src"))
        return route.fulfill({
          status: 200,
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect x="80" y="100" width="240" height="180" rx="24" fill="#c8ddbd"/><path d="M110 280v70m180-70v70" stroke="#215d3d" stroke-width="18"/></svg>',
        })
      let data = []
      const page = (records) => ({
        records,
        cursor: 0,
        nextCursor: 0,
        previousCursor: 0,
        isNext: false,
        isPrevious: false,
        limit: 20,
      })
      if (p === "/getty/ecommerce/catalog/categories")
        data = [
          {
            id: categoryId,
            name: "Clinical equipment",
            description: "Equipment for everyday care",
            subcategories: [],
          },
        ]
      else if (p === "/getty/ecommerce/catalog/products")
        data = page([
          product,
          {
            ...product,
            id: "10000000-0000-4000-8000-000000000004",
            name: "Digital blood pressure monitor",
            price: 24500,
          },
        ])
      else if (p.match(/catalog\/products\/[^/]+$/))
        data = {
          ...product,
          id: p.split("/").at(-1),
          variants: [
            {
              ...variant,
              id: p.split("/").at(-1),
              product: p.split("/").at(-1),
            },
          ],
          detail: null,
          specifications: [],
          taxes: [],
          taxInclusive: true,
        }
      else if (p.endsWith("/photos"))
        data = {
          records: [
            {
              id: fileId,
              name: "chair.webp",
              mime: "image/webp",
              url: `/getty/ecommerce/catalog/products/${id}/photos/${fileId}/src`,
            },
          ],
          nextCursor: null,
          limit: 20,
        }
      else if (p.endsWith("/ratings")) data = page([])
      else if (p === "/getty/v1/dashboard")
        data = {
          totalAccounts: 30,
          customers: 24,
          vendors: 6,
          totalProducts: 42,
          totalCategories: 8,
          pendingProductReviews: 2,
          orderTrend: Array.from({ length: 12 }, (_, i) => ({
            month: `26-${String(i + 1).padStart(2, "0")}`,
            value: i * 3,
          })),
          recentOrdersAwaitingAttention: [],
          recentProductsAwaitingApproval: [],
        }
      else if (p === "/getty/v1/product/categories")
        data = [
          {
            id: categoryId,
            name: "Clinical equipment",
            description: "Equipment for everyday care",
            subcategories: [],
          },
        ]
      else if (p === "/getty/v1/product/taxes")
        data = [{ id: categoryId, name: "VAT", rate: 7.5 }]
      else if (p === "/getty/v1/product/products")
        data = page([
          {
            ...product,
            category: "Clinical equipment",
            status: "draft",
            quantity: 14,
          },
        ])
      else if (p.match(/\/product\/products\/[^/]+$/))
        data = {
          product: { ...product, category: categoryId, status: "draft" },
          category: product.category,
          variants: [variant],
          detail: null,
          specifications: [],
          certificates: [],
          taxes: [],
          links: product.links,
        }
      else if (p.endsWith("/variants"))
        data = p.includes("/inventory/") ? page([variant]) : [variant]
      else if (p.endsWith("/detail")) data = null
      else if (p === "/getty/v1/tenant/tenants")
        data = page([
          {
            id,
            name: "Careline Medical Supplies",
            email: "review@example.test",
            phone: "+2348000000000",
            type: u.searchParams.get("type"),
            status: "onboarded",
          },
        ])
      else if (p.startsWith("/getty/v1/tenant/tenants/"))
        data = {
          id,
          name: "Careline Medical Supplies",
          email: "review@example.test",
          phone: "+2348000000000",
          type: "customer",
          status: "onboarded",
          address: {
            street: "12 Medical Road",
            city: "Abuja",
            country: "Nigeria",
          },
          business: { registration: "RC 123456" },
        }
      else if (p.endsWith("/carts"))
        data = {
          id: null,
          currency: "NGN",
          status: "active",
          expires: null,
          modified: null,
          version: 0,
          expired: false,
          items: [],
          subtotal: 0,
        }
      return route.fulfill({
        json: { status: 200, success: true, message: "OK", data },
      })
    }
  )
}
