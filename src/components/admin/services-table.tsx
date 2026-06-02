"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Service {
  id: string;
  name: string;
  fee: number | null;
  fee_type: string;
  trigger_type: string;
  condition_json: Record<string, unknown> | null;
  active: boolean;
  sort_order: number;
}

export function ServicesTable({ services }: { services: Service[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-xl bg-zinc-900 px-5 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add Service
        </button>
      </div>

      {showAdd && (
        <ServiceForm
          onClose={() => {
            setShowAdd(false);
            router.refresh();
          }}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Service
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Fee
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Type
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Trigger
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
            {services.map((service) =>
              editingId === service.id ? (
                <ServiceEditRow
                  key={service.id}
                  service={service}
                  onClose={() => {
                    setEditingId(null);
                    router.refresh();
                  }}
                />
              ) : (
                <tr key={service.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {service.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {service.fee != null ? `€${Number(service.fee).toFixed(2)}` : "TBD"}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {service.fee_type.replace("_", " ")}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {service.trigger_type}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        service.active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                      }`}
                    >
                      {service.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setEditingId(service.id)}
                      className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ServiceEditRow({
  service,
  onClose,
}: {
  service: Service;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: service.name,
    fee: service.fee?.toString() || "",
    fee_type: service.fee_type,
    trigger_type: service.trigger_type,
    active: service.active,
  });
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    await fetch(`/api/admin/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        fee: form.fee ? parseFloat(form.fee) : null,
      }),
    });
    setLoading(false);
    onClose();
  }

  return (
    <tr className="bg-zinc-50 dark:bg-zinc-800/50">
      <td className="px-6 py-3">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </td>
      <td className="px-6 py-3">
        <input
          value={form.fee}
          onChange={(e) => setForm({ ...form, fee: e.target.value })}
          placeholder="TBD"
          className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </td>
      <td className="px-6 py-3">
        <select
          value={form.fee_type}
          onChange={(e) => setForm({ ...form, fee_type: e.target.value })}
          className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="fixed">Fixed</option>
          <option value="per_hour">Per hour</option>
          <option value="per_time">Per time</option>
          <option value="calculated">Calculated</option>
        </select>
      </td>
      <td className="px-6 py-3">
        <select
          value={form.trigger_type}
          onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
          className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="manual">Manual</option>
          <option value="auto">Auto</option>
          <option value="conditional">Conditional</option>
        </select>
      </td>
      <td className="px-6 py-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Active
        </label>
      </td>
      <td className="px-6 py-3 text-right space-x-2">
        <button
          onClick={onClose}
          className="text-sm text-zinc-500 hover:text-zinc-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="text-sm font-medium text-zinc-900 hover:text-zinc-700 dark:text-zinc-50"
        >
          {loading ? "..." : "Save"}
        </button>
      </td>
    </tr>
  );
}

function ServiceForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: "",
    fee: "",
    fee_type: "fixed",
    trigger_type: "manual",
  });
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        fee: form.fee ? parseFloat(form.fee) : null,
      }),
    });
    setLoading(false);
    onClose();
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Add New Service
      </h3>
      <form onSubmit={handleCreate} className="mt-4 grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Name
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Fee (€)
          </label>
          <input
            value={form.fee}
            onChange={(e) => setForm({ ...form, fee: e.target.value })}
            placeholder="TBD"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Fee type
          </label>
          <select
            value={form.fee_type}
            onChange={(e) => setForm({ ...form, fee_type: e.target.value })}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="fixed">Fixed</option>
            <option value="per_hour">Per hour</option>
            <option value="per_time">Per time</option>
            <option value="calculated">Calculated</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? "..." : "Add"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
