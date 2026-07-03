import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-navy-900 sm:text-5xl">
          Puff Attendance
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          College Attendance Management System
        </p>
        <div className="mt-8">
          <Link href="/login" className="btn-primary inline-block">
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
