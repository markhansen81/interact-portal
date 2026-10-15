"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { DeleteTAButton } from "@/components/admin/delete-ta-button";
import { TrainingToggle } from "@/components/admin/training-toggle";

interface TAProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  photo_url: string | null;
  pay_level: number | null;
  onboarding_status: string | null;
  onboarding_sections_complete: Record<string, boolean> | null;
  training_online: boolean;
  training_offline: boolean;
  qualifying_projects: number;
  total_projects: number;
  is_active: boolean;
  address: string | null;
  iban?: string | null;
  tax_number?: string | null;
}

interface TADoc {
  type: string;
  status: string;
}

const REQUIRED_DOCS = ["right_to_work", "police_check", "measles"];

function useDebounce(callback: (value: string) => void, delay: number) {
  const timerRef = useState<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (value: string) => {
      if (timerRef[0]) clearTimeout(timerRef[0]);
      const id = setTimeout(() => callback(value), delay);
      timerRef[1](id);
    },
    [callback, delay, timerRef]
  );
}

export function TASearchFilter({
  tas,
  docsByTA,
}: {
  tas: TAProfile[];
  docsByTA: Record<string, TADoc[]>;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [onboardingFilter, setOnboardingFilter] = useState("all");
  const [payLevelFilter, setPayLevelFilter] = useState("all");
  const [trainingFilter, setTrainingFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const debouncedSetSearch = useDebounce(setDebouncedSearch, 300);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    debouncedSetSearch(value);
  };

  const filtered = useMemo(() => {
    let result = tas;

    // Text search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (ta) =>
          (ta.first_name && ta.first_name.toLowerCase().includes(q)) ||
          (ta.last_name && ta.last_name.toLowerCase().includes(q)) ||
          ta.email.toLowerCase().includes(q) ||
          (ta.phone && ta.phone.toLowerCase().includes(q)) ||
          (`${ta.first_name || ""} ${ta.last_name || ""}`.toLowerCase().includes(q))
      );
    }

    // Onboarding status
    if (onboardingFilter !== "all") {
      if (onboardingFilter === "pending") {
        result = result.filter((ta) =>
          ["pending", "in_progress"].includes(ta.onboarding_status || "")
        );
      } else if (onboardingFilter === "ready") {
        result = result.filter((ta) => ta.onboarding_status === "ready");
      }
    }

    // Pay level
    if (payLevelFilter !== "all") {
      const level = parseInt(payLevelFilter, 10);
      result = result.filter((ta) => ta.pay_level === level);
    }

    // Training
    if (trainingFilter !== "all") {
      if (trainingFilter === "complete") {
        result = result.filter((ta) => ta.training_online && ta.training_offline);
      } else if (trainingFilter === "incomplete") {
        result = result.filter((ta) => !ta.training_online || !ta.training_offline);
      }
    }

    // Active
    if (activeFilter !== "all") {
      if (activeFilter === "active") {
        result = result.filter((ta) => ta.is_active);
      } else if (activeFilter === "inactive") {
        result = result.filter((ta) => !ta.is_active);
      }
    }

    return result;
  }, [tas, debouncedSearch, onboardingFilter, payLevelFilter, trainingFilter, activeFilter]);

  function getMissing(ta: TAProfile) {
    const taDocs = docsByTA[ta.id] || [];
    const uploadedTypes = new Set(
      taDocs.filter((d) => d.status !== "not_uploaded").map((d) => d.type)
    );
    const missing: string[] = [];

    if (!ta.first_name) missing.push("Name");
    if (!ta.address) missing.push("Address");
    if (!ta.phone) missing.push("Phone");
    REQUIRED_DOCS.forEach((docType) => {
      if (!uploadedTypes.has(docType)) {
        const labels: Record<string, string> = {
          right_to_work: "Visa/Passport",
          police_check: "Police Check",
          measles: "Measles",
        };
        missing.push(labels[docType] || docType);
      }
    });
    if (!ta.training_online) missing.push("Online Training");
    if (!ta.training_offline) missing.push("Offline Training");
    if (!ta.iban) missing.push("IBAN");
    if (!ta.tax_number) missing.push("Tax #");

    return missing;
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name, email..."
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-slate-500 dark:focus:ring-slate-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={onboardingFilter}
            onChange={(e) => setOnboardingFilter(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="all">All Onboarding</option>
            <option value="pending">Pending</option>
            <option value="ready">Ready</option>
          </select>
          <select
            value={payLevelFilter}
            onChange={(e) => setPayLevelFilter(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="all">All Levels</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
            <option value="4">Level 4</option>
            <option value="5">Level 5</option>
          </select>
          <select
            value={trainingFilter}
            onChange={(e) => setTrainingFilter(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="all">All Training</option>
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete</option>
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Result count */}
      <p className="text-sm text-zinc-500">
        Showing {filtered.length} of {tas.length} Teaching Artists
      </p>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-500">No teaching artists match your filters.</p>
          <p className="mt-1 text-sm text-zinc-400">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Name
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Onboarding
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Missing
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Online
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Offline
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Projects
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filtered.map((ta) => {
                const sectionsComplete = (ta.onboarding_sections_complete || {}) as Record<
                  string,
                  boolean
                >;
                const completedSections = Object.values(sectionsComplete).filter(Boolean).length;
                const progress = Math.round((completedSections / 7) * 100);
                const missing = getMissing(ta);

                return (
                  <tr key={ta.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/teaching-artists/${ta.id}`}
                        className="flex items-center gap-3"
                      >
                        {ta.photo_url ? (
                          <img
                            src={ta.photo_url}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                            {(ta.first_name?.[0] || ta.email[0]).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {ta.first_name && ta.last_name
                              ? `${ta.first_name} ${ta.last_name}`
                              : ta.email}
                          </span>
                          <p className="text-xs text-zinc-400">{ta.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                        {ta.pay_level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              progress === 100
                                ? "bg-green-500"
                                : progress > 0
                                  ? "bg-blue-500"
                                  : "bg-zinc-300"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-400">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-[200px] flex-wrap gap-1">
                        {missing.length === 0 ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                            Complete
                          </span>
                        ) : (
                          missing.slice(0, 4).map((m) => (
                            <span
                              key={m}
                              className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600"
                            >
                              {m}
                            </span>
                          ))
                        )}
                        {missing.length > 4 && (
                          <span className="inline-flex items-center rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                            +{missing.length - 4}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <TrainingToggle
                        taId={ta.id}
                        field="training_online"
                        checked={ta.training_online}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <TrainingToggle
                        taId={ta.id}
                        field="training_offline"
                        checked={ta.training_offline}
                      />
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-zinc-500">
                      {ta.qualifying_projects}/{ta.total_projects}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeleteTAButton
                        id={ta.id}
                        name={
                          ta.first_name ? `${ta.first_name} ${ta.last_name}` : ta.email
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
