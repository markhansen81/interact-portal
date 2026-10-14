"use client";

import { useState } from "react";

interface SystemHealthProps {
  reportContent: string | null;
  stats: {
    profiles: number;
    activeTAs: number;
    inactiveTAs: number;
    invoices: number;
    invoicesSubmitted: number;
    invoicesApproved: number;
    invoicesPaid: number;
    expenses: number;
    expensesSubmitted: number;
    expensesApproved: number;
    expensesPaid: number;
    adminUploads: number;
    adminUploadsOutstanding: number;
    adminUploadsPaid: number;
    projects: number;
  };
  recentLogs: Array<{
    id?: string;
    created_at?: string;
    action?: string;
    source?: string;
    details?: string;
    payload?: Record<string, unknown>;
  }>;
  datevConnected: boolean;
  datevExpired: boolean;
  hasResendKey: boolean;
  hasAnthropicKey: boolean;
  healthChecks: Array<{
    id: string;
    check_name: string;
    status: string;
    message: string | null;
    checked_at: string;
  }>;
}

/* ---------------------------------------------------------------------------
 * Helpers
 * --------------------------------------------------------------------------- */

function parseLastScanDate(content: string): string | null {
  // Look for patterns like "Generated: 2026-10-07" or "Date: 2026-10-07" or "Last scan: ..."
  const patterns = [
    /(?:Generated|Date|Last scan|Scan date|Report date)[:\s]+(\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?)/i,
    /(\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?)/,
  ];
  for (const p of patterns) {
    const m = content.match(p);
    if (m) return m[1];
  }
  return null;
}

function parseIssueCounts(content: string) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  const critical = content.match(/CRITICAL/gi);
  const high = content.match(/\bHIGH\b/gi);
  const medium = content.match(/MEDIUM/gi);
  const low = content.match(/\bLOW\b/gi);
  if (critical) counts.critical = critical.length;
  if (high) counts.high = high.length;
  if (medium) counts.medium = medium.length;
  if (low) counts.low = low.length;
  return counts;
}

function parseCriticalHighItems(content: string): string[] {
  const items: string[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/CRITICAL|HIGH/i.test(line) && /^[-*]/.test(line.trim())) {
      items.push(line.trim().replace(/^[-*]\s*/, ""));
    }
  }
  return items;
}

function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="mt-4 mb-1 text-sm font-bold text-slate-800 dark:text-slate-200">
          {applyInlineFormatting(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="mt-6 mb-2 text-base font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-1">
          {applyInlineFormatting(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="mt-6 mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">
          {applyInlineFormatting(line.slice(2))}
        </h1>
      );
    } else if (/^[-*]\s/.test(line.trim())) {
      // List item
      const indent = line.search(/\S/);
      const text = line.trim().replace(/^[-*]\s+/, "");
      elements.push(
        <div key={i} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300" style={{ paddingLeft: indent * 4 }}>
          <span className="text-slate-400 mt-0.5">&#8226;</span>
          <span>{applyInlineFormatting(text)}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-sm text-slate-700 dark:text-slate-300">
          {applyInlineFormatting(line)}
        </p>
      );
    }
  }
  return elements;
}

function applyInlineFormatting(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-slate-900 dark:text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Inline code: `text`
    const codeParts = part.split(/(`[^`]+`)/g);
    if (codeParts.length > 1) {
      return codeParts.map((cp, j) => {
        if (cp.startsWith("`") && cp.endsWith("`")) {
          return (
            <code key={`${i}-${j}`} className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              {cp.slice(1, -1)}
            </code>
          );
        }
        return cp;
      });
    }
    return part;
  });
}

/* ---------------------------------------------------------------------------
 * Sub-components
 * --------------------------------------------------------------------------- */

function StatusBadge({ status, color }: { status: string; color: "green" | "red" | "yellow" | "slate" }) {
  const colors = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
    red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    yellow: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
    slate: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors[color]}`}>
      {status}
    </span>
  );
}

function HealthCard({
  label,
  status,
  color,
  detail,
}: {
  label: string;
  status: string;
  color: "green" | "red" | "yellow" | "slate";
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <StatusBadge status={status} color={color} />
      </div>
      {detail && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
      )}
    </div>
  );
}

function DataStatCard({
  label,
  value,
  breakdown,
}: {
  label: string;
  value: number;
  breakdown?: { label: string; value: number }[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{value}</p>
      {breakdown && breakdown.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {breakdown.map((b) => (
            <span key={b.label} className="text-xs text-slate-500 dark:text-slate-400">
              {b.label}: <span className="font-medium text-slate-700 dark:text-slate-300">{b.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Main component
 * --------------------------------------------------------------------------- */

export function SystemHealthPanel({
  reportContent,
  stats,
  recentLogs,
  datevConnected,
  datevExpired,
  hasResendKey,
  hasAnthropicKey,
  healthChecks,
}: SystemHealthProps) {
  const [reportExpanded, setReportExpanded] = useState(false);

  const issueCounts = reportContent ? parseIssueCounts(reportContent) : null;
  const lastScanDate = reportContent ? parseLastScanDate(reportContent) : null;
  const criticalHighItems = reportContent ? parseCriticalHighItems(reportContent) : [];
  const totalIssues = issueCounts
    ? issueCounts.critical + issueCounts.high + issueCounts.medium + issueCounts.low
    : 0;

  return (
    <div className="space-y-8">
      {/* Section 1: Virtual CTO Status */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
          Virtual CTO Status
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-5 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  reportContent
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                }`}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">Security Audit Scanner</p>
                  <p className="text-xs text-slate-500">Automated vulnerability and compliance checks</p>
                </div>
              </div>
              <StatusBadge
                status={reportContent ? "Active" : "Not configured"}
                color={reportContent ? "green" : "red"}
              />
            </div>
          </div>

          <div className="p-5">
            {reportContent ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  {lastScanDate && (
                    <div>
                      <p className="text-xs font-medium text-slate-500">Last Scan</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{lastScanDate}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-slate-500">Total Issues</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{totalIssues}</p>
                  </div>
                </div>

                {issueCounts && (
                  <div className="flex gap-3">
                    {issueCounts.critical > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        {issueCounts.critical} Critical
                      </span>
                    )}
                    {issueCounts.high > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                        {issueCounts.high} High
                      </span>
                    )}
                    {issueCounts.medium > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        {issueCounts.medium} Medium
                      </span>
                    )}
                    {issueCounts.low > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {issueCounts.low} Low
                      </span>
                    )}
                  </div>
                )}

                <div>
                  <button
                    onClick={() => setReportExpanded(!reportExpanded)}
                    className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                  >
                    <svg
                      className={`h-4 w-4 transition-transform ${reportExpanded ? "rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                    {reportExpanded ? "Hide" : "Show"} Full Report
                  </button>

                  {reportExpanded && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 max-h-[600px] overflow-y-auto">
                      {renderMarkdown(reportContent)}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <svg className="h-5 w-5 animate-pulse text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path d="M12 6v6l4 2" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Waiting for first scan...
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: System Health */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
          System Health
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <HealthCard
            label="Database"
            status="Connected"
            color="green"
            detail={`${stats.profiles} profiles, ${stats.invoices} invoices, ${stats.expenses} expenses`}
          />
          <HealthCard
            label="DATEV API"
            status={datevConnected ? (datevExpired ? "Token Expired" : "Connected") : "Disconnected"}
            color={datevConnected ? (datevExpired ? "yellow" : "green") : "red"}
          />
          <HealthCard
            label="Email (Resend)"
            status={hasResendKey ? "Configured" : "Not configured"}
            color={hasResendKey ? "green" : "red"}
          />
          <HealthCard
            label="AI (Anthropic)"
            status={hasAnthropicKey ? "Configured" : "Not configured"}
            color={hasAnthropicKey ? "green" : "red"}
          />
          <HealthCard
            label="Vercel"
            status="Deployed"
            color="green"
            detail="Application is running"
          />
          <HealthCard
            label="PWA"
            status="Enabled"
            color="green"
            detail="/manifest.json"
          />
        </div>
      </section>

      {/* Section 3: Recent Activity */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
          Recent Activity
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
          {recentLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentLogs.map((log, i) => (
                    <tr key={log.id ?? i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                        {log.action ?? "-"}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400">
                        {log.source ?? "-"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs truncate">
                        {log.details ?? (log.payload ? JSON.stringify(log.payload).slice(0, 100) : "-")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-slate-400">
              No recent activity logged.
            </div>
          )}
        </div>
      </section>

      {/* Section 4: Data Overview */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
          Data Overview
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <DataStatCard
            label="Teaching Artists"
            value={stats.profiles}
            breakdown={[
              { label: "Active", value: stats.activeTAs },
              { label: "Inactive", value: stats.inactiveTAs },
            ]}
          />
          <DataStatCard label="Projects" value={stats.projects} />
          <DataStatCard
            label="Invoices"
            value={stats.invoices}
            breakdown={[
              { label: "Submitted", value: stats.invoicesSubmitted },
              { label: "Approved", value: stats.invoicesApproved },
              { label: "Paid", value: stats.invoicesPaid },
            ]}
          />
          <DataStatCard
            label="Expenses"
            value={stats.expenses}
            breakdown={[
              { label: "Submitted", value: stats.expensesSubmitted },
              { label: "Approved", value: stats.expensesApproved },
              { label: "Paid", value: stats.expensesPaid },
            ]}
          />
          <DataStatCard
            label="Admin Uploads"
            value={stats.adminUploads}
            breakdown={[
              { label: "Outstanding", value: stats.adminUploadsOutstanding },
              { label: "Paid", value: stats.adminUploadsPaid },
            ]}
          />
        </div>
      </section>

      {/* Section 5: Uptime History */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
          Uptime Monitoring
        </h2>
        {healthChecks.length > 0 ? (
          <div className="space-y-4">
            {/* Latest status per check */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {(() => {
                const latestByName: Record<string, { status: string; message: string | null; checked_at: string }> = {};
                for (const hc of healthChecks) {
                  if (!latestByName[hc.check_name]) {
                    latestByName[hc.check_name] = { status: hc.status, message: hc.message, checked_at: hc.checked_at };
                  }
                }
                return Object.entries(latestByName).map(([name, data]) => (
                  <HealthCard
                    key={name}
                    label={name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    status={data.status === "ok" ? "Healthy" : "Failing"}
                    color={data.status === "ok" ? "green" : "red"}
                    detail={`Last checked: ${new Date(data.checked_at).toLocaleString("de-DE", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}${data.message ? ` — ${data.message}` : ""}`}
                  />
                ));
              })()}
            </div>

            {/* Recent check history table */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Check</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {healthChecks.slice(0, 25).map((hc) => (
                      <tr key={hc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(hc.checked_at).toLocaleString("de-DE", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                          {hc.check_name.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge
                            status={hc.status === "ok" ? "OK" : "Error"}
                            color={hc.status === "ok" ? "green" : "red"}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs truncate">
                          {hc.message || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-400">
              No health check data yet. The cron job runs hourly.
            </p>
          </div>
        )}
      </section>

      {/* Section 6: Issues & Alerts */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
          Issues & Alerts
        </h2>
        {criticalHighItems.length > 0 ? (
          <div className="space-y-3">
            {criticalHighItems.map((item, i) => {
              const isCritical = /CRITICAL/i.test(item);
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-4 ${
                    isCritical
                      ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                      : "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isCritical
                        ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                        : "bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200"
                    }`}>
                      !
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${
                        isCritical
                          ? "text-red-800 dark:text-red-300"
                          : "text-orange-800 dark:text-orange-300"
                      }`}>
                        {isCritical ? "CRITICAL" : "HIGH"}
                      </p>
                      <p className={`text-sm ${
                        isCritical
                          ? "text-red-700 dark:text-red-400"
                          : "text-orange-700 dark:text-orange-400"
                      }`}>
                        {item.replace(/\**(CRITICAL|HIGH)\**[:\s]*/gi, "")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-400">
              {reportContent
                ? "No critical or high severity issues found."
                : "No security scan data yet."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
