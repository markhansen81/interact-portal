"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TrainingToggle({
  taId,
  field,
  checked,
}: {
  taId: string;
  field: "training_online" | "training_offline";
  checked: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(checked);
  const router = useRouter();

  async function toggle() {
    const newValue = !value;
    setValue(newValue);
    setLoading(true);

    await fetch(`/api/admin/teaching-artists/${taId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: newValue }),
    });

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        value ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-700"
      } ${loading ? "opacity-50" : ""}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          value ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
