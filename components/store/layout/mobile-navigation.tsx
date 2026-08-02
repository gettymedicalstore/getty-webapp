import { Button } from "@/components/ui/button"
import { mockCategories } from "@/features/categories/data/mock-categories"
import Link from "next/link"

const links = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "Track Order", href: "/track-order" },
  { label: "Contact", href: "/contact" },
]

type MobileNavigationProps = {
  onNavigate: () => void
  onLogin: () => void
}

export default function MobileNavigation({
  onNavigate,
  onLogin,
}: MobileNavigationProps) {
  function handleLoginClick() {
    onNavigate()
    onLogin()
  }

  return (
    <div className="border-t border-black/5 bg-white px-4 pb-5 lg:hidden">
      <nav className="container-layout grid">
        <div className="flex w-full items-center justify-end gap-2 pt-2">
          <Button type="button" onClick={handleLoginClick} className="w-17.25">
            Login
          </Button>

          <Link
            href="/supplier/register"
            onClick={onNavigate}
            className="text-primary inline-flex h-10 w-39.5 items-center justify-center rounded-md bg-[#D7FFEE] px-4 text-sm font-medium transition-colors hover:bg-[#D7FFEE]/80"
          >
            Become a Supplier
          </Link>
        </div>

        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className="border-b border-black/5 py-3.5 text-sm font-semibold"
          >
            {link.label}
          </Link>
        ))}

        <p className="pt-4 text-xs font-bold tracking-[0.16em] text-black/40 uppercase">
          Categories
        </p>

        {mockCategories
          .filter((category) => category.active)
          .map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              onClick={onNavigate}
              className="py-2 text-sm text-black/65"
            >
              {category.name}
            </Link>
          ))}
      </nav>
    </div>
  )
}
