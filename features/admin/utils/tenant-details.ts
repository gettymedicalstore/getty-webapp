export type TenantRecord = Record<string, unknown>
export type TenantTab = "overview" | "contact" | "business" | "account"
export const tenantTabs: { id: TenantTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "contact", label: "Contact & address" },
  { id: "business", label: "Business details" },
  { id: "account", label: "Account information" },
]

const contactKeys = new Set([
  "email",
  "phone",
  "telephone",
  "mobile",
  "country",
  "timezone",
  "locale",
  "address",
  "addresses",
  "city",
  "state",
  "postcode",
  "postalcode",
  "zipcode",
  "contact",
  "contacts",
  "contactname",
  "contactperson",
  "primarycontact",
  "billingaddress",
  "shippingaddress",
  "deliveryaddress",
])
const businessKeys = new Set([
  "business",
  "company",
  "organisation",
  "organization",
  "businessname",
  "companyname",
  "registration",
  "registrationnumber",
  "companyregistrationnumber",
  "registrationstatus",
  "businessregistrationnumber",
  "businesstype",
  "website",
  "yearofestablishment",
  "established",
  "taxid",
  "taxnumber",
  "vatnumber",
  "license",
  "licence",
  "documents",
  "certificates",
  "brands",
  "capacity",
  "inventorycapacity",
  "suppliestype",
  "medicalsuppliestype",
  "organisationstatus",
  "organizationstatus",
  "onboarding",
  "onboardingstatus",
])
const normalize = (key: string) => key.replace(/[_\s-]/g, "").toLowerCase()
export function isAccountDetailField(key: string) {
  return !/(password|token|secret|credential|authorization|cookie|privatekey|apikey|otp)/i.test(
    normalize(key)
  )
}
export function tenantFieldLabel(key: string) {
  const labels: Record<string, string> = {
    id: "Account ID",
    timezone: "Time zone",
    taxid: "Tax ID",
    vatnumber: "VAT number",
    postcode: "Postal code",
    zipcode: "Postal code",
    type: "Account type",
  }
  return (
    labels[normalize(key)] ??
    key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/^./, (letter) => letter.toUpperCase())
  )
}
export function tenantText(record: TenantRecord, key: string) {
  return typeof record[key] === "string" ? (record[key] as string) : ""
}
export function tenantDetailGroups(record: TenantRecord) {
  const groups: Record<Exclude<TenantTab, "overview">, [string, unknown][]> = {
    contact: [],
    business: [],
    account: [],
  }
  for (const [key, value] of Object.entries(record)) {
    if (!isAccountDetailField(key)) continue
    const normalized = normalize(key)
    const group = contactKeys.has(normalized)
      ? "contact"
      : businessKeys.has(normalized)
        ? "business"
        : "account"
    groups[group].push([key, value])
  }
  return groups
}
