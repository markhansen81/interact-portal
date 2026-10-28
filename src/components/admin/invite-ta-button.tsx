"use client";

import { useState } from"react";
import { useRouter } from"next/navigation";

export function InviteTAButton() {
 const [open, setOpen] = useState(false);
 const [email, setEmail] = useState("");
 const [firstName, setFirstName] = useState("");
 const [lastName, setLastName] = useState("");
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [success, setSuccess] = useState(false);
 const [tempPassword, setTempPassword] = useState("");
 const router = useRouter();

 async function handleInvite(e: React.FormEvent) {
 e.preventDefault();
 setLoading(true);
 setError(null);

 const res = await fetch("/api/admin/invite-ta", {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ email, firstName, lastName }),
 });

 const data = await res.json();

 if (!res.ok) {
 setError(data.error ||"Failed to invite");
 setLoading(false);
 return;
 }

 setTempPassword(data.tempPassword);
 setSuccess(true);
 setLoading(false);
 }

 function handleClose() {
 setOpen(false);
 setEmail("");
 setFirstName("");
 setLastName("");
 setSuccess(false);
 setTempPassword("");
 router.refresh();
 }

 if (!open) {
 return (
 <button
 onClick={() => setOpen(true)}
 className="rounded-sm bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
 >
 Invite TA
 </button>
 );
 }

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
 <div className="w-full max-w-md rounded-sm bg-white p-6" onClick={(e) => e.stopPropagation()}
 <h3 className="text-lg font-semibold text-neutral-900">
 Invite Teaching Artist
 </h3>

 {success ? (
 <div className="mt-4 space-y-3">
 <p className="text-sm text-green-600">Account created!</p>
 <div className="rounded-sm bg-neutral-50 p-4">
 <p className="text-xs text-neutral-500">Credentials (share with TA):</p>
 <p className="mt-1 text-sm font-mono text-neutral-900">
 Email: {email}
 </p>
 <p className="text-sm font-mono text-neutral-900">
 Password: {tempPassword}
 </p>
 </div>
 <p className="text-xs text-neutral-400">TA should change password on first login.</p>
 <button
 onClick={handleClose}
 className="w-full rounded-sm bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
 >
 Done
 </button>
 </div>
 ) : (
 <form onSubmit={handleInvite} className="mt-4 space-y-4">
 <div>
 <label className="block text-sm font-medium text-neutral-700">
 Email
 </label>
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 required
 className="mt-1 block w-full rounded-sm border border-neutral-300 px-3 py-2 text-sm"
 placeholder="ta@interactenglish.de"
 />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-sm font-medium text-neutral-700">
 First name
 </label>
 <input
 type="text"
 value={firstName}
 onChange={(e) => setFirstName(e.target.value)}
 className="mt-1 block w-full rounded-sm border border-neutral-300 px-3 py-2 text-sm"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-neutral-700">
 Last name
 </label>
 <input
 type="text"
 value={lastName}
 onChange={(e) => setLastName(e.target.value)}
 className="mt-1 block w-full rounded-sm border border-neutral-300 px-3 py-2 text-sm"
 />
 </div>
 </div>

 {error && (
 <p className="text-sm text-red-600">{error}</p>
 )}

 <div className="flex justify-end gap-3">
 <button
 type="button"
 onClick={() => setOpen(false)}
 className="rounded-sm px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={loading}
 className="rounded-sm bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
 >
 {loading ?"Inviting...":"Send Invite"}
 </button>
 </div>
 </form>
 )}
 </div>
 </div>
 );
}
