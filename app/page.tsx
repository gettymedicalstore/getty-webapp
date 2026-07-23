import AlertCircled from "@/components/svgs"
import Image from "next/image"
import Link from "next/link"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f7f7] text-foreground">
      {/* Top contact bar */}
      <div className="bg-[#00341F] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 text-xs sm:text-sm font-inter font-medium">
          <p>
            Contact:{" "}
            <Link
              href="tel:+2348100000000"
              className="font-semibold transition hover:text-emerald-200 cursor-pointer"
            >
              (+234) 810 000 0000
            </Link>
          </p>

          <div className="hidden items-center gap-5 text-white/70 sm:flex">
            <Link
              href="mailto:help@gettymedicalstore.com"
              className="transition hover:text-white cursor-po"
            >
              help@gettymedicalstore.com
            </Link>

            <span className="flex items-center gap-1">
              <AlertCircled /> Need Help
            </span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className="border-b border-black/5 bg-[#f3f3f3]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link
            href="/"
            className="w-full max-w-68.25 h-10 flex items-center gap-3"
          >
            <Image
              src="/logo.svg"
              alt="Getty Medical Store"
              width={273}
              height={40}
              priority
              className="w-full h-full object-contain"
            />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-4 sm:px-8">
        <div className="relative mx-auto min-h-162.5 max-w-360 overflow-hidden rounded-[0_0_38px_38px] bg-[#eeeeee]">
          {/* Background shapes */}
          <div
            aria-hidden="true"
            className="absolute -top-36 right-[8%] h-130 w-130 rounded-full bg-[#e1e3e3]"
          />

          <div
            aria-hidden="true"
            className="absolute bottom-10 left-10 h-44 w-44 rounded-full bg-emerald-100/50 blur-2xl"
          />

          {/* Main content card */}
          <div className="relative z-10 flex min-h-162.5 items-center justify-center px-5 py-20 lg:px-[13%]">
            <div className="w-full max-w-5xl bg-primary/40 px-7 py-10 text-center backdrop-blur-[2px] sm:px-12">
              <p className="mb-5 text-sm font-medium text-white/90">
                Welcome to GettyMedicalStore
              </p>

              <h1 className="w-full text-4xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
                Your Trusted Medical Marketplace Is Coming Soon
              </h1>

              <p className="mx-auto mt-6  text-base leading-7 text-white/90 lg:mx-0">
                We are creating a reliable online destination for medical
                supplies, health products, wellness essentials, and everyday
                healthcare needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-5 pb-8 pt-28 text-center text-sm text-foreground/50">
        © {new Date().getFullYear()} Getty Medical Store. All rights reserved.
      </footer>
    </main>
  )
}
