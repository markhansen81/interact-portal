"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface WorkOrder {
  id: string;
  project_name: string;
  school: string;
  start_date: string;
  end_date: string;
  days: number;
  program_type: string;
  daily_rate: number;
  total: number;
}

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  pay_level: number;
  camp_level: number;
}

interface Service {
  id: string;
  name: string;
  fee: number | null;
  fee_type: string;
  trigger_type: string;
  condition_json: { program_types?: string[]; min_tas?: number } | null;
}

interface PayScale {
  scale_type: string;
  level: number;
  level_label: string;
  rates: Record<string, number | null>;
}

interface TravelStipend {
  min_hours: number;
  max_hours: number | null;
  amount: number;
}

interface AddonLine {
  service_id: string;
  name: string;
  fee: number;
  quantity: number;
  total: number;
}

export function InvoiceCalculator({
  workOrder: wo,
  profile,
  services,
  payScales,
  travelStipends,
}: {
  workOrder: WorkOrder;
  profile: Profile;
  services: Service[];
  payScales: PayScale[];
  travelStipends: TravelStipend[];
}) {
  const router = useRouter();
  const [addons, setAddons] = useState<AddonLine[]>([]);
  const [travelHours, setTravelHours] = useState("");
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const isCamp = wo.program_type.toLowerCase().includes("camp");
  const isTheatreOrFilm =
    wo.program_type.toLowerCase().includes("theatre") ||
    wo.program_type.toLowerCase().includes("film");

  // Calculate base rate from pay scale
  const baseRate = useMemo(() => {
    if (wo.total) return Number(wo.total);

    const scaleType = isCamp ? "camps" : "programs";
    const level = isCamp ? profile.camp_level : profile.pay_level;
    const scale = payScales.find(
      (s) => s.scale_type === scaleType && s.level === level
    );
    if (!scale) return 0;
    const rate = scale.rates[String(wo.days)];
    return rate ?? 0;
  }, [wo, profile, payScales, isCamp]);

  // Filter services based on program type conditions
  const availableServices = useMemo(() => {
    return services.filter((s) => {
      if (s.trigger_type === "manual") return true;
      if (s.trigger_type === "auto") {
        // Auto-applied based on conditions
        if (s.condition_json?.program_types) {
          const pt = wo.program_type.toLowerCase();
          return s.condition_json.program_types.some((t: string) =>
            pt.includes(t.replace("_", " "))
          );
        }
        return true;
      }
      if (s.trigger_type === "conditional") {
        if (s.condition_json?.program_types) {
          const pt = wo.program_type.toLowerCase();
          return s.condition_json.program_types.some((t: string) =>
            pt.includes(t.replace("_", " "))
          );
        }
        return true;
      }
      return true;
    });
  }, [services, wo.program_type]);

  // Auto-apply services
  const autoAddons = useMemo(() => {
    return availableServices
      .filter((s) => s.trigger_type === "auto" && s.fee)
      .map((s) => ({
        service_id: s.id,
        name: s.name,
        fee: Number(s.fee),
        quantity: 1,
        total: Number(s.fee),
      }));
  }, [availableServices]);

  // Theatre/Film Week additional wage
  const theatreFilmBonus = useMemo(() => {
    if (!isTheatreOrFilm || wo.days < 3) return 0;
    if (wo.days === 3) return 30;
    if (wo.days === 4) return 40;
    return 50;
  }, [isTheatreOrFilm, wo.days]);

  // Travel stipend calculation
  const travelStipendAmount = useMemo(() => {
    if (!travelHours) return 0;
    const hours = parseFloat(travelHours);
    const bracket = travelStipends.find(
      (t) => hours >= t.min_hours && (t.max_hours === null || hours <= t.max_hours)
    );
    return bracket?.amount ?? 0;
  }, [travelHours, travelStipends]);

  // Total
  const addonsTotal = addons.reduce((sum, a) => sum + a.total, 0);
  const autoTotal = autoAddons.reduce((sum, a) => sum + a.total, 0);
  const grandTotal =
    baseRate + addonsTotal + autoTotal + theatreFilmBonus + travelStipendAmount;

  function toggleAddon(service: Service) {
    const existing = addons.find((a) => a.service_id === service.id);
    if (existing) {
      setAddons(addons.filter((a) => a.service_id !== service.id));
    } else {
      setAddons([
        ...addons,
        {
          service_id: service.id,
          name: service.name,
          fee: Number(service.fee) || 0,
          quantity: 1,
          total: Number(service.fee) || 0,
        },
      ]);
    }
  }

  function updateAddonQuantity(serviceId: string, quantity: number) {
    setAddons(
      addons.map((a) =>
        a.service_id === serviceId
          ? { ...a, quantity, total: a.fee * quantity }
          : a
      )
    );
  }

  async function handleSubmit() {
    setLoading(true);

    const allAddons = [
      ...autoAddons,
      ...addons,
      ...(theatreFilmBonus > 0
        ? [
            {
              service_id: null,
              name: "Theatre/Film Week additional wage",
              fee: theatreFilmBonus,
              quantity: 1,
              total: theatreFilmBonus,
            },
          ]
        : []),
      ...(travelStipendAmount > 0
        ? [
            {
              service_id: null,
              name: `Travel stipend (${travelHours}h round trip)`,
              fee: travelStipendAmount,
              quantity: 1,
              total: travelStipendAmount,
            },
          ]
        : []),
    ];

    const res = await fetch("/api/portal/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        work_order_id: wo.id,
        base_amount: baseRate,
        addons: allAddons,
        addons_total: grandTotal - baseRate,
        total: grandTotal,
        notes,
      }),
    });

    if (res.ok) {
      router.push("/portal/invoices");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/portal/invoices"
        className="text-sm text-zinc-500 hover:text-zinc-700"
      >
        &larr; Back
      </Link>

      {/* Work Order Reference */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-medium text-zinc-500">Work Order</h3>
        <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {wo.project_name}
        </p>
        <p className="text-sm text-zinc-500">
          {wo.program_type} — {wo.days} day{wo.days > 1 ? "s" : ""} —{" "}
          {wo.start_date} to {wo.end_date}
        </p>
        <p className="text-sm text-zinc-500">
          {wo.school}
        </p>
      </div>

      {/* Base Pay */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Base Pay
        </h3>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">
              Level {isCamp ? profile.camp_level : profile.pay_level} —{" "}
              {isCamp ? "Camp" : "Programs"} pay scale — {wo.days} day
              {wo.days > 1 ? "s" : ""}
            </p>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            €{baseRate.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Auto-applied Add-ons */}
      {(autoAddons.length > 0 || theatreFilmBonus > 0) && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-900/30 dark:bg-green-900/10">
          <h3 className="text-sm font-medium text-green-700 dark:text-green-400">
            Auto-applied
          </h3>
          <div className="mt-3 space-y-2">
            {autoAddons.map((a) => (
              <div key={a.service_id} className="flex justify-between text-sm">
                <span className="text-green-800 dark:text-green-300">{a.name}</span>
                <span className="font-medium text-green-900 dark:text-green-200">
                  €{a.total.toFixed(2)}
                </span>
              </div>
            ))}
            {theatreFilmBonus > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-800 dark:text-green-300">
                  Theatre/Film Week additional wage ({wo.days} day)
                </span>
                <span className="font-medium text-green-900 dark:text-green-200">
                  €{theatreFilmBonus.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Service Add-ons */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Services & Add-ons
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          Select any additional services you provided on this project.
        </p>
        <div className="mt-4 space-y-3">
          {availableServices
            .filter((s) => s.trigger_type !== "auto" && s.fee)
            .map((service) => {
              const isSelected = addons.some((a) => a.service_id === service.id);
              const addon = addons.find((a) => a.service_id === service.id);
              return (
                <div
                  key={service.id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    isSelected
                      ? "border-zinc-400 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAddon(service)}
                      className="rounded"
                    />
                    <span className="text-zinc-900 dark:text-zinc-50">
                      {service.name}
                    </span>
                    <span className="text-zinc-500">
                      €{Number(service.fee).toFixed(2)}{" "}
                      {service.fee_type === "per_hour"
                        ? "/hour"
                        : service.fee_type === "per_time"
                          ? "/time"
                          : ""}
                    </span>
                  </label>
                  {isSelected &&
                    (service.fee_type === "per_hour" ||
                      service.fee_type === "per_time") && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-zinc-500">Qty:</label>
                        <input
                          type="number"
                          min={1}
                          value={addon?.quantity || 1}
                          onChange={(e) =>
                            updateAddonQuantity(
                              service.id,
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        />
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          €{(addon?.total || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Travel Stipend */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Travel Stipend
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          BahnCard 50 owners only. Enter round-trip travel time.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Round-trip travel time (hours)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={travelHours}
              onChange={(e) => setTravelHours(e.target.value)}
              placeholder="e.g. 4.5"
              className="input w-32"
            />
          </div>
          {travelStipendAmount > 0 && (
            <div className="mt-6">
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                €{travelStipendAmount.toFixed(2)}
              </span>
            </div>
          )}
        </div>
        <div className="mt-3 text-xs text-zinc-400">
          {travelStipends.map((t) => (
            <span key={t.min_hours} className="mr-4">
              {t.min_hours}–{t.max_hours || "∞"}h = €{Number(t.amount).toFixed(0)}
            </span>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          rows={2}
          placeholder="Any notes about this invoice..."
        />
      </div>

      {/* Total & Submit */}
      <div className="rounded-xl border border-zinc-900 bg-zinc-900 p-6 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900">
        <div className="space-y-2">
          <div className="flex justify-between text-sm opacity-80">
            <span>Base pay</span>
            <span>€{baseRate.toFixed(2)}</span>
          </div>
          {autoAddons.map((a) => (
            <div key={a.service_id} className="flex justify-between text-sm opacity-80">
              <span>{a.name}</span>
              <span>€{a.total.toFixed(2)}</span>
            </div>
          ))}
          {theatreFilmBonus > 0 && (
            <div className="flex justify-between text-sm opacity-80">
              <span>Theatre/Film additional</span>
              <span>€{theatreFilmBonus.toFixed(2)}</span>
            </div>
          )}
          {addons.map((a) => (
            <div key={a.service_id} className="flex justify-between text-sm opacity-80">
              <span>
                {a.name} {a.quantity > 1 ? `x${a.quantity}` : ""}
              </span>
              <span>€{a.total.toFixed(2)}</span>
            </div>
          ))}
          {travelStipendAmount > 0 && (
            <div className="flex justify-between text-sm opacity-80">
              <span>Travel stipend ({travelHours}h)</span>
              <span>€{travelStipendAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-white/20 pt-2 dark:border-zinc-900/20">
            <div className="flex justify-between text-2xl font-bold">
              <span>Total</span>
              <span>€{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-white px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
        >
          {loading ? "Submitting..." : "Submit Invoice"}
        </button>
      </div>
    </div>
  );
}
