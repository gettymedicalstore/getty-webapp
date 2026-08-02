"use client"

import { ArrowLeft, ArrowRight, Quote } from "lucide-react"
import { useRef } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DoubleQuote } from "@/components/svgs"

const testimonials = [
  {
    id: "testimonial-1",
    name: "Nizamiye Hospital IDU Branch",
    role: "Managing Director",
    message:
      "I'd rate Getty Medical Store a 9.5/10! Quick delivery, quality products, and excellent customer service. They truly care about their customers and their health needs. Highly recommended for all your medical needs!",
    initials: "NI",
    image: "/images/testimonials/nazamiye.png",
  },
  {
    id: "testimonial-2",
    name: "One-Life Pharmacy",
    role: "Head of Operations",
    message:
      "I'd give Getty Medical Store a solid 9/10! Their service is reliable, products are top-notch, and they truly understand customer satisfaction. A definite go-to for medical needs!",
    initials: "OP",
    image: "/images/testimonials/one-life-pharmacy.webp",
  },
  {
    id: "testimonial-3",
    name: "Harmony Medical Centre",
    role: "Procurement Manager",
    message:
      "Getty Medical Store has been dependable for our routine medical supply needs. The ordering experience is smooth, communication is clear, and deliveries are handled professionally.",
    initials: "HM",
    image: "/images/testimonials/harmony-medical-centre.webp",
  },
]

export default function Testimonials() {
  const railRef = useRef<HTMLDivElement>(null)

  function scrollTestimonials(direction: "previous" | "next") {
    const rail = railRef.current

    if (!rail) return

    const firstCard = rail.querySelector<HTMLElement>("[data-testimonial-card]")

    const cardWidth = firstCard?.offsetWidth ?? 520
    const styles = window.getComputedStyle(rail)
    const gap = Number.parseFloat(styles.columnGap) || 16

    rail.scrollBy({
      left: direction === "next" ? cardWidth + gap : -(cardWidth + gap),
      behavior: "smooth",
    })
  }

  return (
    <section className="overflow-hidden bg-[#F5F5F5] py-14 sm:py-16 lg:py-20">
      <div className="mx-auto w-full max-w-330 px-4 lg:px-6 xl:px-0">
        <div className="flex items-center justify-between gap-6">
          <h2 className="font-geist text-2xl leading-[110%] font-semibold text-[#252B37] sm:text-[32px]">
            What Client Says About Us
          </h2>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => scrollTestimonials("previous")}
              aria-label="Previous testimonials"
              className="grid size-10 cursor-pointer place-items-center rounded-full bg-[#067647] text-white transition hover:bg-[#05603A]"
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </button>

            <button
              type="button"
              onClick={() => scrollTestimonials("next")}
              aria-label="Next testimonials"
              className="grid size-10 cursor-pointer place-items-center rounded-full text-[#344054] transition hover:bg-white"
            >
              <ArrowRight aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>

        <div
          ref={railRef}
          className="mt-9 grid snap-x snap-mandatory scrollbar-none auto-cols-[92%] grid-flow-col gap-4 overflow-x-auto scroll-smooth pb-2 sm:auto-cols-[75%] lg:auto-cols-[calc((100%-16px)/2)] [&::-webkit-scrollbar]:hidden"
        >
          {testimonials.map((testimonial) => (
            <article
              key={testimonial.id}
              data-testimonial-card
              className="relative min-h-63.5 min-w-0 snap-start overflow-hidden rounded-xl bg-[#FDFDFD] px-6 py-8 shadow-[0px_8px_40px_0px_#27234314] sm:px-8"
            >
              <div className="pl-6 shadow-[2px_0px_0px_0px_#029FAE_inset]">
                <p className="font-geist text-base leading-[150%] font-normal text-[#344054] md:text-xl">
                  {testimonial.message}
                </p>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <Avatar className="size-15 shrink-0">
                  <AvatarImage
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="object-contain"
                  />

                  <AvatarFallback className="bg-[#D7FFEE] text-base font-semibold text-[#175CD3]">
                    {testimonial.initials}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <p className="truncate text-xl leading-[140%] font-semibold tracking-normal text-[#252B37] capitalize">
                    {testimonial.name}
                  </p>

                  <p className="text-sm leading-[140%] text-[#717680] capitalize">
                    {testimonial.role}
                  </p>
                </div>
              </div>

              <DoubleQuote
                aria-hidden="true"
                className="absolute right-7 bottom-0"
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
