"use client";

import { useCallback, useEffect, useState } from "react";

interface TopicLite {
  faqTopic: { id: string; purpose: string };
}

interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  needsReview: boolean;
  reviewNote: string | null;
  topics: TopicLite[];
}

interface EditState {
  id: string | null;
  name: string;
  email: string;
  department: string;
  needsReview: boolean;
  reviewNote: string;
}

const EMPTY_FORM: EditState = {
  id: null,
  name: "",
  email: "",
  department: "",
  needsReview: false,
  reviewNote: "",
};

export function ContactsManager() {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [search, setSearch] = useState("");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (q: string, review: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (review) params.set("reviewOnly", "true");
      const res = await fetch(`/api/admin/contacts?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setContacts(data.contacts);
    } catch {
      setError("HR FAQ service is temporarily unavailable. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => load(search, reviewOnly), 300);
    return () => clearTimeout(handle);
  }, [search, reviewOnly, load]);

  const openCreate = () => setForm({ ...EMPTY_FORM });
  const openEdit = (c: ContactRow) =>
    setForm({
      id: c.id,
      name: c.name,
      email: c.email ?? "",
      department: c.department ?? "",
      needsReview: c.needsReview,
      reviewNote: c.reviewNote ?? "",
    });

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        department: form.department.trim() || null,
        needsReview: form.needsReview,
        reviewNote: form.needsReview ? form.reviewNote.trim() || "Manually flagged by admin" : null,
      };

      const res = form.id
        ? await fetch(`/api/admin/contacts/${form.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setForm(null);
      await load(search, reviewOnly);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this contact? This will unlink them from any HR topics.")) return;
    try {
      const res = await fetch(`/api/admin/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await load(search, reviewOnly);
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  const clearReview = async (c: ContactRow) => {
    try {
      const res = await fetch(`/api/admin/contacts/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needsReview: false, reviewNote: null }),
      });
      if (!res.ok) throw new Error();
      await load(search, reviewOnly);
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Contacts</h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            Contact persons available to link to HR topics.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)] transition-colors shrink-0"
        >
          + Add contact
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search contacts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
        />
        <label className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
          <input type="checkbox" checked={reviewOnly} onChange={(e) => setReviewOnly(e.target.checked)} />
          Needs review only
        </label>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-danger)] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)] overflow-hidden">
        {loading ? (
          <p className="px-5 py-8 text-sm text-[var(--color-ink-soft)] text-center">Loading…</p>
        ) : contacts.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[var(--color-ink-soft)] text-center">No contacts found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-ink-soft)] border-b border-[var(--color-border)]">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Department</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3 text-[var(--color-ink)]">{c.name}</td>
                  <td className="px-5 py-3 text-[var(--color-ink-soft)] break-all">{c.email ?? "—"}</td>
                  <td className="px-5 py-3 text-[var(--color-ink-soft)] hidden md:table-cell">{c.department ?? "—"}</td>
                  <td className="px-5 py-3">
                    {c.needsReview ? (
                      <span
                        title={c.reviewNote ?? undefined}
                        className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                      >
                        Needs review
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Valid
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                    {c.needsReview && (
                      <button
                        type="button"
                        onClick={() => clearReview(c)}
                        className="text-xs text-emerald-700 hover:underline"
                      >
                        Mark valid
                      </button>
                    )}
                    <button type="button" onClick={() => openEdit(c)} className="text-xs text-[var(--color-brand-dark)] hover:underline">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(c.id)} className="text-xs text-[var(--color-danger)] hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-base font-semibold text-[var(--color-ink)]">{form.id ? "Edit contact" : "Add contact"}</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink)] mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink)] mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@data-path.net"
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink)] mb-1">Department</label>
                <input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
                <input
                  type="checkbox"
                  checked={form.needsReview}
                  onChange={(e) => setForm({ ...form, needsReview: e.target.checked })}
                />
                Flag for review
              </label>
              {form.needsReview && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-ink)] mb-1">Review note</label>
                  <input
                    value={form.reviewNote}
                    onChange={(e) => setForm({ ...form, reviewNote: e.target.value })}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                  />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="text-sm px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="text-sm px-4 py-2 rounded-lg bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
