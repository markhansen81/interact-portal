"use client";

interface TeamMember {
 id: string;
 ta_id: string;
 role: string;
 profile: {
 first_name: string | null;
 last_name: string | null;
 preferred_name: string | null;
 photo_url: string | null;
 phone: string | null;
 phone_consent: boolean;
 };
}

function getInitials(first: string | null, last: string | null): string {
 const f = first?.charAt(0)?.toUpperCase() || "";
 const l = last?.charAt(0)?.toUpperCase() || "";
 return f + l || "?";
}

export function ProjectTeam({ members }: { members: TeamMember[] }) {
 if (members.length === 0) {
 return (
 <div className="rounded-sm border border-neutral-200 bg-white p-6">
 <h2 className="mb-4 text-lg font-semibold text-neutral-900">Team</h2>
 <p className="text-sm text-neutral-500">No team members assigned yet.</p>
 </div>
 );
 }

 return (
 <div className="rounded-sm border border-neutral-200 bg-white p-6">
 <h2 className="mb-4 text-lg font-semibold text-neutral-900">Team</h2>
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {members.map((m) => {
 const displayName = m.profile.preferred_name || m.profile.first_name || "";
 const fullName = [m.profile.first_name, m.profile.last_name].filter(Boolean).join(" ");
 return (
 <div
 key={m.id}
 className="flex items-center gap-3 rounded-sm border border-neutral-100 p-4"
 >
 {m.profile.photo_url ? (
 <img
 src={m.profile.photo_url}
 alt={fullName}
 className="h-12 w-12 shrink-0 rounded-full object-cover"
 />
 ) : (
 <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-600">
 {getInitials(m.profile.first_name, m.profile.last_name)}
 </div>
 )}
 <div className="min-w-0">
 <p className="truncate text-sm font-medium text-neutral-900">
 {displayName || fullName}
 </p>
 {m.profile.preferred_name && fullName !== m.profile.preferred_name && (
 <p className="truncate text-xs text-neutral-500">{fullName}</p>
 )}
 {m.profile.phone_consent && m.profile.phone && (
 <p className="mt-0.5 text-xs text-neutral-400">{m.profile.phone}</p>
 )}
 <span className="mt-0.5 inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium capitalize text-neutral-600">
 {m.role}
 </span>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
}
