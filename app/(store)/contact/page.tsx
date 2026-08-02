import type { Metadata } from "next"
import { Clock3, LucideIcon, Mail, MapPin, Phone, Send } from "lucide-react"

import ContactForm from "@/features/contact/components/contact-form"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Getty Medical Store for product, order and supplier assistance.",
}
type ContactValue = {
  label: string
  href?: string
}

type ContactItem = {
  title: string
  values: ContactValue[]
  icon: LucideIcon
}
const contactItems: ContactItem[] = [
  {
    title: "Email",
    values: [
      {
        label: "info@gettymedicalstore.com",
        href: "mailto:info@gettymedicalstore.com",
      },
      {
        label: "support@gettymedicalstore.com",
        href: "mailto:support@gettymedicalstore.com",
      },
    ],
    icon: Mail,
  },
  {
    title: "Phone",
    values: [
      {
        label: "+234 90 9858 5775",
        href: "tel:+2349098585775",
      },
      {
        label: "+234 90 9854 5000",
        href: "tel:+2349098545000",
      },
      {
        label: "+234 80 3358 5775",
        href: "tel:+2348033585775",
      },
    ],
    icon: Phone,
  },
  {
    title: "Office",
    values: [
      {
        label: "123 Road 45, Jabi Axis, Headquarters",
      },
      {
        label: "123 Road 45, Maitama Axis, Branch",
      },
    ],
    icon: MapPin,
  },
  {
    title: "Business Hours",
    values: [
      {
        label: "Monday - Friday, 9:00 AM - 5:00 PM",
      },
      {
        label: "Saturday: 10:00 AM - 4:00 PM",
      },
      {
        label: "Sunday: Closed",
      },
    ],
    icon: Clock3,
  },
]
export default function ContactPage() {
  return (
    <section className="bg-[#F5F5F5] py-14 sm:py-16 lg:py-20">
      <div className="mx-auto w-full max-w-330 px-4 lg:px-6 xl:px-0">
        <div className="mx-auto grid max-w-250 gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start lg:gap-12">
          <div className="pt-2 lg:pt-16">
            <h1 className="font-geist text-3xl leading-[120%] font-semibold tracking-[-0.02em] text-[#252B37]">
              Get In Touch
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#535862]">
              Feel free to contact us directly using any of the channels listed
              below.
            </p>

            <div className="mt-6 space-y-4">
              {contactItems.map(({ title, values, icon: Icon }) => (
                <article
                  key={title}
                  className="flex gap-4 rounded-lg border border-[#E9EAEB] bg-white px-4 py-4 shadow-[0_1px_2px_0_rgba(10,13,18,0.03)] sm:px-5"
                >
                  <div className="text-primary flex size-7 shrink-0 items-center justify-center">
                    <Icon
                      aria-hidden="true"
                      className="size-5"
                      strokeWidth={1.8}
                    />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm leading-5 font-semibold text-[#252B37]">
                      {title}
                    </h2>

                    <div className="mt-1 space-y-0.5">
                      {values.map((item) =>
                        item.href ? (
                          <Link
                            key={item.label}
                            href={item.href}
                            className="hover:text-primary block text-xs leading-4.5 text-[#717680] transition-colors"
                          >
                            {item.label}
                          </Link>
                        ) : (
                          <p
                            key={item.label}
                            className="text-xs leading-4.5 text-[#717680]"
                          >
                            {item.label}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#E9EAEB] bg-white p-5 shadow-[0_8px_24px_rgba(16,24,40,0.04)] sm:p-7 lg:p-8">
            <div className="text-primary grid size-12 place-items-center rounded-full bg-[#ECFDF3]">
              <Send
                aria-hidden="true"
                className="size-5 -rotate-12"
                strokeWidth={1.8}
              />
            </div>

            <h2 className="font-geist mt-5 text-2xl leading-8 font-semibold text-[#252B37]">
              Send Us a message
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#535862]">
              Fill out the form below and we&apos;ll get back to you within 24
              hours.
            </p>

            <div className="mt-6">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
