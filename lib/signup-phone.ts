import parsePhoneNumber, {
  getCountries,
  getCountryCallingCode,
} from "libphonenumber-js/min"

const names = new Intl.DisplayNames(["en"], { type: "region" })
const unofficialCodes = new Set(["AC", "TA", "XK"])

export const signupCountries = getCountries()
  .filter((code) => !unofficialCodes.has(code))
  .sort((a, b) => (a === "NG" ? -1 : b === "NG" ? 1 : a < b ? -1 : 1))
  .map((code) => ({
    code,
    name: names.of(code) ?? code,
    dial: `+${getCountryCallingCode(code)}`,
  }))

/** Extract ISO country and submit a validated E.164 phone to Getty onboarding. */
export function signupPhoneDetails(
  phone: FormDataEntryValue | null,
  country: FormDataEntryValue | null
) {
  const selected = signupCountries.find((item) => item.code === country)
  if (!selected) throw new Error("Choose a country calling code.")
  if (typeof phone !== "string") throw new Error("Enter a phone number.")

  const cleaned = phone.trim().replace(/[\s().-]/g, "")
  const normalized = cleaned.startsWith("00") ? `+${cleaned.slice(2)}` : cleaned
  if (!/^\+?\d+$/.test(normalized))
    throw new Error("Enter a phone number using digits only.")
  const parsed = parsePhoneNumber(normalized, {
    defaultCountry: selected.code,
    extract: false,
  })
  if (!parsed?.isValid())
    throw new Error(`Enter a valid phone number for ${selected.name}.`)
  if (parsed.country && parsed.country !== selected.code)
    throw new Error(`Choose the country calling code for ${parsed.country}.`)

  return { phone: parsed.number, country: selected.code }
}
