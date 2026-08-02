import AppLogo from "@/components/shared/app-logo"
import {
  Facebook,
  Instagram,
  Pinterest,
  Twitter,
  Youtube,
} from "@/components/svgs/socials"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const categoryLinks = [
  {
    label: "Pharmaceuticals",
    href: "/categories/pharmaceuticals",
  },
  {
    label: "Surgical Equipment",
    href: "/categories/surgical-equipment",
  },
  {
    label: "Medical Consumables",
    href: "/categories/medical-consumables",
  },
  {
    label: "Diagnostic Equipment",
    href: "/categories/diagnostic-equipment",
  },
  {
    label: "Hospital Equipment",
    href: "/categories/hospital-equipment",
  },
]

const supportLinks = [
  {
    label: "Help & Support",
    href: "/contact",
  },
  {
    label: "Terms & Conditions",
    href: "/terms",
  },
]

const socialLinks = [
  {
    label: "Facebook",
    href: "https://facebook.com/gettymedicalstore",
    icon: Facebook,
  },
  {
    label: "Twitter",
    href: "https://x.com/gettymedical",
    icon: Twitter,
  },
  {
    label: "Instagram",
    href: "https://instagram.com/gettymedicalstore",
    icon: Instagram,
  },
  {
    label: "Pinterest",
    href: "https://pinterest.com/gettymedicalstore",
    icon: Pinterest,
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@gettymedicalstore",
    icon: Youtube,
  },
]

export default function StoreFooter() {
  return (
    <footer className="border-t border-[#FDFDFD] bg-white text-[#535862] shadow-[0px_1px_0px_0px_#E1E3E5_inset]">
      <div className="mx-auto w-full max-w-330 px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1.4fr]">
          <div>
            <Link href="/" className="inline-block">
              <AppLogo />
            </Link>

            <p className="font-geist mt-5 max-w-87.5 text-base leading-6 font-normal tracking-normal text-[#252B37]">
              Reliable access to medical equipment, healthcare supplies,
              consumables, and personal wellness products.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="hover:border-primary hover:text-primary grid size-9 place-items-center rounded-full border border-[#FDFDFD] bg-transparent text-[#252B37] transition hover:bg-transparent"
                >
                  <Icon className="size-4" />
                </Link>
              ))}
            </div>
          </div>

          <FooterColumn title="Category" links={categoryLinks} />

          <FooterColumn title="Support" links={supportLinks} />

          <Newsletter />
        </div>
      </div>

      <div className="bg-[#FDFDFD] shadow-[0px_1px_0px_0px_#E1E3E5_inset]">
        <div className="font-geist mx-auto flex min-h-14 w-full max-w-330 items-center justify-center px-4 py-6 text-center text-[14px] leading-6 font-normal tracking-normal text-[#717680] xl:px-0">
          <p>
            © {new Date().getFullYear()} Getty Medical Store. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

type FooterLink = {
  label: string
  href: string
}

type FooterColumnProps = {
  title: string
  links: FooterLink[]
}

function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div>
      <h2 className="font-geist cursor-pointer text-[14px] leading-5 font-normal tracking-normal text-[#717680]">
        {title}
      </h2>

      <nav className="mt-5 grid gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="hover:text-primary text-sm font-semibold text-[#535862] transition"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

function Newsletter() {
  return (
    <div>
      <h2 className="text-xs font-medium text-[#667085]">Newsletter</h2>

      <form
        action="/api/newsletter"
        method="post"
        className="mt-5 flex flex-col gap-3 sm:flex-row"
      >
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>

        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="e.g. olivia@untitledui.com"
          className="focus:border-primary font-geist h-11 min-w-0 flex-1 rounded-xl border border-[#D5D7DA] bg-white px-3.5 py-2.5 text-base font-normal text-[#414651] outline-none placeholder:text-[#717680]"
        />

        <Button
          type="submit"
          className="bg-primary hover:bg-primary/90 h-11 shrink-0 px-4.5 py-2.5 text-base font-semibold text-white transition"
        >
          Subscribe
        </Button>
      </form>
    </div>
  )
}
