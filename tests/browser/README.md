# Frontend review checks

These checks cover the storefront, authentication, cart, admin, vendor and customer workspaces. The route sweep tests 320, 375, 390, 414, 768, 1024, 1280, 1440 and 1920px. It records horizontal overflow and runtime errors, verifies redirects, takes screenshots, and runs axe WCAG A/AA checks at 320 and 1440px. Interaction checks capture screenshots at all nine widths and check validation, keyboard focus, guest cart operations, the hero carousel and upload/password/category dialogs. A separate 320 × 568px check exercises dialog scrolling.

## Run

Use a production build to avoid Next development-only performance measurement errors. Google Chrome must be installed. Browser tools can be installed outside this application's dependency tree:

```sh
npm install --prefix /private/tmp/getty-browser-audit playwright @axe-core/playwright
npm run build
npm run start -- -p 3100
```

In another terminal:

```sh
AUDIT_BASE_URL=http://localhost:3100 AUDIT_OUTPUT=/private/tmp/getty-review/routes node tests/browser/audit.mjs
AUDIT_BASE_URL=http://localhost:3100 AUDIT_OUTPUT=/private/tmp/getty-review/interactions node tests/browser/interactions.mjs
```

`AUDIT_TOOLS_DIR` can override the browser-tools installation directory. `AUDIT_FILTER` selects route names; `AUDIT_SCENARIO` selects interaction names. Reports and screenshots go to `AUDIT_OUTPUT`. A failed assertion, runtime error, overflow or detected accessibility violation sets a nonzero exit code.

## Data and limits

Browser API requests use synthetic fixtures and synthetic role sessions. Non-GET backend requests are blocked: these checks never create accounts, approve products, change passwords or upload real files. Guest cart changes stay in the isolated browser context.

Next server-rendered public catalogue reads still use the configured API. The `catalog-detail` scenario follows a real published product from the server-rendered listing and requires one to exist. Synthetic product/category URLs in the route sweep also exercise missing-record states. The fixtures do not verify live authenticated permissions, storage uploads, payments or undocumented backend services.

Automated accessibility checks supplement visual and keyboard review; they do not establish complete WCAG conformance. This suite runs Chromium, not Safari or Firefox. Layout screenshots are taken at a 900–1000px height in addition to the short-screen dialog case.

## Changes from the review

- Made the shared store header and system logo fit narrow screens.
- Fixed signup grid sizing, shared textarea styling and scrollable dialogs.
- Improved text contrast and accessible names; added a skip link and keyboard access to the testimonial rail.
- Prevented streamed category and wishlist hydration mismatches when shared query caches populate early.
- Removed duplicate homepage product sections and replaced the unavailable newsletter submission with a working support link.
- Shortened the mobile hero and adapted carousel controls for narrow screens.
- Stopped displaying unknown category counts as zero.
- Gave mobile product cards enough room for prices and quantity controls.
- Improved cart title/SKU hierarchy, currency consistency, internal grid sizing and quantity-button hit areas.
- Improved workspace header spacing, dashboard metrics and mobile dialog action layout.
- Aligned product details with the store layout, fixed gallery sizing and rating semantics, increased control hit areas, and removed unsupported checkout guarantees.

Existing backend limitations (including checkout/order services without supported API contracts) remain visible in the UI. The review does not replace them with simulated success.

## Recorded result

See `review-results.json` for the 9 October 2026 review: 52 route cases × 9 widths (468 checks), 10 passing interaction scenarios, 150 passing unit tests, and a successful production build. The route sweep and targeted reruns have no detected page overflow, runtime errors or axe violations. ESLint reports one existing TanStack Table / React Compiler compatibility warning and no errors.
