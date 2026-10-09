"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react"
import {
  FormProvider,
  useController,
  useForm,
  useWatch,
  type DefaultValues,
  type FieldValues,
  type SubmitHandler,
} from "react-hook-form"
import type { z } from "zod"
import InputField from "./input-field"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { withoutNativeConstraints } from "./without-native-constraints"

/** All validation is handled by the schema; browsers never display validation popups. */
export function ValidatedForm<
  Input extends FieldValues,
  Output extends FieldValues,
>({
  schema,
  defaultValues,
  values: controlledValues,
  onSubmit,
  children,
  autoSubmit,
  ...props
}: Omit<ComponentProps<"form">, "onSubmit" | "action" | "children"> & {
  schema: z.ZodType<Output, Input>
  defaultValues?: DefaultValues<Input>
  values?: Input
  onSubmit: SubmitHandler<Output>
  children: ReactNode
  autoSubmit?: number
}) {
  const form = useForm<Input, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues,
    values: controlledValues,
    shouldUnregister: false,
    shouldUseNativeValidation: false,
  })
  const values = useWatch({
    control: form.control,
    disabled: autoSubmit === undefined,
  })
  const signature = JSON.stringify(values)
  const submit = useRef(onSubmit)
  useEffect(() => {
    submit.current = onSubmit
  }, [onSubmit])
  useEffect(() => {
    if (autoSubmit === undefined) return
    const timer = window.setTimeout(() => {
      void form.handleSubmit(submit.current)()
    }, autoSubmit)
    return () => window.clearTimeout(timer)
  }, [signature, autoSubmit, form])
  return (
    <FormProvider {...form}>
      <form {...props} noValidate onSubmit={form.handleSubmit(onSubmit)}>
        {children}
      </form>
    </FormProvider>
  )
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="mt-2 text-xs leading-5 text-red-600">
      {message}
    </p>
  ) : null
}

export const FormInputField = forwardRef<
  HTMLInputElement,
  ComponentProps<typeof InputField> & { name: string }
>(function FormInputField(
  { name, defaultValue, onChange, onBlur, ...props },
  ref
) {
  const { field, fieldState } = useController({
    name,
    defaultValue: defaultValue ?? "",
  })
  return (
    <InputField
      {...props}
      {...field}
      value={field.value ?? ""}
      error={fieldState.error?.message}
      ref={(element) => {
        field.ref(element)
        if (typeof ref === "function") ref(element)
        else if (ref) ref.current = element
      }}
      onChange={(event) => {
        field.onChange(event)
        onChange?.(event)
      }}
      onBlur={(event) => {
        field.onBlur()
        onBlur?.(event)
      }}
    />
  )
})

type ControlProps<Tag extends "input" | "select" | "textarea"> =
  ComponentProps<Tag> & { name: string; containerClassName?: string }

/** Native-looking controls with RHF state and accessible, inline schema errors. */
export function FormInput({
  name,
  defaultValue,
  defaultChecked,
  required,
  onChange,
  onBlur,
  containerClassName,
  ...props
}: ControlProps<"input">) {
  const checkbox = props.type === "checkbox"
  const { field, fieldState } = useController({
    name,
    defaultValue: checkbox ? (defaultChecked ?? false) : (defaultValue ?? ""),
  })
  const generatedId = useId(),
    id = props.id ?? generatedId,
    errorId = `${id}-error`
  return (
    <span className={cn("block min-w-0", containerClassName)}>
      <input
        {...withoutNativeConstraints(props)}
        name={field.name}
        id={id}
        ref={(element) => field.ref(element)}
        value={checkbox ? undefined : (field.value ?? "")}
        checked={checkbox ? Boolean(field.value) : undefined}
        aria-required={required || undefined}
        aria-invalid={Boolean(fieldState.error)}
        aria-describedby={
          fieldState.error ? errorId : props["aria-describedby"]
        }
        onChange={(event) => {
          field.onChange(checkbox ? event.target.checked : event.target.value)
          onChange?.(event)
        }}
        onBlur={(event) => {
          field.onBlur()
          onBlur?.(event)
        }}
      />
      <FieldError id={errorId} message={fieldState.error?.message} />
    </span>
  )
}

export function FormSelect({
  name,
  defaultValue,
  required,
  onChange,
  onBlur,
  containerClassName,
  ...props
}: ControlProps<"select">) {
  const { field, fieldState } = useController({
    name,
    defaultValue: defaultValue ?? "",
  })
  const generatedId = useId(),
    id = props.id ?? generatedId,
    errorId = `${id}-error`
  return (
    <span className={cn("block min-w-0", containerClassName)}>
      <select
        {...props}
        {...field}
        id={id}
        value={field.value ?? ""}
        aria-required={required || undefined}
        aria-invalid={Boolean(fieldState.error)}
        aria-describedby={
          fieldState.error ? errorId : props["aria-describedby"]
        }
        onChange={(event) => {
          field.onChange(event)
          onChange?.(event)
        }}
        onBlur={(event) => {
          field.onBlur()
          onBlur?.(event)
        }}
      />
      <FieldError id={errorId} message={fieldState.error?.message} />
    </span>
  )
}

export function FormTextarea({
  name,
  defaultValue,
  required,
  onChange,
  onBlur,
  containerClassName,
  ...props
}: ControlProps<"textarea">) {
  const { field, fieldState } = useController({
    name,
    defaultValue: defaultValue ?? "",
  })
  const generatedId = useId(),
    id = props.id ?? generatedId,
    errorId = `${id}-error`
  return (
    <span className={cn("block min-w-0", containerClassName)}>
      <Textarea
        {...withoutNativeConstraints(props)}
        {...field}
        id={id}
        value={field.value ?? ""}
        aria-required={required || undefined}
        aria-invalid={Boolean(fieldState.error)}
        aria-describedby={
          fieldState.error ? errorId : props["aria-describedby"]
        }
        onChange={(event) => {
          field.onChange(event)
          onChange?.(event)
        }}
        onBlur={(event) => {
          field.onBlur()
          onBlur?.(event)
        }}
      />
      <FieldError id={errorId} message={fieldState.error?.message} />
    </span>
  )
}
