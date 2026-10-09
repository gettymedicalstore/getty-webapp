import { Search, Layers3, LifeBuoy } from "lucide-react"
const services = [
  {
    title: "Find what you need",
    description: "Browse clearly organised medical essentials.",
    icon: Search,
  },
  {
    title: "Choose with confidence",
    description: "Compare product details and available options.",
    icon: Layers3,
  },
  {
    title: "A helping hand",
    description: "Talk to our team when you need support.",
    icon: LifeBuoy,
  },
]
export default function ServiceStrip() {
  return (
    <section className="border-y border-[#e7ece4] bg-white">
      <div className="site-container grid gap-0 md:grid-cols-3">
        {services.map(({ title, description, icon: Icon }) => (
          <article
            key={title}
            className="flex items-start gap-3.5 py-6 md:px-5 md:py-7 md:first:pl-0 md:last:pr-0"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f0f5ec] text-[#54804b]">
              <Icon className="size-[18px]" strokeWidth={1.5} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[#354d3c]">{title}</h2>
              <p className="mt-1.5 max-w-64 text-xs leading-5 text-[#5d6e59]">
                {description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
