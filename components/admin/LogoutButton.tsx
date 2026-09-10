"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="text-sm px-3 py-1.5 rounded-full border border-[var(--color-border)] text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)] transition-colors disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
