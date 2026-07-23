import GettyLoader from "@/components/loader/animated-logo"

export default function Loading() {
  return (
    <main
      className="page-loader"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="page-loader-content">
        <GettyLoader />

        <div className="page-loader-text">
          <p className="page-loader-title">Getty Medical Store</p>
          <p className="page-loader-message">Loading</p>
        </div>
      </div>
    </main>
  )
}
