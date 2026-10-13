import { z } from "zod"
import { signupPhoneDetails } from "./signup-phone"

export const textField = (label: string, min = 1, max = 1000) =>
  z
    .string()
    .trim()
    .min(
      min,
      `${label} must contain at least ${min} character${min === 1 ? "" : "s"}.`
    )
    .max(max, `${label} must contain at most ${max} characters.`)
export const emailField = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "Use at most 254 characters for your email address.")
  .pipe(z.email("Enter a valid email address."))
export const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[\d\s().-]{10,36}$/, "Enter a valid phone number.")
  .refine((value) => {
    const digits = value.replace(/\D/g, "").length
    return digits >= 10 && digits <= 15
  }, "Enter a valid phone number.")
export const optionalText = z.string().trim().default("")
export const numericField = (
  label: string,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  integer = false
) =>
  z
    .union([z.string(), z.number()])
    .refine(
      (value) => String(value).trim() !== "" && Number.isFinite(Number(value)),
      `Enter a valid ${label.toLowerCase()}.`
    )
    .transform(Number)
    .pipe(
      z
        .number()
        .min(min, `${label} must be at least ${min}.`)
        .max(max, `${label} must be at most ${max}.`)
        .refine(
          (value) => !integer || Number.isSafeInteger(value),
          `${label} must be a whole number.`
        )
    )
export const optionalNumberField = (label: string) =>
  z
    .union([z.literal(""), numericField(label)])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value))

export const searchSchema = z.object({
  search: optionalText.pipe(
    z.string().max(200, "Use at most 200 characters for your search.")
  ),
})
export const inventoryFilterSchema = searchSchema.extend({
  status: z.enum(["", "in", "low", "out"]),
})
export const newsletterSchema = z.object({ email: emailField })
export const trackingSchema = z.object({
  orderNumber: textField("Order number", 1, 100),
})
export const otpFormSchema = z.object({
  otp: z
    .string()
    .regex(/^\d{6}$/, "Enter the complete 6-digit verification code."),
})
export const signupFormSchema = z
  .object({
    name: textField("Organisation name", 2, 180),
    contact: textField("Contact person", 2, 180),
    email: emailField,
    phone: textField("Phone number", 1, 36),
    country: textField("Country", 2, 2),
    address: textField("Address", 2),
  })
  .superRefine((values, context) => {
    try {
      signupPhoneDetails(values.phone, values.country)
    } catch (error) {
      context.addIssue({
        code: "custom",
        path: ["phone"],
        message:
          error instanceof Error
            ? error.message
            : "Enter a valid phone number.",
      })
    }
  })
export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z
    .string()
    .min(8, "Use at least eight characters for your new password."),
})
export const changePasswordFormSchema = changePasswordInputSchema
  .extend({
    confirmation: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.newPassword === values.confirmation, {
    path: ["confirmation"],
    message: "The new passwords do not match.",
  })
export const preferencesFormSchema = z.object({
  orderUpdates: z.boolean(),
  offers: z.boolean(),
})
export const addressFormSchema = z.object({
  label: textField("Address label", 2),
  recipient: textField("Recipient name", 2),
  phone: phoneField,
  line1: textField("Street address", 2),
  city: textField("City", 2),
  state: textField("State", 2),
})

export const categoryFormSchema = z.object({
  name: textField("Name", 2),
  description: textField("Description", 2),
  parent: optionalText,
})
export const taxFormSchema = z.object({
  name: textField("Tax name", 2),
  rate: numericField("Tax rate", 0, 100),
})
export const productFormSchema = z.object({
  name: textField("Product name", 2),
  brand: optionalText,
  description: textField("Description", 2, 10000),
  category: textField("Category"),
  price: numericField("Price", 0.01),
  quantity: numericField("Quantity", 0, Number.MAX_SAFE_INTEGER, true),
})
export const productOverviewFormSchema = productFormSchema.extend({
  price: numericField("Price"),
})
export const productDetailsFormSchema = z.object({
  manufacturer: optionalText,
  model: optionalText,
  origin: optionalText,
  usage: optionalText,
  instructions: optionalText,
  warnings: optionalText,
  sterile: z.enum(["", "true", "false"]),
  disposable: z.enum(["", "true", "false"]),
  coldchain: z.enum(["", "true", "false"]),
  shelflife: optionalNumberField("Shelf life"),
  warranty: optionalNumberField("Warranty"),
  dispatch: optionalNumberField("Dispatch time"),
})
export const specificationFormSchema = z.object({
  name: textField("Specification name"),
  value: textField("Value"),
  unit: optionalText,
  ordinal: numericField("Display order", 0, Number.MAX_SAFE_INTEGER, true),
})
export const taxAssignmentFormSchema = z.object({ tax: textField("Tax rate") })
export const variantFormSchema = z
  .object({
    name: textField("Variant name"),
    sku: textField("SKU"),
    price: numericField("Price"),
    saleUnit: textField("Sale unit"),
    unitsPerPack: numericField(
      "Units per pack",
      1,
      Number.MAX_SAFE_INTEGER,
      true
    ),
    minimumOrderQuantity: numericField(
      "Minimum order quantity",
      1,
      Number.MAX_SAFE_INTEGER,
      true
    ),
    active: z.boolean(),
    isDefault: z.boolean(),
    barcode: optionalText,
    weightKg: optionalNumberField("Weight"),
    lengthCm: optionalNumberField("Length"),
    widthCm: optionalNumberField("Width"),
    heightCm: optionalNumberField("Height"),
    options: z
      .array(
        z.object({
          name: textField("Option name"),
          value: textField("Option value"),
        })
      )
      .default([]),
  })
  .superRefine((values, context) => {
    const names = new Set<string>()
    values.options.forEach((option, index) => {
      if (names.has(option.name))
        context.addIssue({
          code: "custom",
          path: ["options", index, "name"],
          message: "Use a unique option name.",
        })
      names.add(option.name)
    })
  })
export const stockFormSchema = z
  .object({
    type: z.enum(["correction", "receipt", "removal"]),
    quantity: numericField("Quantity", 0, Number.MAX_SAFE_INTEGER, true),
    reason: optionalText.pipe(
      z.string().max(1000, "Use at most 1000 characters for the reason.")
    ),
  })
  .superRefine((values, context) => {
    if (values.type !== "correction" && values.quantity < 1)
      context.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "Enter a quantity of at least 1.",
      })
    if (values.type !== "receipt" && !values.reason)
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Enter a reason for this adjustment.",
      })
  })
export const thresholdFormSchema = z.object({
  threshold: numericField("Threshold", 0, 2147483647, true),
})
export const accountFormSchema = (kind: "vendor" | "profile") =>
  z.object({
    name: textField("Name", 2, kind === "vendor" ? 255 : 180),
    email: emailField,
    phone:
      kind === "vendor"
        ? phoneField
        : z.union([z.literal(""), phoneField]).default(""),
    ...(kind === "vendor"
      ? {
          profile: textField("Administrator name", 2, 180),
          country: z
            .string()
            .trim()
            .regex(/^[A-Z]{2}$/, "Use a two-letter country code, such as NG."),
        }
      : {
          role: z.enum([
            "user",
            "operations",
            "finance",
            "dispatcher",
            "driver",
            "vendor",
            "admin",
            "superadmin",
          ]),
        }),
  })

// Saving an onboarding draft accepts incomplete fields, but still validates supplied values.
export const documentFileSchema = z
  .custom<File>(
    (value) => typeof File !== "undefined" && value instanceof File,
    "Choose a file."
  )
  .refine(
    (file) =>
      ["application/pdf", "image/png", "image/jpeg"].includes(file?.type),
    "Choose a PDF, PNG or JPG."
  )
  .refine(
    (file) => file?.size > 0 && file.size <= 5 * 1024 * 1024,
    "Choose a file of 5 MB or less."
  )
export const productImageSchema = z
  .custom<File>(
    (value) => typeof File !== "undefined" && value instanceof File,
    "Choose an image."
  )
  .refine(
    (file) =>
      ["image/jpeg", "image/png", "image/webp"].includes(file?.type) &&
      /\.(jpe?g|png|webp)$/i.test(file?.name ?? ""),
    "Choose a JPG, PNG or WebP image."
  )
  .refine((file) => file?.size > 0, "Choose a non-empty image.")
export const productImagesFormSchema = z.object({
  images: z
    .array(productImageSchema)
    .min(1, "Choose at least one product image."),
})
export const productSingleImageFormSchema = productImagesFormSchema.extend({
  images: productImagesFormSchema.shape.images.max(
    1,
    "Choose only one product image."
  ),
})
export const replacementImageFormSchema = z.object({
  image: productImageSchema,
})
export const registrationDraftSchema = z.object({
  registrationNumber: optionalText,
  businessType: z.enum([
    "",
    "Manufacturer",
    "Wholesaler",
    "Distributor",
    "Retailer",
  ]),
  year: z.union([
    z.literal(""),
    numericField("Year of establishment", 1900, new Date().getFullYear(), true),
  ]),
  website: z.union([z.literal(""), z.url("Enter a valid website URL.")]),
  contactName: optionalText,
  email: z.union([z.literal(""), emailField]),
  phone: z.union([z.literal(""), phoneField]),
  supplyType: z.enum([
    "",
    "Pharmaceuticals",
    "Surgical equipment",
    "Medical consumables",
    "Diagnostic equipment",
    "Hospital equipment",
    "Other",
  ]),
  capacity: z.union([
    z.literal(""),
    numericField("Inventory capacity", 1, Number.MAX_SAFE_INTEGER, true),
  ]),
  brands: optionalText,
  genuine: z.boolean(),
  terms: z.boolean(),
  license: documentFileSchema.nullable().default(null),
  certificate: documentFileSchema.nullable().default(null),
})
