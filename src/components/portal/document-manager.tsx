"use client";

import { useState, useRef } from"react";
import { createClient } from"@/lib/supabase/client";
import { useRouter } from"next/navigation";

interface Document {
 id: string;
 type: string;
 file_url: string | null;
 status: string;
 uploaded_at: string | null;
 issue_date: string | null;
 expiry_date: string | null;
 verified_at: string | null;
 notes: string | null;
}

interface ExtractedData {
 is_valid_document: boolean;
 document_type_detected: string;
 holder_name: string | null;
 issue_date: string | null;
 expiry_date: string | null;
 issuing_authority: string | null;
 document_number: string | null;
 confidence: string;
 notes: string | null;
 rejection_reason: string | null;
}

const REQUIRED_DOCS = [
 { type:"right_to_work", label:"Work Permit / Passport / Visa", description:"Upload your right to work document"},
 { type:"police_check", label:"Extended Police Check (Fuhrungszeugnis)", description:"Required for working with minors. Valid for 2 years."},
 { type:"measles", label:"Measles Vaccination Proof", description:"Proof of measles vaccination or immunity"},
 { type:"first_aid", label:"First Aid Certificate", description:"A valid first aid certificate"},
];

const STATUS_STYLES: Record<string, string> = {
 not_uploaded:"bg-neutral-100 text-neutral-500",
 uploaded:"bg-blue-50 text-blue-700",
 verified:"bg-green-50 text-green-700",
 expiring:"bg-yellow-50 text-yellow-700",
 expired:"bg-red-50 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
 not_uploaded:"Not uploaded",
 uploaded:"Pending review",
 verified:"Verified",
 expiring:"Expiring soon",
 expired:"Expired",
};

export function DocumentManager({ profileId, documents }: { profileId: string; documents: Document[] }) {
 const [docs, setDocs] = useState<Map<string, Document>>(
 new Map(documents.map((d) => [d.type, d]))
 );
 const [preview, setPreview] = useState<string | null>(null);
 const router = useRouter();

 return (
 <>
 <div className="space-y-4">
 {REQUIRED_DOCS.map((req) => (
 <DocCard
 key={req.type}
 req={req}
 doc={docs.get(req.type)}
 profileId={profileId}
 onUploaded={(doc) => {
 setDocs((prev) => {
 const m = new Map(prev);
 m.set(req.type, doc);
 return m;
 });
 router.refresh();
 }}
 onPreview={(url) => setPreview(url)}
 />
 ))}
 </div>

 {/* Contracts section */}
 <div className="mt-8">
 <h2 className="text-lg font-semibold text-neutral-900 mb-3">
 Contracts & Declarations
 </h2>
 <div className="rounded-sm border border-dashed border-neutral-300 bg-white p-8 text-center">
 <p className="text-sm text-neutral-500">
 Contracts and declarations sent by InterACT will appear here for you to sign.
 </p>
 </div>
 </div>

 {/* Preview modal */}
 {preview && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"onClick={() => setPreview(null)}>
 <div className="relative max-h-[90vh] max-w-4xl w-full overflow-auto rounded-sm bg-white"onClick={(e) => e.stopPropagation()}>
 <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
 <h3 className="text-sm font-semibold text-neutral-900">Document Preview</h3>
 <div className="flex items-center gap-2">
 <a
 href={preview}
 target="_blank"rel="noopener noreferrer"className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-white">
 Open in new tab
 </a>
 <button
 onClick={() => setPreview(null)}
 className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
 <svg className="h-5 w-5"fill="none"viewBox="0 0 24 24"strokeWidth={2} stroke="currentColor">
 <path strokeLinecap="round"strokeLinejoin="round"d="M6 18L18 6M6 6l12 12"/>
 </svg>
 </button>
 </div>
 </div>
 <div className="p-2">
 {preview.match(/\.pdf/i) ? (
 <iframe src={preview} className="h-[70vh] w-full rounded-lg"/>
 ) : (
 <img src={preview} alt="Document"className="max-h-[70vh] w-full rounded-lg object-contain"/>
 )}
 </div>
 </div>
 </div>
 )}
 </>
 );
}

function DocCard({
 req,
 doc,
 profileId,
 onUploaded,
 onPreview,
}: {
 req: { type: string; label: string; description: string };
 doc?: Document;
 profileId: string;
 onUploaded: (doc: Document) => void;
 onPreview: (url: string) => void;
}) {
 const [uploading, setUploading] = useState(false);
 const [analyzing, setAnalyzing] = useState(false);
 const [extracted, setExtracted] = useState<ExtractedData | null>(null);
 const [verification, setVerification] = useState<{ valid: boolean; message: string } | null>(null);
 const [issueDate, setIssueDate] = useState(doc?.issue_date ||"");
 const [expiryDate, setExpiryDate] = useState(doc?.expiry_date ||"");
 const [pendingUrl, setPendingUrl] = useState<string | null>(null);
 const fileRef = useRef<HTMLInputElement>(null);
 const status = doc?.status ||"not_uploaded";
 const hasFile = doc?.file_url;

 async function handleFile(file: File) {
 setUploading(true);
 setExtracted(null);
 setVerification(null);

 const supabase = createClient();
 const fileName = `documents/${profileId}/${req.type}/${Date.now()}-${file.name}`;

 const { data, error } = await supabase.storage
 .from("documents")
 .upload(fileName, file);

 if (error) {
 setUploading(false);
 return;
 }

 const { data: signedData } = await supabase.storage
 .from("documents")
 .createSignedUrl(data.path, 86400);

 const fileUrl = signedData?.signedUrl ||"";
 setPendingUrl(fileUrl);
 setUploading(false);

 // Run AI extraction
 setAnalyzing(true);
 try {
 const res = await fetch("/api/portal/documents/extract", {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ file_url: fileUrl, doc_type: req.type }),
 });
 const result = await res.json();

 if (result.extracted) {
 setExtracted(result.extracted);
 if (result.extracted.issue_date) setIssueDate(result.extracted.issue_date);
 if (result.extracted.expiry_date) setExpiryDate(result.extracted.expiry_date);
 }
 if (result.verification) {
 setVerification(result.verification);
 }
 } catch {
 setVerification({ valid: true, message:"AI extraction unavailable — enter dates manually"});
 }
 setAnalyzing(false);
 }

 async function confirmUpload() {
 const url = pendingUrl || doc?.file_url;
 if (!url) return;

 try {
 await fetch("/api/portal/documents", {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({
 type: req.type,
 file_url: url,
 issue_date: issueDate || null,
 expiry_date: expiryDate || null,
 }),
 });

 onUploaded({
 id: doc?.id ||"",
 type: req.type,
 file_url: url,
 status:"uploaded",
 uploaded_at: new Date().toISOString(),
 issue_date: issueDate || null,
 expiry_date: expiryDate || null,
 verified_at: null,
 notes: null,
 });

 setPendingUrl(null);
 setExtracted(null);
 setVerification(null);
 } catch {
 alert("Failed to save document. Please try again.");
 }
 }

 // Show extraction/confirmation panel
 if (pendingUrl || analyzing) {
 return (
 <div className="overflow-hidden rounded-sm border border-neutral-200/80 bg-white">
 <div className="border-b border-neutral-100 bg-white/50 px-6 py-4">
 <h3 className="text-sm font-semibold text-neutral-900">{req.label}</h3>
 </div>

 <div className="p-6 space-y-5">
 {/* Preview thumbnail */}
 <div className="flex gap-4">
 <div
 className="flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-sm border border-neutral-200 bg-white"onClick={() => pendingUrl && onPreview(pendingUrl)}
 >
 {pendingUrl?.match(/\.pdf/i) ? (
 <svg className="h-8 w-8 text-red-500"fill="currentColor"viewBox="0 0 24 24">
 <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6"fill="none"stroke="currentColor"strokeWidth="1.5"/>
 <text x="7"y="18"fontSize="6"fontWeight="bold"fill="currentColor">PDF</text>
 </svg>
 ) : (
 <img src={pendingUrl!} alt=""className="h-full w-full object-cover"/>
 )}
 </div>

 <div className="flex-1">
 {analyzing ? (
 <div className="flex items-center gap-3">
 <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900"/>
 <span className="text-sm text-neutral-500">Analyzing document...</span>
 </div>
 ) : verification ? (
 <div className={`rounded-sm p-4 ${
 verification.valid
 ?"bg-green-50":"bg-red-50"}`}>
 <div className="flex items-center gap-2">
 {verification.valid ? (
 <svg className="h-5 w-5 text-green-600"fill="none"viewBox="0 0 24 24"strokeWidth={2} stroke="currentColor">
 <path strokeLinecap="round"strokeLinejoin="round"d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
 </svg>
 ) : (
 <svg className="h-5 w-5 text-red-600"fill="none"viewBox="0 0 24 24"strokeWidth={2} stroke="currentColor">
 <path strokeLinecap="round"strokeLinejoin="round"d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
 </svg>
 )}
 <span className={`text-sm font-medium ${verification.valid ?"text-green-700":"text-red-700"}`}>
 {verification.message}
 </span>
 </div>
 {extracted?.confidence && (
 <span className="mt-1 inline-block text-xs text-neutral-500">Confidence: {extracted.confidence}</span>
 )}
 </div>
 ) : null}

 {/* Extracted details */}
 {extracted && (
 <div className="mt-3 space-y-1 text-xs text-neutral-500">
 {extracted.holder_name && <p>Name: <span className="font-medium text-neutral-700">{extracted.holder_name}</span></p>}
 {extracted.issuing_authority && <p>Issued by: <span className="font-medium text-neutral-700">{extracted.issuing_authority}</span></p>}
 {extracted.document_number && <p>Doc #: <span className="font-medium text-neutral-700">{extracted.document_number}</span></p>}
 {extracted.notes && <p className="text-neutral-400">{extracted.notes}</p>}
 </div>
 )}
 </div>
 </div>

 {/* Date fields */}
 {!analyzing && (
 <div className="flex gap-4">
 <div className="flex-1">
 <label className="mb-1.5 block text-[13px] font-medium text-neutral-600">Issue date</label>
 <input
 type="date"value={issueDate}
 onChange={(e) => setIssueDate(e.target.value)}
 className="block w-full rounded-sm border border-neutral-200 bg-white/50 px-4 py-2.5 text-sm text-neutral-900 focus:border-neutral-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-400"/>
 </div>
 <div className="flex-1">
 <label className="mb-1.5 block text-[13px] font-medium text-neutral-600">Expiry date</label>
 <input
 type="date"value={expiryDate}
 onChange={(e) => setExpiryDate(e.target.value)}
 className="block w-full rounded-sm border border-neutral-200 bg-white/50 px-4 py-2.5 text-sm text-neutral-900 focus:border-neutral-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-400"/>
 </div>
 </div>
 )}

 {/* Actions */}
 {!analyzing && (
 <div className="flex items-center gap-3">
 <button
 onClick={confirmUpload}
 disabled={!verification?.valid && verification !== null}
 className="rounded-sm bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50">
 {verification?.valid === false ?"Document rejected":"Confirm & save"}
 </button>
 <button
 onClick={() => { setPendingUrl(null); setExtracted(null); setVerification(null); }}
 className="rounded-sm border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-white">
 Cancel
 </button>
 {!verification?.valid && verification !== null && (
 <button
 onClick={() => fileRef.current?.click()}
 className="rounded-sm border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-white">
 Try different file
 </button>
 )}
 </div>
 )}
 </div>

 <input ref={fileRef} type="file"accept=".pdf,.jpg,.jpeg,.png"className="hidden"onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
 </div>
 );
 }

 // Normal card view
 return (
 <div className="overflow-hidden rounded-sm border border-neutral-200/80 bg-white">
 <div className="flex items-start gap-4 p-5">
 {/* Icon / thumbnail */}
 <div
 className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-sm ${
 hasFile
 ?"cursor-pointer bg-blue-50 text-blue-600 hover:bg-blue-100":"bg-neutral-100 text-neutral-400"}`}
 onClick={() => hasFile && onPreview(doc!.file_url!)}
 >
 {hasFile ? (
 <svg className="h-6 w-6"fill="none"viewBox="0 0 24 24"strokeWidth={1.5} stroke="currentColor">
 <path strokeLinecap="round"strokeLinejoin="round"d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
 <path strokeLinecap="round"strokeLinejoin="round"d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
 </svg>
 ) : (
 <svg className="h-6 w-6"fill="none"viewBox="0 0 24 24"strokeWidth={1.5} stroke="currentColor">
 <path strokeLinecap="round"strokeLinejoin="round"d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
 </svg>
 )}
 </div>

 {/* Content */}
 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between gap-3">
 <div>
 <h3 className="text-sm font-semibold text-neutral-900">{req.label}</h3>
 <p className="mt-0.5 text-[13px] text-neutral-500">{req.description}</p>
 </div>
 <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[status]}`}>
 {STATUS_LABELS[status]}
 </span>
 </div>

 {/* File info */}
 {hasFile && (
 <div className="mt-3 flex items-center gap-4 text-xs text-neutral-400">
 {doc!.uploaded_at && (
 <span>Uploaded {new Date(doc!.uploaded_at).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric"})}</span>
 )}
 {doc!.issue_date && (
 <span>Issued {new Date(doc!.issue_date).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric"})}</span>
 )}
 {doc!.expiry_date && (
 <span className={doc!.status ==="expiring"|| doc!.status ==="expired"?"text-red-500 font-medium":""}>
 Expires {new Date(doc!.expiry_date).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric"})}
 </span>
 )}
 </div>
 )}

 {/* Actions */}
 <div className="mt-3 flex items-center gap-2">
 {hasFile && (
 <button
 onClick={() => onPreview(doc!.file_url!)}
 className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-white">
 Preview
 </button>
 )}
 <button
 onClick={() => fileRef.current?.click()}
 disabled={uploading}
 className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
 hasFile
 ?"border border-neutral-200 text-neutral-700 hover:bg-white":"bg-neutral-900 text-white hover:bg-neutral-800"}`}
 >
 {uploading ?"Uploading...": hasFile ?"Replace":"Upload"}
 </button>
 </div>
 </div>
 </div>

 <input ref={fileRef} type="file"accept=".pdf,.jpg,.jpeg,.png"className="hidden"onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
 </div>
 );
}
