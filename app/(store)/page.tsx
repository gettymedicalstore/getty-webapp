export default function HomePage() {
  return (
    <main className="text-foreground min-h-screen bg-[#f7f7f7]">
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
            <div className="bg-primary/40 w-full max-w-5xl px-7 py-10 text-center backdrop-blur-[2px] sm:px-12">
              <p className="mb-5 text-sm font-medium text-white/90">
                Welcome to GettyMedicalStore
              </p>

              <h1 className="w-full text-4xl leading-tight font-bold text-white sm:text-6xl lg:text-7xl">
                Your Trusted Medical Marketplace Is Coming Soon
              </h1>

              <p className="mx-auto mt-6 text-base leading-7 text-white/90 lg:mx-0">
                We are creating a reliable online destination for medical
                supplies, health products, wellness essentials, and everyday
                healthcare needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="text-foreground/50 px-5 pt-28 pb-8 text-center text-sm">
        © {new Date().getFullYear()} Getty Medical Store. All rights reserved.
      </footer>
    </main>
  )
}
