import type { Metadata } from "next"
import { Geist, Inter } from "next/font/google"

import "./globals.css"
import Providers from "./providers"

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
})

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Getty Medical Store",
    template: "%s | Getty Medical Store",
  },
  description:
    "Your trusted online pharmacy for quality medicines and healthcare products.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
