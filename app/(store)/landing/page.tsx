import CategoryCarousel from "@/components/store/home/category-carousel"
import HeroCarousel from "@/components/store/home/hero-carousel"
import ServiceStrip from "@/components/store/home/service-strip"
import Testimonials from "@/components/store/home/testimonials"
import {
  OurProductsSection,
  RecentlyAddedProductsSection,
} from "@/features/products/components/store/home-product-sections"

export default function HomePage() {
  return (
    <>
      <HeroCarousel />
      <OurProductsSection />

      <RecentlyAddedProductsSection />

      <CategoryCarousel />

      <ServiceStrip />

      <Testimonials />
    </>
  )
}
