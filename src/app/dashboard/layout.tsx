import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard — NexusCRM",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession(await cookies());

  if (!session) {
    redirect("/login");
  }

  return <>{children}</>;
}
