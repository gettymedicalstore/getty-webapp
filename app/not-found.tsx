// app/not-found.tsx

import Link from "next/link"

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div className="not-found-content">
        <div className="not-found-code" aria-hidden="true">
          404
        </div>

        <div className="not-found-copy">
          <p className="not-found-eyebrow">Page not found</p>

          <h1 className="not-found-title">
            We could not find the page you requested.
          </h1>

          <p className="not-found-description">
            The page may have been moved, removed, or the address may be
            incorrect.
          </p>
        </div>

        <div className="not-found-actions">
          <Link href="/" className="not-found-primary-action">
            Return home
          </Link>

          <Link href="/contact" className="not-found-secondary-action">
            Contact support
          </Link>
        </div>
      </div>
    </main>
  )
}
