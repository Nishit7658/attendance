import Link from "next/link"

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { code?: string }
}) {
  const message =
    searchParams.code === "unauthorized"
      ? "You do not have permission to access this page."
      : "Something went wrong during authentication. Please try again."

  return (
    <div className="text-center">
      <h1 className="text-[var(--fs-headline)] font-[var(--fw-semibold)] text-ink mb-2">
        Authentication Error
      </h1>
      <p className="text-[var(--fs-body)] text-muted mb-8">
        {message}
      </p>
      <Link
        href="/login"
        className="inline-flex items-center justify-center h-10 px-6 rounded-[var(--radius-md)] bg-primary text-white text-[var(--fs-label)] font-[var(--fw-medium)] hover:bg-primary-hover transition-colors"
      >
        Try again
      </Link>
    </div>
  )
}
