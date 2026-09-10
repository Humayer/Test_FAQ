"use client";

import { useEffect, useState, useCallback } from "react";

interface ContactPersonLite {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
}

interface TopicRow {
  id: string;
  purpose: string;
  department: string;
  keywords: string;
  isActive: boolean;
  contacts: { contactPerson: ContactPersonLite }[];
}

interface EditState {
  id: string | null; // null => creating new
  purpose: string;
  department: string;
  keywords: string;
  isActive: boolean;
  contactPersonIds: string[];
}

const EMPTY_FORM: EditState = {
  id: null,
  purpose: "",
  department: "",
  keywords: "",
  isActive: true,
  contactPersonIds: [],
};

export function TopicsManager() {
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [allContacts, setAllContacts] = useState<ContactPersonLite[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const loadTopics = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/topics${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      if (!res.ok) throw new Error("Failed to load topics.");
      const data = await res.json();
      setTopics(data.topics);
    } catch {
      setError("HR FAQ service is temporarily unavailable. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/contacts");
      if (!res.ok) return;
      const data = await res.json();
      setAllContacts(data.contacts);
    } catch {
      // Non-fatal — the assignment dropdown will just be empty.
    }
  }, []);

  useEffect(() => {
    // Initial data load on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTopics();
    loadContacts();
  }, [loadTopics, loadContacts]);

  useEffect(() => {
    const handle = setTimeout(() => loadTopics(search), 300);
    return () => clearTimeout(handle);
  }, [search, loadTopics]);

  const openCreate = () => setForm({ ...EMPTY_FORM });

  const openEdit = (topic: TopicRow) => {
    setForm({
      id: topic.id,
      purpose: topic.purpose,
      department: topic.department,
      keywords: topic.keywords,
      isActive: topic.isActive,
      contactPersonIds: topic.contacts.map((c) => c.contactPerson.id),
    });
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        purpose: form.purpose.trim(),
        department: form.department.trim(),
        keywords: form.keywords,
        contactPersonIds: form.contactPersonIds,
      };

      const res = form.id
        ? await fetch(`/api/admin/topics/${form.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, isActive: form.isActive }),
          })
        : await fetch("/api/admin/topics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setForm(null);
      await loadTopics(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this HR topic? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/topics/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await loadTopics(search);
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  const toggleContact = (id: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const has = prev.contactPersonIds.includes(id);
      return {
        ...prev,
        contactPersonIds: has ? prev.contactPersonIds.filter((c) => c !== id) : [...prev.contactPersonIds, id],
      };
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">HR Topics</h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            The Purpose, Department, and linked contacts used for FAQ routing.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)] transition-colors shrink-0"
        >
          + Add topic
        </button>
      </div>

      <input
        type="search"
        placeholder="Search topics…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full sm:w-80 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
      />

      {error && (
        <p className="text-sm text-[var(--color-danger)] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)] overflow-hidden">
        {loading ? (
          <p className="px-5 py-8 text-sm text-[var(--color-ink-soft)] text-center">Loading…</p>
        ) : topics.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[var(--color-ink-soft)] text-center">No topics found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-ink-soft)] border-b border-[var(--color-border)]">
                <th className="px-5 py-3 font-medium">Purpose</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Department</th>
                <th className="px-5 py-3 font-medium hidden lg:table-cell">Contacts</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {topics.map((t) => (
                <tr key={t.id}>
                  <td className="px-5 py-3 text-[var(--color-ink)]">{t.purpose}</td>
                  <td className="px-5 py-3 text-[var(--color-ink-soft)] hidden md:table-cell">{t.department}</td>
                  <td className="px-5 py-3 text-[var(--color-ink-soft)] hidden lg:table-cell">
                    {t.contacts.map((c) => c.contactPerson.name).join(", ") || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        t.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-gray-100 text-gray-500 border border-gray-200"
                      }`}
                    >
                      {t.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      className="text-xs text-[var(--color-brand-dark)] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="text-xs text-[var(--color-danger)] hover:underline"
                    >
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-base font-semibold text-[var(--color-ink)]">
                {form.id ? "Edit topic" : "Add topic"}
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink)] mb-1">Purpose</label>
                <input
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
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
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink)] mb-1">
                  Keywords / synonyms (one per line)
                </label>
                <textarea
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                />
                <p className="text-xs text-[var(--color-ink-soft)] mt-1">
                  Used by the matching engine alongside the Purpose text itself.
                </p>
              </div>

              {form.id && (
                <label className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  Active (shown to employees)
                </label>
              )}

              <div>
                <p className="block text-sm font-medium text-[var(--color-ink)] mb-1">Contact persons</p>
                <div className="max-h-40 overflow-y-auto border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)]">
                  {allContacts.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-[var(--color-ink-soft)]">
                      No contacts yet — add some from the Contacts page first.
                    </p>
                  ) : (
                    allContacts.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.contactPersonIds.includes(c.id)}
                          onChange={() => toggleContact(c.id)}
                        />
                        <span className="text-[var(--color-ink)]">{c.name}</span>
                        <span className="text-[var(--color-ink-soft)] text-xs truncate">{c.email}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
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
                disabled={saving || !form.purpose.trim() || !form.department.trim()}
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
