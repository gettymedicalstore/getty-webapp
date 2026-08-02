"use client"

import { ArrowLeft, ArrowRight, ChevronRight, Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type SyntheticEvent, useEffect, useState } from "react"

const slides = [
  {
    id: "hero-1",
    eyebrow: "Welcome to GettyMedicalStore",
    title: "Your Trusted Medical Supply Marketplace",
    image: "/images/14.webp",
    imageAlt: "Medical and healthcare product",
  },
  {
    id: "hero-2",
    eyebrow: "Professional hospital supplies",
    title: "Reliable Equipment for Better Healthcare",
    image: "/images/10.webp",
    imageAlt: "Professional hospital equipment",
  },
  {
    id: "hero-3",
    eyebrow: "Everyday personal wellness",
    title: "Healthcare Essentials for Every Home",
    image: "/images/20.webp",
    imageAlt: "Personal healthcare and wellness product",
  },
]

export default function HeroCarousel() {
  const router = useRouter()

  const [active, setActive] = useState(0)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length)
    }, 6000)

    return () => window.clearInterval(timer)
  }, [])

  const slide = slides[active]

  function previousSlide() {
    setActive((current) => (current - 1 + slides.length) % slides.length)
  }

  function nextSlide() {
    setActive((current) => (current + 1) % slides.length)
  }

  function submitSearch(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault()

    const query = search.trim()

    if (!query) return

    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured medical products"
      className="relative"
    >
      <div className="mx-auto w-full max-w-330 px-4 sm:px-0">
        <div className="rounded-b-11 relative min-h-145 overflow-hidden rounded-b-[48px] bg-[#F5F5F5]">
          <div className="mx-auto grid min-h-145 w-full max-w-330 items-center gap-10 px-6 pt-14 pb-36 sm:px-10 lg:min-h-175 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:pt-10 lg:pb-40 xl:px-24">
            <div className="relative z-20 mx-auto w-full max-w-xl lg:mx-0">
              <p className="font-geist text-sm font-normal tracking-normal text-[#252b37] sm:text-base">
                {slide.eyebrow}
              </p>

              <h1 className="mt-5 max-w-140 text-[42px] leading-[110%] font-bold tracking-[-0.045em] text-[#252B37] capitalize sm:text-5xl lg:text-6xl">
                {slide.title}
              </h1>

              <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Link
                  href="/login"
                  className="bg-primary border-primary inline-flex h-14 shrink-0 cursor-pointer items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold text-white transition hover:text-white/80"
                >
                  Get Started
                </Link>

                <Link
                  href="/products"
                  className="hover:border-primary hover:text-primary inline-flex h-14 shrink-0 cursor-pointer items-center justify-center gap-3 rounded-xl border border-[#D5D7DA] bg-transparent px-4 py-3 text-base font-semibold text-[#535862] transition"
                >
                  Explore More
                  <ChevronRight className="size-6 text-inherit" />
                </Link>
              </div>
            </div>

            <div className="relative mx-auto flex h-92.5 w-full max-w-150 items-center justify-center sm:h-112.5 lg:h-147.5">
              <div className="absolute top-30 left-1/2 size-87.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E9EAEB] sm:size-110 lg:size-142.5" />

              <div className="relative z-10 h-85 w-75 sm:h-105 sm:w-95 lg:h-132.5 lg:w-117.5">
                <Image
                  key={slide.image}
                  src={slide.image}
                  alt={slide.imageAlt}
                  fill
                  priority={active === 0}
                  sizes="(max-width: 640px) 300px, (max-width: 1024px) 380px, 470px"
                  className="object-contain mix-blend-multiply"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={previousSlide}
            aria-label="Previous slide"
            className="text-primary absolute top-1/2 left-5 z-30 grid size-13 -translate-y-1/2 place-items-center rounded-full bg-[#FDFDFD] shadow-none transition hover:scale-105 sm:left-4"
          >
            <ArrowLeft className="size-5" />
          </button>

          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next slide"
            className="text-primary absolute top-1/2 right-5 z-30 grid size-13 -translate-y-1/2 place-items-center rounded-full bg-white shadow-none transition hover:scale-105 sm:right-4"
          >
            <ArrowRight className="size-5" />
          </button>

          <div className="absolute bottom-24.5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 lg:bottom-28">
            {slides.map((item, index) => {
              const isActive = active === index

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`size-3 rounded-full transition ${
                    isActive ? "bg-[#252B37]" : "bg-[#717680]"
                  }`}
                />
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
