import { z } from "zod"

// Getty IDs use the GUID shape without RFC UUID version/variant bits.
export const GettyIdSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

// Runtime boundary schemas derived from the supplied carts/catalog/inventory contract.
// Integer fields reject unsafe JavaScript values rather than rounding stock or cursors.
export const ErrorResponseSchema = z.object({
  status: z.number().int().safe().min(400).max(599),
  success: z.literal(false),
  message: z.string(),
})
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

export const CartItemInputSchema = z.object({
  quantity: z.number().int().safe().min(1).max(2147483647),
})
export type CartItemInput = z.infer<typeof CartItemInputSchema>

export const CartItemSchema = z.object({
  id: GettyIdSchema,
  seller: GettyIdSchema,
  product: GettyIdSchema,
  variant: GettyIdSchema,
  name: z.string(),
  sku: z.string(),
  options: z.record(z.string(), z.unknown()),
  unit: z.string(),
  pack: z.number().int().safe().min(1),
  quantity: z.number().int().safe().min(1),
  currency: z.string(),
  price: z.number().nullable(),
  subtotal: z.number().nullable(),
  minimum: z.number().int().safe().min(1),
  available: z.number().int().safe().min(0),
  purchasable: z.boolean(),
})
export type CartItem = z.infer<typeof CartItemSchema>

export const CartSchema = z.object({
  id: GettyIdSchema.nullable(),
  currency: z.string().nullable(),
  status: z.literal("active"),
  expires: z.iso.datetime({ offset: true }).nullable(),
  modified: z.iso.datetime({ offset: true }).nullable(),
  version: z.number().int().safe().min(0),
  expired: z.boolean(),
  items: z.array(CartItemSchema),
  subtotal: z.number(),
})
export type Cart = z.infer<typeof CartSchema>

export const CartResponseSchema = z.object({
  status: z.number().int().safe().min(200).max(200),
  success: z.literal(true),
  message: z.string(),
  data: CartSchema,
})
export type CartResponse = z.infer<typeof CartResponseSchema>

export const SubcategorySchema = z.object({
  id: GettyIdSchema,
  name: z.string(),
  parent: GettyIdSchema,
  description: z.string().nullable(),
})
export type Subcategory = z.infer<typeof SubcategorySchema>

export const CategorySchema = z.object({
  id: GettyIdSchema,
  name: z.string(),
  description: z.string().nullable(),
  subcategories: z.array(SubcategorySchema),
})
export type Category = z.infer<typeof CategorySchema>

export const CatalogProductSchema = z.object({
  id: GettyIdSchema,
  name: z.string(),
  brand: z.string().nullable(),
  description: z.string().nullable(),
  seller: z.string(),
  category: z.object({ id: GettyIdSchema, name: z.string() }),
  subcategory: z.object({ id: GettyIdSchema, name: z.string() }).nullable(),
  currency: z.string(),
  price: z.number().min(0),
  priceFmt: z.string(),
  inStock: z.boolean(),
  rating: z.object({
    average: z.number().min(1).max(5).nullable(),
    count: z.number().int().safe().min(0),
  }),
  links: z.object({
    self: z.string(),
    photos: z.string(),
    ratings: z.string(),
  }),
})
export type CatalogProduct = z.infer<typeof CatalogProductSchema>

export const CatalogVariantSchema = z.object({
  id: GettyIdSchema,
  name: z.string(),
  sku: z.string(),
  options: z.record(z.string(), z.unknown()),
  isDefault: z.boolean(),
  price: z.number().min(0),
  priceFmt: z.string(),
  saleUnit: z.string(),
  unitsPerPack: z.number().int().safe().min(1),
  minimumOrderQuantity: z.number().int().safe().min(1),
  inStock: z.boolean(),
})
export type CatalogVariant = z.infer<typeof CatalogVariantSchema>

export const CatalogProductDetailSchema = z.intersection(
  CatalogProductSchema,
  z.object({
    detail: z
      .object({
        manufacturer: z.string().nullable(),
        model: z.string().nullable(),
        origin: z.string().nullable(),
        usage: z.string().nullable(),
        instructions: z.string().nullable(),
        warnings: z.string().nullable(),
        sterile: z.boolean().nullable(),
        disposable: z.boolean().nullable(),
        coldchain: z.boolean().nullable(),
        shelflife: z.number().int().safe().min(1).nullable(),
        warranty: z.number().int().safe().min(0).nullable(),
        dispatch: z.number().int().safe().min(0).nullable(),
      })
      .nullable(),
    variants: z.array(CatalogVariantSchema),
    specifications: z.array(
      z.object({
        name: z.string(),
        value: z.string(),
        unit: z.string().nullable(),
      })
    ),
    taxes: z.array(z.object({ name: z.string(), rate: z.number().min(0) })),
    taxInclusive: z.literal(true),
  })
)
export type CatalogProductDetail = z.infer<typeof CatalogProductDetailSchema>

export const ProductRatingSchema = z.object({
  id: GettyIdSchema,
  score: z.number().int().safe().min(1).max(5),
  title: z.string().nullable(),
  comment: z.string().nullable(),
  date: z.iso.datetime({ offset: true }),
  verified: z.literal(true),
})
export type ProductRating = z.infer<typeof ProductRatingSchema>

export const ProductPhotoSchema = z.object({
  id: GettyIdSchema,
  name: z.string(),
  mime: z.string(),
  url: z.string(),
})
export type ProductPhoto = z.infer<typeof ProductPhotoSchema>

export const PhotoPageSchema = z.object({
  records: z.array(ProductPhotoSchema),
  nextCursor: z
    .object({
      entry: z
        .string()
        .regex(
          new RegExp(
            "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,9})?$"
          )
        ),
      id: GettyIdSchema,
    })
    .nullable(),
  limit: z.number().int().safe().min(1).max(100),
})
export type PhotoPage = z.infer<typeof PhotoPageSchema>

export const CategoriesResponseSchema = z.object({
  status: z.number().int().safe().min(200).max(200),
  success: z.literal(true),
  message: z.string(),
  data: z.array(CategorySchema),
})
export type CategoriesResponse = z.infer<typeof CategoriesResponseSchema>

export const CatalogPageSchema = z.object({
  records: z.array(CatalogProductSchema),
  cursor: z.number().int().safe().min(0),
  nextCursor: z.number().int().safe().min(0),
  previousCursor: z.number().int().safe().min(0),
  isNext: z.boolean(),
  isPrevious: z.boolean(),
})
export type CatalogPage = z.infer<typeof CatalogPageSchema>

export const CatalogPageResponseSchema = z.object({
  status: z.number().int().safe().min(200).max(200),
  success: z.literal(true),
  message: z.string(),
  data: CatalogPageSchema,
})
export type CatalogPageResponse = z.infer<typeof CatalogPageResponseSchema>

export const ProductDetailResponseSchema = z.object({
  status: z.number().int().safe().min(200).max(200),
  success: z.literal(true),
  message: z.string(),
  data: CatalogProductDetailSchema,
})
export type ProductDetailResponse = z.infer<typeof ProductDetailResponseSchema>

export const RatingPageSchema = z.object({
  records: z.array(ProductRatingSchema),
  cursor: z.number().int().safe().min(0),
  nextCursor: z.number().int().safe().min(0),
  previousCursor: z.number().int().safe().min(0),
  isNext: z.boolean(),
  isPrevious: z.boolean(),
})
export type RatingPage = z.infer<typeof RatingPageSchema>

export const RatingPageResponseSchema = z.object({
  status: z.number().int().safe().min(200).max(200),
  success: z.literal(true),
  message: z.string(),
  data: RatingPageSchema,
})
export type RatingPageResponse = z.infer<typeof RatingPageResponseSchema>

export const PhotoPageResponseSchema = z.object({
  status: z.number().int().safe().min(200).max(200),
  success: z.literal(true),
  message: z.string(),
  data: PhotoPageSchema,
})
export type PhotoPageResponse = z.infer<typeof PhotoPageResponseSchema>

export const InventoryVariantSchema = z.object({
  id: GettyIdSchema,
  product: GettyIdSchema,
  productName: z.string(),
  name: z.string(),
  sku: z.string(),
  active: z.boolean(),
  productStatus: z.string(),
  saleUnit: z.string(),
  unitsPerPack: z.number().int().safe().min(1),
  quantity: z.number().int().safe().min(0),
  reserved: z.number().int().safe().min(0),
  availableQuantity: z.number().int().safe().min(0),
  threshold: z.number().int().safe().min(0),
  stockStatus: z.union([z.literal("in"), z.literal("low"), z.literal("out")]),
  cursor: z.number().int().safe().min(0),
})
export type InventoryVariant = z.infer<typeof InventoryVariantSchema>

export const StockMovementSchema = z.object({
  id: GettyIdSchema,
  product: GettyIdSchema,
  variant: GettyIdSchema,
  productName: z.string(),
  variantName: z.string(),
  sku: z.string(),
  type: z.union([
    z.literal("receipt"),
    z.literal("removal"),
    z.literal("correction"),
    z.literal("reservation"),
    z.literal("release"),
    z.literal("dispatch"),
  ]),
  quantity: z.number().int().safe(),
  reserved: z.number().int().safe(),
  balance: z.number().int().safe().min(0),
  held: z.number().int().safe().min(0),
  reason: z.string().nullable(),
  reference: GettyIdSchema.nullable(),
  actor: GettyIdSchema.nullable(),
  request: z.uuid(),
  entry: z.iso.datetime({ offset: true }),
  cursor: z.number().int().safe().min(0),
})
export type StockMovement = z.infer<typeof StockMovementSchema>

export const StockReceiptInputSchema = z.object({
  request: z.uuid(),
  product: GettyIdSchema,
  variant: GettyIdSchema,
  type: z.literal("receipt"),
  quantity: z.number().int().safe().min(1),
  reason: z.string().max(1000).nullable().optional(),
})
export type StockReceiptInput = z.infer<typeof StockReceiptInputSchema>

export const StockRemovalInputSchema = z.object({
  request: z.uuid(),
  product: GettyIdSchema,
  variant: GettyIdSchema,
  type: z.literal("removal"),
  quantity: z.number().int().safe().min(1),
  reason: z.string().max(1000).regex(new RegExp("\\S")),
})
export type StockRemovalInput = z.infer<typeof StockRemovalInputSchema>

export const StockCorrectionInputSchema = z.object({
  request: z.uuid(),
  product: GettyIdSchema,
  variant: GettyIdSchema,
  type: z.literal("correction"),
  quantity: z.number().int().safe().min(0),
  reason: z.string().max(1000).regex(new RegExp("\\S")),
})
export type StockCorrectionInput = z.infer<typeof StockCorrectionInputSchema>

export const StockInputSchema = z.union([
  StockReceiptInputSchema,
  StockRemovalInputSchema,
  StockCorrectionInputSchema,
])
export type StockInput = z.infer<typeof StockInputSchema>

export const ThresholdInputSchema = z.object({
  product: GettyIdSchema,
  variant: GettyIdSchema,
  threshold: z.number().int().safe().min(0).max(2147483647),
})
export type ThresholdInput = z.infer<typeof ThresholdInputSchema>

export const InventoryPageSchema = z.object({
  records: z.array(InventoryVariantSchema),
  cursor: z.number().int().safe().min(0),
  nextCursor: z.number().int().safe().min(0),
  previousCursor: z.number().int().safe().min(0),
  isNext: z.boolean(),
  isPrevious: z.boolean(),
})
export type InventoryPage = z.infer<typeof InventoryPageSchema>

export const InventoryPageResponseSchema = z.object({
  status: z.number().int().safe().min(200).max(200),
  success: z.literal(true),
  message: z.string(),
  data: InventoryPageSchema,
})
export type InventoryPageResponse = z.infer<typeof InventoryPageResponseSchema>

export const StockPageSchema = z.object({
  records: z.array(StockMovementSchema),
  cursor: z.number().int().safe().min(0),
  nextCursor: z.number().int().safe().min(0),
  previousCursor: z.number().int().safe().min(0),
  isNext: z.boolean(),
  isPrevious: z.boolean(),
})
export type StockPage = z.infer<typeof StockPageSchema>

export const StockPageResponseSchema = z.object({
  status: z.number().int().safe().min(200).max(200),
  success: z.literal(true),
  message: z.string(),
  data: StockPageSchema,
})
export type StockPageResponse = z.infer<typeof StockPageResponseSchema>

export const InventoryMutationResponseSchema = z.object({
  status: z.number().int().safe().min(200).max(200),
  success: z.literal(true),
  message: z.string(),
  data: z.literal("OK"),
})
export type InventoryMutationResponse = z.infer<
  typeof InventoryMutationResponseSchema
>

export const ConsumerSignupInputSchema = z.object({
  name: z.string().max(180).regex(new RegExp("\\S")),
  email: z.email().max(254),
  phone: z.string().max(36).regex(new RegExp("\\S")),
  address: z.string().max(1000).regex(new RegExp("\\S")),
  country: z.string().nullable().optional(),
  contact: z.string().max(180).regex(new RegExp("\\S")),
})
export type ConsumerSignupInput = z.infer<typeof ConsumerSignupInputSchema>

export const ConsumerConfirmationInputSchema = z.object({
  reference: GettyIdSchema,
  otp: z.string().regex(new RegExp("^[0-9]{6,8}$")),
})
export type ConsumerConfirmationInput = z.infer<
  typeof ConsumerConfirmationInputSchema
>

export const ConsumerResendInputSchema = z.object({ reference: GettyIdSchema })
export type ConsumerResendInput = z.infer<typeof ConsumerResendInputSchema>

export const PendingConsumerSignupSchema = z.object({
  reference: GettyIdSchema,
  codeExpiresAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
})
export type PendingConsumerSignup = z.infer<typeof PendingConsumerSignupSchema>

export const CompletedConsumerSignupSchema = z.object({
  tenant: GettyIdSchema,
  status: z.literal("onboarded"),
})
export type CompletedConsumerSignup = z.infer<
  typeof CompletedConsumerSignupSchema
>

export const VendorOnboardingInputSchema = z.object({
  name: z.string().max(255).regex(new RegExp("\\S")),
  email: z.email().max(254),
  phone: z.string().max(36).regex(new RegExp("\\S")),
  profile: z.string().max(180).regex(new RegExp("\\S")),
  country: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  addressId: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  street: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postcode: z.string().nullable().optional(),
})
export type VendorOnboardingInput = z.infer<typeof VendorOnboardingInputSchema>

export const ProfileCreationInputSchema = z.object({
  name: z.string().max(180).regex(new RegExp("\\S")),
  email: z.email().max(254),
  phone: z.string().max(36).nullable().optional(),
  role: z.union([
    z.literal("superadmin"),
    z.literal("admin"),
    z.literal("dispatcher"),
    z.literal("driver"),
    z.literal("finance"),
    z.literal("operations"),
    z.literal("vendor"),
  ]),
  truck: z.string().nullable().optional(),
})
export type ProfileCreationInput = z.infer<typeof ProfileCreationInputSchema>

export const VendorOnboardingResultSchema = z.object({
  status: z.literal("onboarded"),
})
export type VendorOnboardingResult = z.infer<
  typeof VendorOnboardingResultSchema
>

export const OnboardingNameDecisionSchema = z.object({
  decision: z.union([z.literal("REVIEW"), z.literal("BLOCK")]),
  code: z.union([
    z.literal("BUSINESS_NAME_SIMILAR_REVIEW"),
    z.literal("BUSINESS_NAME_REVIEW_REQUIRED"),
    z.literal("BUSINESS_NAME_BLOCKED"),
  ]),
  message: z.string(),
})
export type OnboardingNameDecision = z.infer<
  typeof OnboardingNameDecisionSchema
>

export const OnboardingNameConflictResponseSchema = z.object({
  status: z.literal(409),
  success: z.literal(false),
  message: z.string(),
  data: OnboardingNameDecisionSchema,
})
export type OnboardingNameConflictResponse = z.infer<
  typeof OnboardingNameConflictResponseSchema
>

export const ConsumerSignupResponseSchema = z.object({
  status: z.literal(201),
  success: z.literal(true),
  message: z.string(),
  data: PendingConsumerSignupSchema,
})
export type ConsumerSignupResponse = z.infer<
  typeof ConsumerSignupResponseSchema
>

export const ConsumerResendResponseSchema = z.object({
  status: z.literal(200),
  success: z.literal(true),
  message: z.string(),
  data: PendingConsumerSignupSchema,
})
export type ConsumerResendResponse = z.infer<
  typeof ConsumerResendResponseSchema
>

export const ConsumerConfirmationResponseSchema = z.object({
  status: z.literal(200),
  success: z.literal(true),
  message: z.string(),
  data: CompletedConsumerSignupSchema,
})
export type ConsumerConfirmationResponse = z.infer<
  typeof ConsumerConfirmationResponseSchema
>

export const VendorOnboardingResponseSchema = z.object({
  status: z.literal(201),
  success: z.literal(true),
  message: z.string(),
  data: VendorOnboardingResultSchema,
})
export type VendorOnboardingResponse = z.infer<
  typeof VendorOnboardingResponseSchema
>

export const ProfileCreationResponseSchema = z.object({
  status: z.literal(201),
  success: z.literal(true),
  message: z.string(),
  data: z.literal(null).nullable(),
})
export type ProfileCreationResponse = z.infer<
  typeof ProfileCreationResponseSchema
>
