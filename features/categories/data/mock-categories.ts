import type { Category } from "../types/category"

export const mockCategories: Category[] = [
  {
    id: "cat-001",
    name: "Pharmaceuticals",
    slug: "pharmaceuticals",
    description:
      "Approved medicines, supplements, and everyday pharmaceutical products for personal and professional healthcare needs.",
    image: "/images/19.webp",
    productCount: 326,
    active: true,
  },
  {
    id: "cat-002",
    name: "Surgical Equipment",
    slug: "surgical-equipment",
    description:
      "Professional surgical instruments and equipment for hospitals, clinics, laboratories, and approved healthcare facilities.",
    image: "/images/10.webp",
    productCount: 384,
    active: true,
  },
  {
    id: "cat-003",
    name: "Medical Consumables",
    slug: "medical-consumables",
    description:
      "Disposable and reusable medical supplies for hospitals, clinics, laboratories, and home-care environments.",
    image: "/images/18.webp",
    productCount: 137,
    active: true,
  },
  {
    id: "cat-004",
    name: "Diagnostic Equipment",
    slug: "diagnostic-equipment",
    description:
      "Reliable diagnostic devices and health-monitoring equipment for clinical and personal use.",
    image: "/images/1.webp",
    productCount: 184,
    active: true,
  },
  {
    id: "cat-005",
    name: "Hospital Equipment",
    slug: "hospital-equipment",
    description:
      "Hospital beds, examination furniture, mobility equipment, and other essential clinical equipment.",
    image: "/images/6.webp",
    productCount: 212,
    active: true,
  },
  {
    id: "cat-006",
    name: "Personal Care",
    slug: "personal-care",
    description:
      "Personal hygiene, wellness, grooming, and everyday healthcare essentials for home use.",
    image: "/images/17.webp",
    productCount: 126,
    active: true,
  },
]
