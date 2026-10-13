import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // Use the corrected product ID supplied for this admin detail link.
        source: "/admin/products/01a116ed-cb0b-76f8-bc1d-a5eb29022cd5",
        destination: "/admin/products/01a116d9-1256-7fc0-8aee-5b48f108ae99",
        permanent: false,
      },
    ]
  },
}

export default nextConfig
