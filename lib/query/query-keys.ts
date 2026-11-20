export const queryKeys = {
  products: {
    all: ["products"] as const,
    lists: () => [...queryKeys.products.all, "list"] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, "detail"] as const,
    detail: (slug: string) => [...queryKeys.products.details(), slug] as const,
    related: (id: string) =>
      [...queryKeys.products.all, "related", id] as const,
    featured: () => [...queryKeys.products.all, "featured"] as const,
    recent: () => [...queryKeys.products.all, "recent"] as const,
  },

  categories: {
    all: ["categories"] as const,
    list: () => [...queryKeys.categories.all, "list"] as const,
    detail: (slug: string) =>
      [...queryKeys.categories.all, "detail", slug] as const,
  },

  cart: {
    all: ["cart"] as const,
  },
} as const
