import AppLogo from "@/components/shared/app-logo"
import {
  Facebook,
  Instagram,
  Pinterest,
  Twitter,
  Youtube,
} from "@/components/svgs/socials"
import Newsletter from "./newsletter"
import Link from "next/link"

const categoryLinks = [
  { label: "All products", href: "/products" },
  { label: "Shop by category", href: "/categories" },
  { label: "Your wishlist", href: "/wishlist" },
  { label: "Become a supplier", href: "/supplier/register" },
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
    <footer className="border-t border-[#e3eadd] bg-[#f8faf5] text-[#6e7d63]">
      <div className="site-container py-12 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 xl:grid-cols-[1.3fr_0.8fr_0.8fr_1.4fr]">
          <div>
            <Link
              href="/"
              className="inline-block max-w-full"
              aria-label="Getty Medical Store home"
            >
              <AppLogo className="h-auto w-full max-w-[273px]" />
            </Link>

            <p className="mt-5 max-w-xs text-sm leading-7 text-[#596b53]">
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
                  className="hover:border-primary hover:text-primary grid size-11 place-items-center rounded-full border border-[#FDFDFD] bg-transparent text-[#252B37] transition hover:bg-transparent"
                >
                  <Icon className="size-4" />
                </Link>
              ))}
            </div>
          </div>

          <FooterColumn title="Explore" links={categoryLinks} />

          <FooterColumn title="Support" links={supportLinks} />

          <Newsletter />
        </div>
      </div>

      <div className="bg-[#FDFDFD] shadow-[0px_1px_0px_0px_#E1E3E5_inset]">
        <div className="font-geist mx-auto flex min-h-14 w-full max-w-330 items-center justify-center px-4 py-6 text-center text-[14px] leading-6 font-normal tracking-normal text-[#59656c] xl:px-0">
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
      <h2 className="font-geist text-[14px] leading-5 font-normal tracking-normal text-[#59656c]">
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
