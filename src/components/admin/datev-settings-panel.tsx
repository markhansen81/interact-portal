"use client";

import { useState, useEffect } from"react";
import { useSearchParams } from"next/navigation";

interface Props {
 isConnected: boolean;
 isExpired: boolean;
 connectedAt: string | null;
 selectedClientId: string | null;
 selectedClientName: string | null;
}

interface DatevClient {
 id: string;
 name: string;
}

export function DatevSettingsPanel({
 isConnected,
 isExpired,
 connectedAt,
 selectedClientId,
 selectedClientName,
}: Props) {
 const searchParams = useSearchParams();
 const success = searchParams.get("success");
 const error = searchParams.get("error");

 const [clients, setClients] = useState<DatevClient[]>([]);
 const [loadingClients, setLoadingClients] = useState(false);
 const [selectedClient, setSelectedClient] = useState(selectedClientId ??"");
 const [saving, setSaving] = useState(false);
 const [saveMessage, setSaveMessage] = useState("");

 // Fetch available clients when connected
 useEffect(() => {
 if (isConnected && !isExpired) {
 setLoadingClients(true);
 fetch("/api/auth/datev/clients")
 .then((res) => res.json())
 .then((data) => {
 if (data.clients) setClients(data.clients);
 })
 .catch(() => {})
 .finally(() => setLoadingClients(false));
 }
 }, [isConnected, isExpired]);

 async function handleSaveClient() {
 if (!selectedClient) return;
 setSaving(true);
 setSaveMessage("");

 try {
 const clientName =
 clients.find((c) => c.id === selectedClient)?.name ?? selectedClient;

 const res = await fetch("/api/auth/datev/clients", {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({
 clientId: selectedClient,
 clientName,
 }),
 });

 if (res.ok) {
 setSaveMessage("Client saved successfully.");
 } else {
 const data = await res.json();
 setSaveMessage(data.error ??"Failed to save client.");
 }
 } catch {
 setSaveMessage("Network error.");
 } finally {
 setSaving(false);
 }
 }

 const connected = isConnected && !isExpired;

 return (
 <div className="space-y-6">
 {/* Status messages */}
 {success && (
 <div className="rounded-sm bg-green-50 p-4 text-sm text-green-800">
 Successfully connected to DATEV.
 </div>
 )}
 {error && (
 <div className="rounded-sm bg-red-50 p-4 text-sm text-red-800">
 Error: {error}
 </div>
 )}

 {/* Connection status card */}
 <div className="rounded-sm border border-neutral-200 bg-white p-6">
 <h2 className="text-lg font-semibold text-neutral-900">
 Connection Status
 </h2>

 <div className="mt-4 flex items-center gap-3">
 <span
 className={`inline-flex h-3 w-3 rounded-full ${
 connected
 ?"bg-green-500"
 : isConnected && isExpired
 ?"bg-yellow-500"
 :"bg-neutral-300"
 }`}
 />
 <span className="text-sm text-neutral-700">
 {connected
 ?"Connected"
 : isConnected && isExpired
 ?"Token expired — reconnect required"
 :"Not connected"}
 </span>
 </div>

 {connectedAt && (
 <p className="mt-2 text-xs text-neutral-500">
 Connected on{""}
 {new Date(connectedAt).toLocaleDateString("de-DE", {
 year:"numeric",
 month:"long",
 day:"numeric",
 hour:"2-digit",
 minute:"2-digit",
 })}
 </p>
 )}

 <div className="mt-6">
 <a
 href="/api/auth/datev"
 className="inline-flex items-center rounded-sm bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
 >
 {connected ?"Reconnect to DATEV":"Connect to DATEV"}
 </a>
 </div>
 </div>

 {/* Client selection — only shown when connected */}
 {connected && (
 <div className="rounded-sm border border-neutral-200 bg-white p-6">
 <h2 className="text-lg font-semibold text-neutral-900">
 DATEV Client
 </h2>
 <p className="mt-1 text-sm text-neutral-500">
 Select which DATEV client to upload documents to.
 </p>

 {loadingClients ? (
 <p className="mt-4 text-sm text-neutral-500">Loading clients...</p>
 ) : clients.length > 0 ? (
 <div className="mt-4 flex items-end gap-3">
 <div className="flex-1">
 <label
 htmlFor="datev-client"
 className="block text-sm font-medium text-neutral-700"
 >
 Client
 </label>
 <select
 id="datev-client"
 value={selectedClient}
 onChange={(e) => setSelectedClient(e.target.value)}
 className="mt-1 block w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
 >
 <option value="">Select a client...</option>
 {clients.map((c) => (
 <option key={c.id} value={c.id}>
 {c.name} ({c.id})
 </option>
 ))}
 </select>
 </div>
 <button
 onClick={handleSaveClient}
 disabled={!selectedClient || saving}
 className="rounded-sm bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
 >
 {saving ?"Saving...":"Save"}
 </button>
 </div>
 ) : (
 <p className="mt-4 text-sm text-neutral-500">
 No clients found. Check your DATEV account permissions.
 </p>
 )}

 {selectedClientName && !selectedClient && (
 <p className="mt-2 text-sm text-neutral-500">
 Currently selected: <strong>{selectedClientName}</strong>
 </p>
 )}

 {saveMessage && (
 <p className="mt-3 text-sm text-neutral-600">
 {saveMessage}
 </p>
 )}
 </div>
 )}
 </div>
 );
}
