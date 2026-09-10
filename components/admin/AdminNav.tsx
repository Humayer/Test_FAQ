"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/topics", label: "HR Topics" },
  { href: "/admin/contacts", label: "Contacts" },
  { href: "/admin/import", label: "Import" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const activeHref =
    LINKS.find((link) => (link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href)))
      ?.href ?? "/admin";

  return (
    <>
      <nav className="hidden sm:flex items-center gap-1">
        {LINKS.map((link) => {
          const active = link.href === activeHref;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                active
                  ? "bg-[var(--color-brand-tint)] text-[var(--color-brand-dark)] font-medium"
                  : "text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <label className="sm:hidden flex-1 max-w-[160px]">
        <span className="sr-only">Navigate admin section</span>
        <select
          value={activeHref}
          onChange={(e) => router.push(e.target.value)}
          className="w-full text-sm rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-[var(--color-ink)] bg-white"
        >
          {LINKS.map((link) => (
            <option key={link.href} value={link.href}>
              {link.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
