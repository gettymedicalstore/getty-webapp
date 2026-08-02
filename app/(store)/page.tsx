import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import CategoryCarousel from "@/components/store/home/category-carousel"
import HeroCarousel from "@/components/store/home/hero-carousel"
import ServiceStrip from "@/components/store/home/service-strip"
import Testimonials from "@/components/store/home/testimonials"
import {
  featuredProductsQueryOptions,
  productsQueryOptions,
} from "@/features/products/api/product-query-options"
import {
  FeaturedProductsSection,
  OurProductsSection,
  RecentlyAddedProductsSection,
} from "@/features/products/components/store/home-product-sections"
import { getQueryClient } from "@/lib/query/get-query-client"

export default function HomePage() {
  return (
    <>
      <HeroCarousel />
      <ServiceStrip />

      <FeaturedProductsSection />

      <CategoryCarousel />

      <OurProductsSection />

      <Testimonials />
      <RecentlyAddedProductsSection />
    </>
  )
}
