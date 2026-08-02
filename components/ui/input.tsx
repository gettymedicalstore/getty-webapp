import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 focus-visible:border-primary focus-visible:ring-primary/10 py-2.5font-normal h-11 w-full min-w-0 rounded-xl border border-[#D5D7DA] bg-white px-3.5 py-1 tracking-normal text-[#717680] shadow-[0_1px_2px_0_rgba(10,13,18,0.05)] transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#A4A7AE] focus-visible:ring-1 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-1",
        className
      )}
      {...props}
    />
  )
}

export { Input }
