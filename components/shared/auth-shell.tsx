import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, HeartPulse } from "lucide-react"
import AppLogo from "./app-logo"
import styles from "./auth-shell.module.css"

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className={styles.layout}>
      <aside
        className={styles.brandPanel}
        aria-label="About Getty Medical Stores"
      >
        <Brand light />
        <div className={styles.brandContent}>
          <p className={styles.eyebrow}>Here for the people who care</p>
          <h2 className={styles.headline}>
            Better equipped.
            <br />
            <span>Better care.</span>
          </h2>
          <p className={styles.introduction}>
            Medical equipment and everyday essentials for your practice, your
            patients and your community. All in one place.
          </p>
          <figure className={styles.imagePanel}>
            <div className={styles.image}>
              <Image
                src="/images/18.webp"
                alt="Medical supplies, a stethoscope and everyday healthcare essentials"
                fill
                sizes="(min-width: 1024px) 42vw, 1px"
                className="object-cover"
              />
            </div>
            <figcaption>
              <span>
                From everyday essentials
                <br />
                <strong>to a better-equipped practice.</strong>
              </span>
              <Link href="/products" aria-label="Explore medical supplies">
                <ArrowUpRight aria-hidden className="size-5" />
              </Link>
            </figcaption>
          </figure>
        </div>
        <p className={styles.brandFooter}>
          <HeartPulse aria-hidden className="size-4" />
          Medical essentials. Everyday care.
        </p>
      </aside>
      <div className={styles.formPanel}>
        <div className={styles.topLine}>
          <div className="lg:hidden">
            <Brand />
          </div>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft aria-hidden className="size-4" />
            <span className="hidden sm:inline">Back to store</span>
            <span className="sm:hidden">Store</span>
          </Link>
        </div>
        <div className={styles.formArea}>
          <div className={styles.formContent}>{children}</div>
        </div>
        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} Getty Medical Stores</span>
          <div className="flex items-center gap-5">
            <Link href="/contact">Need help?</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </footer>
      </div>
    </main>
  )
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={styles.brand}
      aria-label="Getty Medical Stores home"
    >
      <AppLogo
        tone={light ? "inverse" : "default"}
        className="h-auto w-full max-w-68.25"
      />
    </Link>
  )
}
