"use client"

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react"

import { cn } from "@/lib/utils"

type OtpInputProps = {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
  error?: boolean
}

export default function OtpInput({
  value,
  onChange,
  length = 4,
  disabled = false,
  error = false,
}: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const digits = Array.from(
    {
      length,
    },
    (_, index) => value[index] ?? ""
  )

  function updateDigit(index: number, rawValue: string) {
    const digit = rawValue.replace(/\D/g, "").slice(-1)

    const nextDigits = [...digits]
    nextDigits[index] = digit

    onChange(nextDigits.join(""))

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    index: number
  ) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()

    const pastedDigits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length)

    if (!pastedDigits) {
      return
    }

    onChange(pastedDigits)

    const targetIndex = Math.min(pastedDigits.length, length) - 1

    inputRefs.current[Math.max(0, targetIndex)]?.focus()
  }

  return (
    <div className="flex justify-center gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`Verification digit ${index + 1}`}
          onChange={(event) => updateDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onPaste={handlePaste}
          className={cn(
            "size-14 rounded-lg border bg-white text-center text-3xl font-semibold transition outline-none sm:size-16",
            "focus:border-[#12B76A] focus:ring-4 focus:ring-[#12B76A]/10",
            error
              ? "border-red-400 text-red-600"
              : digit
                ? "border-[#12B76A] text-[#058A51]"
                : "border-[#D5D7DA] text-[#181D27]",
            disabled && "cursor-not-allowed opacity-50"
          )}
        />
      ))}
    </div>
  )
}
