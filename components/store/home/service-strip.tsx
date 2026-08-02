import { Box, Clock, Shield } from "@/components/svgs"

const services = [
  {
    title: "Discount",
    description: "Every week new sales",
    icon: Box,
  },
  {
    title: "Great Support 24/7",
    description: "We care your experiences",
    icon: Clock,
  },
  {
    title: "Secure Payment",
    description: "100% Secure Payment Method",
    icon: Shield,
  },
]

export default function ServiceStrip() {
  return (
    <section className="relative z-40 -mt-16 px-4 py-12.5 sm:px-6 lg:-mt-30 lg:px-17.5">
      <div className="mx-auto w-full max-w-277 rounded-[12px] bg-[#FDFDFD] shadow-[0px_24px_100px_0px_#16193212]">
        <div className="grid gap-0 md:grid-cols-3">
          {services.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="flex min-h-30 items-center gap-4 px-8 py-6 sm:px-10"
            >
              <div className="grid size-12 shrink-0 place-items-center text-[#252b37]">
                <Icon className="size-10 stroke-[1.4]" aria-hidden="true" />
              </div>

              <div>
                <h2 className="font-inter text-[18px] leading-[110%] font-medium text-[#252B37] capitalize">
                  {title}
                </h2>

                <p className="font-inter text-sm font-normal text-[#717680]">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
