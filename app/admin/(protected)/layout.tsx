import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth/adminAuth";
import { Logo } from "@/components/ui/Logo";
import { AdminNav } from "@/components/admin/AdminNav";
import { LogoutButton } from "@/components/admin/LogoutButton";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-canvas)]">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin" className="flex items-center gap-2 shrink-0">
              <Logo height={22} />
            </Link>
            <span className="text-xs text-[var(--color-ink-soft)] hidden sm:inline">Admin</span>
          </div>
          <AdminNav />
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-[var(--color-ink-soft)] hidden md:inline truncate max-w-[180px]">
              {session.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-8">{children}</main>
    </div>
  );
}
