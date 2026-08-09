import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "HOD Dashboard - Attendance",
};

export default function HODLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="hod">{children}</AppShell>;
}
