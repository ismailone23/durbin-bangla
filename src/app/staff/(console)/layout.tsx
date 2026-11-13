import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StaffShell } from "@/components/staff/StaffShell";
import { isStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Staff" };

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isStaff())) redirect("/staff/login");
  return <StaffShell>{children}</StaffShell>;
}
