"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { submitContactMessage } from "../api/submit-contact-message"
import {
  contactSchema,
  type ContactFormValues,
} from "../schemas/contact-schema"

export default function ContactForm() {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    shouldUseNativeValidation: false,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
  })

  const contactMutation = useMutation({
    mutationFn: submitContactMessage,

    onSuccess: () => {
      toast.success("Your message has been submitted")
      form.reset()
    },

    onError: () => {
      toast.error("Your message could not be submitted")
    },
  })

  function onSubmit(values: ContactFormValues) {
    contactMutation.mutate(values)
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
    >
      <FormField
        id="name"
        label="Full name"
        error={form.formState.errors.name?.message}
      >
        <Input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Enter your full name"
          aria-invalid={Boolean(form.formState.errors.name)}
          {...form.register("name")}
          className="focus-visible:border-primary focus-visible:ring-primary/10 h-11 rounded-lg border-[#D5D7DA] bg-white px-3.5 text-sm text-[#252B37] shadow-[0_1px_2px_0_rgba(10,13,18,0.05)] placeholder:text-[#A4A7AE] focus-visible:ring-1"
        />
      </FormField>

      <FormField
        id="email"
        label="Email Address"
        error={form.formState.errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email address"
          aria-invalid={Boolean(form.formState.errors.email)}
          {...form.register("email")}
          className="focus-visible:border-primary focus-visible:ring-primary/10 h-11 rounded-lg border-[#D5D7DA] bg-white px-3.5 text-sm text-[#252B37] shadow-[0_1px_2px_0_rgba(10,13,18,0.05)] placeholder:text-[#A4A7AE] focus-visible:ring-1"
        />
      </FormField>

      <FormField
        id="phone"
        label="Phone Number"
        error={form.formState.errors.phone?.message}
      >
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="Enter your phone number"
          aria-invalid={Boolean(form.formState.errors.phone)}
          {...form.register("phone")}
          className="focus-visible:border-primary focus-visible:ring-primary/10 h-11 rounded-lg border-[#D5D7DA] bg-white px-3.5 text-sm text-[#252B37] shadow-[0_1px_2px_0_rgba(10,13,18,0.05)] placeholder:text-[#A4A7AE] focus-visible:ring-1"
        />
      </FormField>

      <FormField
        id="subject"
        label="Subject"
        error={form.formState.errors.subject?.message}
      >
        <Input
          id="subject"
          type="text"
          placeholder="Enter a subject"
          aria-invalid={Boolean(form.formState.errors.subject)}
          {...form.register("subject")}
          className="focus-visible:border-primary focus-visible:ring-primary/10 h-11 rounded-lg border-[#D5D7DA] bg-white px-3.5 text-sm text-[#252B37] shadow-[0_1px_2px_0_rgba(10,13,18,0.05)] placeholder:text-[#A4A7AE] focus-visible:ring-1"
        />
      </FormField>

      <FormField
        id="message"
        label="Message"
        error={form.formState.errors.message?.message}
      >
        <Textarea
          id="message"
          rows={5}
          placeholder="Tell us about your questions and how we can help"
          aria-invalid={Boolean(form.formState.errors.message)}
          {...form.register("message")}
          className="focus-visible:border-primary focus-visible:ring-primary/10 min-h-32 resize-y rounded-lg border-[#D5D7DA] bg-white px-3.5 py-3 text-sm leading-6 text-[#252B37] shadow-[0_1px_2px_0_rgba(10,13,18,0.05)] placeholder:text-[#A4A7AE] focus-visible:ring-1"
        />
      </FormField>

      <Button
        type="submit"
        disabled={contactMutation.isPending}
        className="bg-primary hover:bg-primary-darker h-11 w-full cursor-pointer rounded-lg text-sm font-semibold text-white shadow-none transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {contactMutation.isPending ? "Sending..." : "Send Message"}
      </Button>
    </form>
  )
}

type FormFieldProps = {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}

function FormField({ id, label, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="text-sm leading-5 font-medium text-[#414651]"
      >
        {label}
      </Label>

      {children}

      {error ? (
        <p role="alert" className="text-xs leading-[18px] text-[#D92D20]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
