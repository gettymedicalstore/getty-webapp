import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import Module, { createRequire } from "node:module"
import { test } from "node:test"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createFormControl } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

const require = createRequire(import.meta.url),
  root = process.cwd()
const resolve = Module._resolveFilename
Module._resolveFilename = function (request, ...args) {
  return resolve.call(
    this,
    request.startsWith("@/") ? path.join(root, request.slice(2)) : request,
    ...args
  )
}
for (const extension of [".ts", ".tsx"])
  require.extensions[extension] = (module, filename) =>
    module._compile(
      ts.transpileModule(readFileSync(filename, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText,
      filename
    )
const schemas = require("../lib/form-schemas.ts")
const { loginSchema } = require("../features/auth/schemas/login-schema.tsx")
const {
  resetPasswordFormSchema,
} = require("../features/auth/schemas/password-reset-schema.ts")
const {
  ValidatedForm,
  FormInputField,
  FormInput,
  FormSelect,
  FormTextarea,
} = require("../components/shared/form/validated-form.tsx")

const product = {
  name: " Exam gloves ",
  description: " Powder-free gloves ",
  category: "category-id",
  price: "400.50",
  quantity: "0",
}
const signup = {
  name: "Medical practice",
  contact: "Test Buyer",
  email: "buyer@example.com",
  phone: "08012345678",
  country: "NG",
  address: "10 Example Street",
}

test("RHF only submits schema-valid data and supplies normalized numeric values", async () => {
  const form = createFormControl({
    resolver: zodResolver(schemas.productFormSchema),
    defaultValues: product,
    shouldUseNativeValidation: false,
  })
  for (const name of Object.keys(product)) form.register(name)
  let submitted, errors
  const submit = form.handleSubmit(
    (values) => {
      submitted = values
    },
    (issues) => {
      errors = issues
    }
  )
  form.setValue("quantity", "1.5")
  await submit()
  assert.equal(submitted, undefined)
  assert.match(errors.quantity.message, /whole number/)
  form.setValue("quantity", "12")
  await submit()
  assert.equal(submitted.quantity, 12)
  assert.equal(submitted.price, 400.5)
  assert.equal(submitted.name, "Exam gloves")
  assert.equal(submitted.description, "Powder-free gloves")
})

test("empty, negative, non-finite and fractional product stock is rejected", () => {
  for (const quantity of ["", " ", "-1", "NaN", "Infinity", "3.5"])
    assert.equal(
      schemas.productFormSchema.safeParse({ ...product, quantity }).success,
      false,
      quantity
    )
  assert.equal(schemas.productFormSchema.parse(product).quantity, 0)
  assert.equal(
    schemas.productFormSchema.safeParse({ ...product, price: "0" }).success,
    false
  )
  assert.equal(
    schemas.productOverviewFormSchema.safeParse({ ...product, price: "0" })
      .success,
    true
  )
})

test("signup validates the selected country and phone together", () => {
  assert.equal(schemas.signupFormSchema.safeParse(signup).success, true)
  for (const values of [
    { phone: "123" },
    { country: "US", phone: "+2348012345678" },
    { country: "ZZ" },
  ]) {
    const parsed = schemas.signupFormSchema.safeParse({ ...signup, ...values })
    assert.equal(parsed.success, false)
    assert.ok(parsed.error.issues.some((issue) => issue.path[0] === "phone"))
  }
  assert.equal(
    schemas.signupFormSchema.safeParse({ ...signup, email: "invalid" }).success,
    false
  )
})

test("verification codes must have exactly six digits and preserve leading zeros", () => {
  assert.equal(schemas.otpFormSchema.parse({ otp: "012345" }).otp, "012345")
  for (const otp of ["", "12345", "1234567", "12345678", "12345a"])
    assert.equal(schemas.otpFormSchema.safeParse({ otp }).success, false)
})

test("login and password changes preserve password whitespace and show confirmation errors", () => {
  assert.equal(
    loginSchema.parse({ email: " BUYER@example.com ", password: " secret " })
      .password,
    " secret "
  )
  const values = {
    currentPassword: " old password ",
    newPassword: "NewPassword123!",
    confirmation: "NewPassword123!",
  }
  assert.deepEqual(schemas.changePasswordFormSchema.parse(values), values)
  const parsed = schemas.changePasswordFormSchema.safeParse({
    ...values,
    confirmation: "DifferentPassword123!",
  })
  assert.equal(parsed.success, false)
  assert.deepEqual(parsed.error.issues[0].path, ["confirmation"])
  assert.equal(
    resetPasswordFormSchema.safeParse({
      password: "password",
      confirmPassword: "password",
    }).success,
    false
  )
})

test("stock corrections allow zero; receipts and removals require positive whole quantities", () => {
  assert.equal(
    schemas.stockFormSchema.safeParse({
      type: "correction",
      quantity: "0",
      reason: "Count corrected",
    }).success,
    true
  )
  assert.equal(
    schemas.stockFormSchema.safeParse({
      type: "receipt",
      quantity: "1",
      reason: "",
    }).success,
    true
  )
  for (const type of ["receipt", "removal"])
    assert.equal(
      schemas.stockFormSchema.safeParse({
        type,
        quantity: "0",
        reason: "Stock adjustment",
      }).success,
      false
    )
  for (const type of ["correction", "removal"]) {
    const parsed = schemas.stockFormSchema.safeParse({
      type,
      quantity: "1",
      reason: " ",
    })
    assert.equal(parsed.success, false)
    assert.ok(parsed.error.issues.some((issue) => issue.path[0] === "reason"))
  }
  assert.equal(
    schemas.thresholdFormSchema.safeParse({ threshold: "2147483648" }).success,
    false
  )
})

test("tax percentages are bounded and optional detail measurements stay nullable", () => {
  for (const rate of ["0", "7.5", "100"])
    assert.equal(
      schemas.taxFormSchema.safeParse({ name: "VAT", rate }).success,
      true
    )
  for (const rate of ["", "-1", "101"])
    assert.equal(
      schemas.taxFormSchema.safeParse({ name: "VAT", rate }).success,
      false
    )
  const result = schemas.productDetailsFormSchema.parse({
    sterile: "",
    disposable: "false",
    coldchain: "true",
    warranty: "",
    shelflife: "0",
    dispatch: "2",
  })
  assert.equal(result.warranty, null)
  assert.equal(result.shelflife, 0)
  assert.equal(result.dispatch, 2)
})

test("duplicate variant options report the specific option to correct", () => {
  const parsed = schemas.variantFormSchema.safeParse({
    name: "Box",
    sku: "BOX-100",
    price: "100",
    saleUnit: "box",
    unitsPerPack: "100",
    minimumOrderQuantity: "1",
    active: true,
    isDefault: false,
    options: [
      { name: "Size", value: "M" },
      { name: " Size ", value: "L" },
    ],
  })
  assert.equal(parsed.success, false)
  assert.deepEqual(parsed.error.issues[0].path, ["options", 1, "name"])
})

test("team profiles can omit a phone; vendor accounts require one", () => {
  assert.equal(schemas.phoneField.safeParse("----------").success, false)
  const values = {
    name: "Team Member",
    email: "member@example.com",
    phone: "",
    role: "operations",
  }
  assert.equal(
    schemas.accountFormSchema("profile").safeParse(values).success,
    true
  )
  assert.equal(
    schemas
      .accountFormSchema("vendor")
      .safeParse({ ...values, profile: "Administrator", country: "NG" })
      .success,
    false
  )
})

test("registration drafts allow incomplete fields and reject invalid supplied fields or files", () => {
  const values = {
    registrationNumber: "",
    businessType: "",
    year: "",
    website: "",
    contactName: "",
    email: "",
    phone: "",
    supplyType: "",
    capacity: "",
    brands: "",
    genuine: false,
    terms: false,
  }
  assert.equal(schemas.registrationDraftSchema.safeParse(values).success, true)
  for (const fields of [
    { year: "1800" },
    { year: String(new Date().getFullYear() + 1) },
    { email: "bad-email" },
    { website: "bad-url" },
    { capacity: "-1" },
    { license: new File(["x"], "file.txt", { type: "text/plain" }) },
  ])
    assert.equal(
      schemas.registrationDraftSchema.safeParse({ ...values, ...fields })
        .success,
      false
    )
})

test("image forms enforce single selection while allowing multiple images in a batch", () => {
  const images = [
    new File(["one"], "one.jpg", { type: "image/jpeg" }),
    new File(["two"], "two.png", { type: "image/png" }),
  ]
  assert.equal(
    schemas.productImagesFormSchema.safeParse({ images }).success,
    true
  )
  assert.equal(
    schemas.productSingleImageFormSchema.safeParse({ images: [images[0]] })
      .success,
    true
  )
  assert.equal(
    schemas.productSingleImageFormSchema.safeParse({ images }).success,
    false
  )
  for (const files of [
    [],
    [new File([], "empty.jpg", { type: "image/jpeg" })],
    [new File(["x"], "document.pdf", { type: "application/pdf" })],
    [null],
  ]) {
    assert.equal(
      schemas.productImagesFormSchema.safeParse({ images: files }).success,
      false
    )
    assert.equal(
      schemas.productSingleImageFormSchema.safeParse({ images: files }).success,
      false
    )
  }
})

test("RHF exposes email errors inline instead of invoking browser validity APIs", async () => {
  const form = createFormControl({
    resolver: zodResolver(schemas.newsletterSchema),
    defaultValues: { email: "invalid" },
    shouldUseNativeValidation: false,
  })
  const field = form.register("email")
  field.ref({
    name: "email",
    value: "invalid",
    setCustomValidity() {
      assert.fail("Native validity API called")
    },
    reportValidity() {
      assert.fail("Native validity API called")
    },
  })
  let submitted = false,
    errors
  await form.handleSubmit(
    () => {
      submitted = true
    },
    (issues) => {
      errors = issues
    }
  )()
  assert.equal(submitted, false)
  assert.match(errors.email.message, /valid email/)
})

test("shared rendered forms disable native validation and preserve default field values", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      ValidatedForm,
      { schema: schemas.productFormSchema, onSubmit() {} },
      React.createElement(FormInputField, {
        name: "name",
        label: "Name",
        defaultValue: "Gloves",
        required: true,
        minLength: 2,
      }),
      React.createElement(FormInput, {
        name: "quantity",
        type: "number",
        defaultValue: 0,
        required: true,
        min: 0,
      }),
      React.createElement(
        FormSelect,
        { name: "category", required: true, defaultValue: "category-id" },
        React.createElement("option", { value: "category-id" }, "Supplies")
      ),
      React.createElement(FormTextarea, {
        name: "description",
        defaultValue: "Powder free",
        required: true,
        maxLength: 1000,
      })
    )
  )
  assert.match(html, /<form[^>]*noValidate=""/i)
  assert.match(html, /value="Gloves"/)
  assert.match(html, /value="0"/)
  assert.match(html, /aria-required="true"/)
  assert.doesNotMatch(
    html,
    /\s(?:required|min|max|minLength|maxLength|pattern|step)=/i
  )
})
