"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TAProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  phone: string | null;
  address: string | null;
  category: string | null;
  pay_level: number;
  training_online: boolean;
  training_offline: boolean;
  is_active: boolean;
  onboarding_status: string;
}

export function TAProfileEditor({ ta }: { ta: TAProfile }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: ta.first_name || "",
    last_name: ta.last_name || "",
    preferred_name: ta.preferred_name || "",
    phone: ta.phone || "",
    address: ta.address || "",
    category: ta.category || "",
    pay_level: ta.pay_level,
    training_online: ta.training_online,
    training_offline: ta.training_offline,
    is_active: ta.is_active,
    onboarding_status: ta.onboarding_status,
  });
  const router = useRouter();

  async function handleSave() {
    setLoading(true);
    const res = await fetch(`/api/admin/teaching-artists/${ta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setEditing(false);
      router.refresh();
    }
    setLoading(false);
  }

  if (!editing) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Profile Information
          </h3>
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Edit
          </button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4">
          <Field label="First name" value={ta.first_name} />
          <Field label="Last name" value={ta.last_name} />
          <Field label="Preferred name" value={ta.preferred_name} />
          <Field label="Phone" value={ta.phone} />
          <Field label="Category" value={ta.category} />
          <Field label="Address" value={ta.address} />
        </dl>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Edit Profile
      </h3>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Input
          label="First name"
          value={form.first_name}
          onChange={(v) => setForm({ ...form, first_name: v })}
        />
        <Input
          label="Last name"
          value={form.last_name}
          onChange={(v) => setForm({ ...form, last_name: v })}
        />
        <Input
          label="Preferred name"
          value={form.preferred_name}
          onChange={(v) => setForm({ ...form, preferred_name: v })}
        />
        <Input
          label="Phone"
          value={form.phone}
          onChange={(v) => setForm({ ...form, phone: v })}
        />
        <Input
          label="Category"
          value={form.category}
          onChange={(v) => setForm({ ...form, category: v })}
        />
        <Input
          label="Address"
          value={form.address}
          onChange={(v) => setForm({ ...form, address: v })}
        />
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Pay Level
          </label>
          <select
            value={form.pay_level}
            onChange={(e) =>
              setForm({ ...form, pay_level: parseInt(e.target.value) })
            }
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {[1, 2, 3, 4, 5, 6].map((l) => (
              <option key={l} value={l}>
                Level {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Onboarding Status
          </label>
          <select
            value={form.onboarding_status}
            onChange={(e) =>
              setForm({ ...form, onboarding_status: e.target.value })
            }
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="awaiting_documents">Awaiting Documents</option>
            <option value="ready">Ready</option>
          </select>
        </div>
        <div className="col-span-2 flex gap-6">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={form.training_online}
              onChange={(e) =>
                setForm({ ...form, training_online: e.target.checked })
              }
              className="rounded"
            />
            Online onboarding complete
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={form.training_offline}
              onChange={(e) =>
                setForm({ ...form, training_offline: e.target.checked })
              }
              className="rounded"
            />
            Offline foundation complete
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
              className="rounded"
            />
            Active
          </label>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => setEditing(false)}
          className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
        {value || "—"}
      </dd>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      />
    </div>
  );
}
