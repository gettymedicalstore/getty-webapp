"use client"

import { useId, type Ref } from "react"
import { useController } from "react-hook-form"
import { FieldError } from "@/components/shared/form/validated-form"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

export default function OtpInput({
  value,
  onChange,
  length = 6,
  minLength = length,
  disabled = false,
  error = false,
  inputRef,
  onBlur,
  errorId,
}: {
  value: string
  onChange: (value: string) => void
  length?: number
  minLength?: number
  disabled?: boolean
  error?: boolean
  inputRef?: Ref<HTMLInputElement>
  onBlur?: () => void
  errorId?: string
}) {
  const id = useId()

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-[#414651]">
        Verification code
        <span aria-hidden="true" className="text-destructive ml-1">
          *
        </span>
      </label>
      <InputOTP
        id={id}
        ref={inputRef}
        name="otp"
        value={value}
        onChange={onChange}
        maxLength={length}
        pattern={REGEXP_ONLY_DIGITS}
        pasteTransformer={(pasted) => pasted.replace(/\D/g, "")}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-required
        disabled={disabled}
        aria-invalid={error}
        aria-describedby={errorId}
        onBlur={onBlur}
        aria-label={`Verification code, ${minLength === length ? length : `${minLength} to ${length}`} digits`}
        containerClassName="w-full"
      >
        <InputOTPGroup className="w-full">
          {Array.from({ length }, (_, index) => (
            <InputOTPSlot
              key={index}
              index={index}
              aria-invalid={error}
              className={index >= minLength ? "bg-[#f8faf8]" : undefined}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  )
}

export function FormOtpInput({ disabled = false }: { disabled?: boolean }) {
  const { field, fieldState } = useController({ name: "otp", defaultValue: "" })
  const errorId = `${useId()}-error`
  return (
    <div>
      <OtpInput
        inputRef={field.ref}
        onBlur={field.onBlur}
        errorId={fieldState.error ? errorId : undefined}
        value={field.value}
        onChange={field.onChange}
        disabled={disabled}
        error={Boolean(fieldState.error)}
      />
      <FieldError id={errorId} message={fieldState.error?.message} />
    </div>
  )
}
