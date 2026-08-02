import Link from "next/link"

import LoginPageForm from "./login-page-form"

type LoginPageProps = {
  searchParams: Promise<{
    redirect?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect } = await searchParams

  return (
    <div className="relative isolate overflow-hidden bg-[#F7F9F8]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top_left,rgba(5,138,81,0.16),transparent_58%)]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-40 -right-28 -z-10 size-80 rounded-full bg-[#DDF4E9] blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 -left-32 -z-10 size-96 rounded-full bg-[#EAF2EE] blur-3xl"
      />

      <section
        aria-labelledby="login-page-title"
        className="mx-auto flex min-h-[calc(100vh-160px)] w-full max-w-330 items-center justify-center px-4 py-10 sm:px-6 sm:py-14 lg:px-8"
      >
        <div className="w-full max-w-134">
          <div className="overflow-hidden rounded-2xl border border-[#E9EAEB] bg-white shadow-[0_24px_70px_-20px_rgba(10,13,18,0.22)]">
            <h1 id="login-page-title" className="sr-only">
              Log in to your account
            </h1>

            <LoginPageForm redirectTo={redirect} />
          </div>
        </div>
      </section>
    </div>
  )
}
