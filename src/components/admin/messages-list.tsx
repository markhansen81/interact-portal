"use client";

import { useState } from "react";
import Link from "next/link";

interface TA {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  photo_url: string | null;
}

interface TAStats {
  lastMessage: string;
  lastTime: string;
  unread: number;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-GB", { weekday: "short" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function MessagesList({
  tas,
  taStats,
}: {
  tas: TA[];
  taStats: Record<string, TAStats>;
}) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? tas.filter((ta) => {
        const name = `${ta.first_name ?? ""} ${ta.last_name ?? ""} ${ta.email}`.toLowerCase();
        return name.includes(search.toLowerCase());
      })
    : tas;

  return (
    <div className="space-y-4">
      <div className="relative">
        <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teaching artists…"
          className="w-72 rounded-sm border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#E91E8C] focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-sm border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="text-neutral-500">No teaching artists match your search.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-sm border border-neutral-200 bg-white">
          {filtered.map((ta, i) => {
            const stats = taStats[ta.id];
            const name = ta.first_name && ta.last_name ? `${ta.first_name} ${ta.last_name}` : ta.email;
            const initials = [ta.first_name?.[0], ta.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";

            return (
              <Link
                href={`/admin/messages/${ta.id}`}
                key={ta.id}
                className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-neutral-50 ${
                  i < filtered.length - 1 ? "border-b border-neutral-100" : ""
                } ${stats?.unread ? "bg-blue-50/30" : ""}`}
              >
                <div className="relative">
                  {ta.photo_url ? (
                    <img src={ta.photo_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-500">
                      {initials}
                    </div>
                  )}
                  {(stats?.unread || 0) > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                      {stats.unread}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${stats?.unread ? "font-bold text-neutral-900" : "font-medium text-neutral-900"}`}>
                      {name}
                    </p>
                    {stats?.lastTime && (
                      <span className="text-[11px] text-neutral-400">{formatTime(stats.lastTime)}</span>
                    )}
                  </div>
                  {stats?.lastMessage ? (
                    <p className={`mt-0.5 truncate text-[13px] ${stats.unread ? "font-medium text-neutral-700" : "text-neutral-500"}`}>
                      {stats.lastMessage}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[13px] text-neutral-400 italic">No messages yet</p>
                  )}
                </div>

                <svg className="h-4 w-4 shrink-0 text-neutral-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
