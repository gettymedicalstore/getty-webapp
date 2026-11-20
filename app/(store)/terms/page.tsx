import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service & Returns",
  description:
    "Read Getty Medical Stores’ shopping terms, delivery information, cancellation process and return policy.",
}

const links = [
  ["#using-getty", "Using Getty"],
  ["#orders-payments", "Orders & payment"],
  ["#delivery", "Delivery"],
  ["#cancellations", "Cancellations"],
  ["#returns", "Return policy"],
  ["#refunds", "Refunds"],
  ["#suppliers", "Suppliers"],
  ["#site-use", "Site use"],
  ["#contact", "Contact us"],
] as const

const copy = "text-[15px] leading-7 text-[#56665d] sm:text-base"

export default function TermsPage() {
  return (
    <div className="bg-[#f7f9f5] text-[#233b2f]">
      <div className="site-container py-12 sm:py-16 lg:py-20">
        <div className="max-w-3xl">
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Terms of service
          </h1>
          <p className="mt-2 text-lg leading-8 text-[#56665d]">
            How shopping, delivery and returns work at Getty Medical Stores.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
          <nav
            aria-label="On this page"
            className="lg:sticky lg:top-8 lg:self-start"
          >
            <p className="mb-4 text-xs font-semibold tracking-[0.14em] text-[#697b6e] uppercase">
              On this page
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4 lg:grid-cols-1">
              {links.map(([href, label]) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-[#405d4b] underline-offset-4 hover:text-[#087b48] hover:underline"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white px-5 py-8 shadow-[0_8px_30px_rgba(23,63,43,0.03)] sm:px-9 sm:py-10 lg:px-12">
            <div className="rounded-2xl border border-[#d9eadc] bg-[#f1f8f1] p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Your rights come first</h2>
              <p className={`${copy} mt-2`}>
                Our online return request is available for 14 days after an item
                is received. This does not limit your rights under Nigerian
                consumer protection law if an item is defective, unsafe or does
                not match its description. You can always contact us about a
                problem with an order.
              </p>
              <a
                href="#returns"
                className="mt-4 inline-block text-sm font-semibold text-[#087b48] underline underline-offset-4"
              >
                Read the return policy
              </a>
            </div>

            <TermsSection
              id="using-getty"
              title="1. Using Getty Medical Stores"
            >
              <p className={copy}>
                Getty Medical Stores helps customers find healthcare products
                from Getty and participating suppliers. You may browse without
                an account. An account is needed for actions that require us to
                identify you, including managing orders and saved addresses.
                Keep your account details accurate and protect your sign-in
                credentials. Tell us promptly if you suspect unauthorised use.
              </p>
              <p className={`${copy} mt-4`}>
                Product information is for shopping and general information. It
                is not a substitute for advice from a qualified healthcare
                professional. Follow the product label, instructions and any
                applicable professional requirements.
              </p>
            </TermsSection>

            <TermsSection
              id="orders-payments"
              title="2. Orders, prices and payment"
            >
              <p className={copy}>
                Product prices and delivery charges are shown in naira. At
                checkout, review the delivery details and the total shown before
                placing your order. Stock and delivery availability can change
                until the order is accepted. We will let you know if an item
                cannot be supplied and arrange the appropriate next step.
              </p>
              <p className={`${copy} mt-4`}>
                Payment is handled through the payment option presented at
                checkout. Placing an order and completing payment are separate
                steps. A payment link or pending payment screen does not mean
                payment has succeeded; check your order&apos;s payment status
                for confirmation. If you are charged but the status is unclear,
                contact us with your order number before trying again.
              </p>
            </TermsSection>

            <TermsSection id="delivery" title="3. Delivery and tracking">
              <p className={copy}>
                Provide a complete delivery address and a phone number where the
                recipient can be reached. Delivery charges and any estimate
                available for your address are shown during checkout. Estimates
                may change because of stock, destination or carrier conditions;
                we will update your order as it progresses.
              </p>
              <p className={`${copy} mt-4`}>
                You can follow an order through your account or use our{" "}
                <Link
                  href="/track-order"
                  className="font-medium text-[#087b48] underline underline-offset-4"
                >
                  track order page
                </Link>
                . Please contact us if delivery details need correction after
                placing an order.
              </p>
            </TermsSection>

            <TermsSection
              id="cancellations"
              title="4. Changing or cancelling an order"
            >
              <p className={copy}>
                If an order has not been dispatched, use the cancellation option
                in your order where it is available, or contact us as soon as
                possible. Once dispatch has started, we may be unable to stop
                delivery; the return process may then apply. We will explain the
                outcome of a cancellation request and any lawful, reasonable
                charge before it is applied.
              </p>
            </TermsSection>

            <TermsSection id="returns" title="5. Return policy">
              <p className={copy}>
                If a delivered item has a problem, open the order, choose the
                item and select <strong>Request return</strong> where available.
                The online action is available within 14 days after receipt.
                Give a clear reason and, where helpful, photos of the item and
                packaging. Keep the item and its accessories safely until we
                provide return instructions. Submitting a request does not by
                itself approve a return.
              </p>
              <div className="mt-5 rounded-xl bg-[#f7f9f5] p-5">
                <h3 className="font-semibold">What can be returned?</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-7 text-[#56665d] sm:text-base">
                  <li>
                    Items that arrive damaged, defective, unsafe, materially
                    different from their description, or unsuitable for a
                    purpose you told the supplier about, subject to applicable
                    law.
                  </li>
                  <li>
                    For a change of mind, contact us within 14 days of receipt.
                    We may accept an unused, complete item after considering
                    hygiene, sterility and storage requirements. We will tell
                    you whether the return is approved and how to send it back
                    before you ship it.
                  </li>
                </ul>
              </div>
              <p className={`${copy} mt-5`}>
                If the online action is unavailable, contact us with the order
                number. Under the Nigerian Federal Competition and Consumer
                Protection Act, a consumer may have a right to return goods that
                fail statutory quality standards within three months of
                delivery, without penalty and at the supplier&apos;s risk and
                expense. The applicable remedy may be repair, replacement or a
                refund. Rights for other misdescribed or unsuitable goods may
                also apply. The 14-day online request window does not remove
                those rights.
              </p>
              <p className={`${copy} mt-4`}>
                See the{" "}
                <a
                  href="https://fccpc.gov.ng/wp-content/uploads/2022/07/FCCPA-2018.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#087b48] underline underline-offset-4"
                >
                  Federal Competition and Consumer Protection Act
                </a>{" "}
                for the statutory rules.
              </p>
            </TermsSection>

            <TermsSection id="refunds" title="6. Inspection and refunds">
              <p className={copy}>
                We may ask for information needed to review a return and may
                inspect a returned item. We will tell you the decision and the
                next step. When a refund is due, its status is separate from the
                return request and payment processing may take additional time.
                We will communicate the applicable method and timing for your
                case. If the item fails statutory quality standards, we will not
                impose a return penalty or require you to bear costs that the
                law places on the supplier.
              </p>
            </TermsSection>

            <TermsSection
              id="suppliers"
              title="7. Suppliers and product listings"
            >
              <p className={copy}>
                Participating suppliers are responsible for the accuracy of
                their listings, product safety, stock and fulfilment
                obligations. Listings may be reviewed before publication.
                Supplier access and tools are subject to any additional terms
                presented during supplier onboarding. Please report inaccurate
                or unsafe listings to us.
              </p>
            </TermsSection>

            <TermsSection id="site-use" title="8. Site use and content">
              <p className={copy}>
                Use the site lawfully and do not interfere with its security,
                accounts or ordering systems. Product images, descriptions and
                other site content are provided to help you shop; you may not
                copy or use them commercially without permission from their
                owner. We use account, delivery and order details to provide the
                services you request and respond to support enquiries.
              </p>
            </TermsSection>

            <TermsSection id="contact" title="9. Help, complaints and changes">
              <p className={copy}>
                For an order problem, cancellation, return or complaint, use
                your order number when you{" "}
                <Link
                  href="/contact"
                  className="font-medium text-[#087b48] underline underline-offset-4"
                >
                  contact our team
                </Link>
                . We may update these terms as the service changes and will
                display the current version here. Changes will not remove rights
                that already apply to an order or any right or remedy that
                cannot lawfully be excluded.
              </p>
            </TermsSection>
          </div>
        </div>
      </div>
    </div>
  )
}

function TermsSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="scroll-mt-8 border-b border-[#e4ece5] py-8 last:border-b-0 last:pb-0 sm:py-10"
    >
      <h2 className="mb-4 text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
        {title}
      </h2>
      {children}
    </section>
  )
}
