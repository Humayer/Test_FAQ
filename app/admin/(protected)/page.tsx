import { prisma } from "@/lib/db/prisma";
import { StatCard } from "@/components/admin/StatCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [totalTopics, totalContacts, validEmails, needsReview, recentImports] = await Promise.all([
    prisma.fAQTopic.count(),
    prisma.contactPerson.count(),
    prisma.contactPerson.count({ where: { needsReview: false, email: { not: null } } }),
    prisma.contactPerson.count({ where: { needsReview: true } }),
    prisma.importBatch.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">Dashboard</h1>
        <p className="text-sm text-[var(--color-ink-soft)] mt-1">
          Live counts from the database — nothing here is hard-coded.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="HR Topics" value={totalTopics} />
        <StatCard label="Contact Persons" value={totalContacts} />
        <StatCard label="Valid Emails" value={validEmails} />
        <StatCard label="Needs Review" value={needsReview} tone={needsReview > 0 ? "warning" : "default"} />
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Recent imports</h2>
          <Link href="/admin/import" className="text-xs text-[var(--color-brand-dark)] hover:underline">
            Go to Import
          </Link>
        </div>
        {recentImports.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[var(--color-ink-soft)] text-center">
            No imports yet. Upload your HR contact spreadsheet from the Import page to get started.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {recentImports.map((batch) => (
              <li key={batch.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-[var(--color-ink)] truncate">{batch.fileName}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    {batch.validRows} valid · {batch.reviewRows} review · {batch.invalidRows} invalid
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${
                    batch.status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : batch.status === "REJECTED"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {batch.status.replace("_", " ").toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
