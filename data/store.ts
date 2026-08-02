export type MedicalCategory = {
  name: string
  slug: string
  image: string
  productCount: number
}

export type StoreProduct = {
  id: number
  name: string
  slug: string
  image: string
  price: number
  oldPrice?: number
  rating: number
  reviewCount: number
  category: string
  inStock: boolean
  featured?: boolean
  recentlyAdded?: boolean
  badge?: string
}

export const medicalCategories: MedicalCategory[] = [
  {
    name: "Medical Consumables",
    slug: "medical-consumables",
    image: "/images/18.webp",
    productCount: 137,
  },
  {
    name: "Surgical Equipment",
    slug: "surgical-equipment",
    image: "/images/10.webp",
    productCount: 384,
  },
  {
    name: "Diagnostic Equipment",
    slug: "diagnostic-equipment",
    image: "/images/1.webp",
    productCount: 184,
  },
  {
    name: "Hospital Equipment",
    slug: "hospital-equipment",
    image: "/images/6.webp",
    productCount: 212,
  },
  {
    name: "Pharmaceuticals",
    slug: "pharmaceuticals",
    image: "/images/19.webp",
    productCount: 326,
  },
  {
    name: "Personal Care",
    slug: "personal-care",
    image: "/images/17.webp",
    productCount: 126,
  },
]

export const products: StoreProduct[] = [
  {
    id: 1,
    name: "Ultra Absorbent Incontinence Pads",
    slug: "ultra-absorbent-incontinence-pads",
    image: "/images/12.webp",
    price: 1200,
    rating: 4.8,
    reviewCount: 24,
    category: "Medical Consumables",
    inStock: true,
    featured: true,
  },
  {
    id: 2,
    name: "Premium 3-Ply Surgical Face Mask",
    slug: "premium-surgical-face-mask",
    image: "/images/21.webp",
    price: 1200,
    rating: 4.7,
    reviewCount: 19,
    category: "Medical Consumables",
    inStock: true,
    featured: true,
  },
  {
    id: 3,
    name: "Adjustable Examination and Medical Chair",
    slug: "adjustable-medical-chair",
    image: "/images/20.webp",
    price: 120000,
    rating: 4.9,
    reviewCount: 11,
    category: "Hospital Equipment",
    inStock: true,
    featured: true,
    badge: "Best seller",
  },
  {
    id: 4,
    name: "Digital Oral Thermometer",
    slug: "digital-oral-thermometer",
    image: "/images/11.webp",
    price: 1200,
    oldPrice: 1500,
    rating: 4.6,
    reviewCount: 37,
    category: "Diagnostic Equipment",
    inStock: true,
    featured: true,
  },
  {
    id: 5,
    name: "Silicone Scar Removal Dressing",
    slug: "silicone-scar-removal-dressing",
    image: "/images/8.webp",
    price: 1200,
    rating: 4.8,
    reviewCount: 16,
    category: "Medical Consumables",
    inStock: true,
  },
  {
    id: 6,
    name: "Adjustable Electric Hospital Bed",
    slug: "adjustable-electric-hospital-bed",
    image: "/images/3.webp",
    price: 485000,
    rating: 4.9,
    reviewCount: 8,
    category: "Hospital Equipment",
    inStock: true,
    badge: "Popular",
    recentlyAdded: true,
  },
  {
    id: 7,
    name: "Advanced Herbal Nausea Support",
    slug: "advanced-herbal-nausea-support",
    image: "/images/15.webp",
    price: 1200,
    rating: 4.5,
    reviewCount: 13,
    category: "Pharmaceuticals",
    inStock: true,
  },
  {
    id: 8,
    name: "Daily Relief Nasal Spray",
    slug: "daily-relief-nasal-spray",
    image: "/images/5.webp",
    price: 1200,
    rating: 4.7,
    reviewCount: 21,
    category: "Pharmaceuticals",
    inStock: true,
  },
  {
    id: 9,
    name: "Multivitamin Daily Fibre Supplement",
    slug: "multivitamin-daily-fibre-supplement",
    image: "/images/9.webp",
    price: 1200,
    rating: 4.8,
    reviewCount: 28,
    category: "Wellness",
    inStock: true,
  },
  {
    id: 10,
    name: "Heart and Cholesterol Relief Pack",
    slug: "heart-cholesterol-relief-pack",
    image: "/images/4.webp",
    price: 1200,
    rating: 4.6,
    reviewCount: 14,
    category: "Pharmaceuticals",
    inStock: true,
  },
  {
    id: 11,
    name: "Extra Strength Acetaminophen",
    slug: "extra-strength-acetaminophen",
    image: "/images/13.webp",
    price: 1200,
    rating: 4.8,
    reviewCount: 45,
    category: "Pharmaceuticals",
    inStock: true,
    recentlyAdded: true,
  },
  {
    id: 12,
    name: "Probiotic Gummies for Digestive Wellness",
    slug: "probiotic-gummies",
    image: "/images/17.webp",
    price: 1200,
    rating: 4.9,
    reviewCount: 32,
    category: "Wellness",
    inStock: true,
  },
  {
    id: 13,
    name: "Children’s Daily Multivitamin Gummies",
    slug: "children-daily-multivitamin-gummies",
    image: "/images/7.webp",
    price: 1200,
    rating: 4.7,
    reviewCount: 18,
    category: "Wellness",
    inStock: true,
    recentlyAdded: true,
  },
  {
    id: 14,
    name: "Allergy Relief Cetirizine Tablets",
    slug: "allergy-relief-cetirizine-tablets",
    image: "/images/16.webp",
    price: 1200,
    rating: 4.8,
    reviewCount: 39,
    category: "Pharmaceuticals",
    inStock: true,
    recentlyAdded: true,
  },
]

export const featuredProducts = products.filter((product) => product.featured)

export const recentlyAddedProducts = products.filter(
  (product) => product.recentlyAdded
)
