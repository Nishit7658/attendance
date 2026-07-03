import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Faculty Dashboard",
};

export default function FacultyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell role="faculty">{children}</AppShell>;
}
