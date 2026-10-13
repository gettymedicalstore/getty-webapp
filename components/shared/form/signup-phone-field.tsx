"use client"

import { useId } from "react"
import { useController } from "react-hook-form"
import { FieldError } from "./validated-form"
import { ChevronDown } from "lucide-react"
import { signupCountries } from "@/lib/signup-phone"

export default function SignupPhoneField({
  disabled = false,
}: {
  disabled?: boolean
}) {
  const phoneId = useId()
  const countryId = useId()
  const { field: countryField } = useController({
    name: "country",
    defaultValue: "NG",
  })
  const { field: phoneField, fieldState } = useController({
    name: "phone",
    defaultValue: "",
  })
  const countryCode = countryField.value
  const errorId = `${phoneId}-error`
  const country =
    signupCountries.find((item) => item.code === countryCode) ??
    signupCountries[0]

  return (
    <div className="space-y-2">
      <label
        htmlFor={phoneId}
        className="block text-sm font-medium text-[#414651]"
      >
        Phone number
        <span aria-hidden="true" className="text-destructive ml-1">
          *
        </span>
      </label>
      <div className="focus-within:border-primary focus-within:ring-primary/10 flex h-13 min-w-0 overflow-hidden rounded-lg border border-[#dce2de] bg-white shadow-sm transition-[border-color,box-shadow] focus-within:ring-3 hover:border-[#bac7be]">
        <div className="relative flex w-[116px] shrink-0 items-center border-r border-[#e2e8e3] bg-[#f8faf8] sm:w-[128px]">
          <label htmlFor={countryId} className="sr-only">
            Country calling code
          </label>
          <span
            aria-hidden="true"
            className="pointer-events-none truncate pr-10 pl-3 text-sm font-medium text-[#304238]"
          >
            {country.code} {country.dial}
          </span>
          <select
            id={countryId}
            {...countryField}
            data-select-indicator="custom"
            disabled={disabled}
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
          >
            {signupCountries.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name} ({item.dial})
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className={`pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2 text-[#687b6e] ${disabled ? "opacity-60" : ""}`}
          />
        </div>
        <input
          id={phoneId}
          {...phoneField}
          type="tel"
          autoComplete="tel-national"
          inputMode="tel"
          placeholder={
            countryCode === "NG" ? "080 1234 5678" : "National number"
          }
          aria-required
          aria-invalid={Boolean(fieldState.error)}
          aria-describedby={fieldState.error ? errorId : undefined}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent px-3.5 text-base text-[#252B37] outline-none placeholder:text-[#A4A7AE] disabled:opacity-50 sm:text-sm"
        />
      </div>
      <FieldError id={errorId} message={fieldState.error?.message} />
    </div>
  )
}
