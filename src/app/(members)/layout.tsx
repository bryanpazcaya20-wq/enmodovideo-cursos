import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { SessionGuard } from "@/components/layout/session-guard";
import { getCurrentProfile, requireUser } from "@/lib/auth";

export default async function MembersLayout({ children }: { children: ReactNode }) {
  await requireUser();
  const profile = await getCurrentProfile();
  return (
    <>
      <AppHeader profile={profile} />
      <main className="min-w-0 flex-1">{children}</main>
      {profile?.role !== "admin" && <SessionGuard />}
    </>
  );
}
