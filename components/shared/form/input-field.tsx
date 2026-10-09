"use client"

import { Eye, EyeOff } from "lucide-react"
import {
  forwardRef,
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { withoutNativeConstraints } from "./without-native-constraints"

type InputFieldProps = Omit<ComponentPropsWithoutRef<typeof Input>, "id"> & {
  id?: string
  label?: string
  error?: string
  hint?: string
  requiredIndicator?: boolean
  containerClassName?: string
  labelClassName?: string
  inputClassName?: string
  errorClassName?: string
  hintClassName?: string
  leftElement?: ReactNode
  rightElement?: ReactNode
  showPasswordToggle?: boolean
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      id,
      label,
      error,
      hint,
      type = "text",
      required,
      requiredIndicator = true,
      containerClassName,
      labelClassName,
      inputClassName,
      errorClassName,
      hintClassName,
      leftElement,
      rightElement,
      showPasswordToggle,
      disabled,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()

    const inputId = id ?? generatedId
    const errorId = `${inputId}-error`
    const hintId = `${inputId}-hint`

    const isPasswordField = type === "password"
    const canTogglePassword = showPasswordToggle ?? isPasswordField

    const [showPassword, setShowPassword] = useState(false)

    const resolvedType =
      isPasswordField && canTogglePassword && showPassword ? "text" : type

    const describedBy = [
      ariaDescribedBy,
      hint ? hintId : undefined,
      error ? errorId : undefined,
    ]
      .filter(Boolean)
      .join(" ")

    return (
      <div className={cn("w-full space-y-2", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "block text-sm font-medium text-[#414651]",
              labelClassName
            )}
          >
            {label}
            {required && requiredIndicator && (
              <span aria-hidden="true" className="text-destructive ml-1">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative">
          {leftElement && (
            <div className="pointer-events-none absolute top-1/2 left-3 flex -translate-y-1/2 items-center text-[#5e6f63]">
              {leftElement}
            </div>
          )}

          <Input
            ref={ref}
            id={inputId}
            type={resolvedType}
            aria-required={required || undefined}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy || undefined}
            className={cn(
              "focus-visible:border-primary focus-visible:ring-primary/10 h-13 rounded-lg border-[#dce2de] bg-white px-3.5 text-base shadow-none transition-[border-color,box-shadow] placeholder:text-[#8b938e] hover:border-[#bac7be] focus-visible:ring-3 sm:text-sm",
              leftElement && "pl-10",
              (rightElement || canTogglePassword) && "pr-11",
              error &&
                "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
              inputClassName
            )}
            {...withoutNativeConstraints(props)}
          />

          {canTogglePassword && isPasswordField ? (
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              disabled={disabled}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-[#535862] transition hover:bg-[#F5F5F5] disabled:pointer-events-none disabled:opacity-50"
            >
              {showPassword ? (
                <EyeOff aria-hidden className="size-4" />
              ) : (
                <Eye aria-hidden className="size-4" />
              )}
            </button>
          ) : (
            rightElement && (
              <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center">
                {rightElement}
              </div>
            )
          )}
        </div>

        {hint && !error && (
          <p
            id={hintId}
            className={cn("text-xs leading-5 text-[#5e6f63]", hintClassName)}
          >
            {hint}
          </p>
        )}

        {error && (
          <p
            id={errorId}
            role="alert"
            className={cn("text-xs leading-5 text-red-600", errorClassName)}
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

InputField.displayName = "InputField"

export default InputField
