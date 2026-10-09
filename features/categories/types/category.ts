export type Category = {
  id: string
  name: string
  slug: string
  description: string
  image: string
  productCount: number
  countKnown?: boolean
  parentId?: string
  active: boolean
}
