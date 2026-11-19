"use client"

import { useState } from "react"
import { useController } from "react-hook-form"
import InputField from "./input-field"

const priceFormatter = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export default function PriceInput({
  defaultValue,
  label = "Price (NGN)",
  id = "record-price",
  currency = "NGN",
}: {
  defaultValue?: number | string
  label?: string
  id?: string
  currency?: string
}) {
  const { field, fieldState } = useController({
    name: "price",
    defaultValue: defaultValue ?? "",
  })
  const [focused, setFocused] = useState(false)
  const rawValue = String(field.value ?? "")
  const displayedValue =
    !focused && rawValue && Number.isFinite(Number(rawValue))
      ? priceFormatter.format(Number(rawValue))
      : rawValue
  const symbol = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
  })
    .formatToParts(0)
    .find((part) => part.type === "currency")?.value

  return (
    <InputField
      id={id}
      name={field.name}
      label={label}
      required
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder="0.00"
      leftElement={<span aria-hidden="true">{symbol}</span>}
      value={displayedValue}
      error={fieldState.error?.message}
      ref={(element) => field.ref(element)}
      onFocus={() => setFocused(true)}
      onChange={(event) => {
        const [whole, ...decimal] = event.target.value
          .replace(/[^\d.]/g, "")
          .split(".")
        field.onChange(
          decimal.length
            ? `${whole || "0"}.${decimal.join("").slice(0, 2)}`
            : whole
        )
      }}
      onBlur={() => {
        field.onBlur()
        setFocused(false)
      }}
    />
  )
}
