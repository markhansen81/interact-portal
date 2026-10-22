"use client";

import { useState, useRef, useEffect } from"react";
import { useRouter } from"next/navigation";
import Link from"next/link";
import Image from"next/image";
import { createClient } from"@/lib/supabase/client";

interface WorkOrder {
 id: string;
 project_name: string;
 program_type: string;
 start_date: string;
}

const CATEGORIES = [
 { value:"materialien", label:"Materialien (Supplies)"},
 { value:"lebensmittel", label:"Lebensmittel (Food)"},
 { value:"transport", label:"Transport (Travel/Transit)"},
 { value:"unterkunft", label:"Unterkunft (Accommodation)"},
 { value:"druck", label:"Druck/Kopien (Printing)"},
 { value:"sonstiges", label:"Sonstiges (Other)"},
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

interface ExpenseItem {
 description: string;
 amount: string;
 category: Category |"";
 work_order_id: string;
 receiptFile: File | null;
 receiptPreview: string | null;
}

function emptyItem(): ExpenseItem {
 return {
 description:"",
 amount:"",
 category:"",
 work_order_id:"",
 receiptFile: null,
 receiptPreview: null,
 };
}

export function ExpenseClaimForm({
 workOrders,
}: {
 workOrders: WorkOrder[];
}) {
 const DRAFT_KEY ="expense-draft";
 const router = useRouter();
 const [items, setItems] = useState<ExpenseItem[]>([emptyItem()]);
 const [notes, setNotes] = useState("");
 const [loading, setLoading] = useState(false);
 const [draftSaved, setDraftSaved] = useState(false);
 const [draftLoaded, setDraftLoaded] = useState(false);
 const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

 // Restore draft on mount
 useEffect(() => {
 const saved = localStorage.getItem(DRAFT_KEY);
 if (saved) {
 try {
 const draft = JSON.parse(saved);
 if (draft.items?.length) {
 setItems(
 draft.items.map((item: Partial<ExpenseItem>) => ({
 ...emptyItem(),
 description: item.description ||"",
 amount: item.amount ||"",
 category: item.category ||"",
 work_order_id: item.work_order_id ||"",
 receiptFile: null,
 receiptPreview: null,
 }))
 );
 }
 if (draft.notes) setNotes(draft.notes);
 setDraftLoaded(true);
 } catch {
 // ignore corrupt draft
 }
 }
 }, []);

 // Save draft debounced on every change
 useEffect(() => {
 const timer = setTimeout(() => {
 const draft = {
 items: items.map(({ description, amount, category, work_order_id }) => ({
 description,
 amount,
 category,
 work_order_id,
 })),
 notes,
 };
 localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
 setDraftSaved(true);
 const fade = setTimeout(() => setDraftSaved(false), 2000);
 return () => clearTimeout(fade);
 }, 2000);
 return () => clearTimeout(timer);
 }, [items, notes]);

 function discardDraft() {
 localStorage.removeItem(DRAFT_KEY);
 setItems([emptyItem()]);
 setNotes("");
 setDraftLoaded(false);
 }

 const total = items.reduce(
 (sum, item) => sum + (parseFloat(item.amount) || 0),
 0
 );

 function addItem() {
 setItems([...items, emptyItem()]);
 }

 function removeItem(index: number) {
 if (items.length <= 1) return;
 const updated = items.filter((_, i) => i !== index);
 setItems(updated);
 }

 function updateItem(
 index: number,
 field: keyof ExpenseItem,
 value: string | File | null
 ) {
 setItems(
 items.map((item, i) =>
 i === index ? { ...item, [field]: value } : item
 )
 );
 }

 function handleFileChange(index: number, file: File | null) {
 if (!file) {
 updateItem(index,"receiptFile", null);
 updateItem(index,"receiptPreview", null);
 return;
 }
 updateItem(index,"receiptFile", file);
 const reader = new FileReader();
 reader.onloadend = () => {
 setItems((prev) =>
 prev.map((item, i) =>
 i === index ? { ...item, receiptPreview: reader.result as string } : item
 )
 );
 };
 reader.readAsDataURL(file);
 }

 function clearReceipt(index: number) {
 setItems((prev) =>
 prev.map((item, i) =>
 i === index
 ? { ...item, receiptFile: null, receiptPreview: null }
 : item
 )
 );
 if (fileInputRefs.current[index]) {
 fileInputRefs.current[index]!.value ="";
 }
 }

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 setLoading(true);

 const supabase = createClient();

 // Upload receipts
 const uploadedItems = await Promise.all(
 items.map(async (item) => {
 let receipt_url = null;
 if (item.receiptFile) {
 const fileName = `receipts/${Date.now()}-${item.receiptFile.name}`;
 const { data } = await supabase.storage
 .from("documents")
 .upload(fileName, item.receiptFile);
 if (data) {
 const { data: signedData } = await supabase.storage
 .from("documents")
 .createSignedUrl(data.path, 86400);
 receipt_url = signedData?.signedUrl || null;
 }
 }
 return {
 description: item.description,
 amount: parseFloat(item.amount) || 0,
 category: item.category,
 work_order_id: item.work_order_id || null,
 receipt_url,
 };
 })
 );

 const res = await fetch("/api/portal/expenses", {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({
 items: uploadedItems,
 total,
 notes,
 }),
 });

 if (res.ok) {
 localStorage.removeItem(DRAFT_KEY);
 router.push("/portal/expenses");
 router.refresh();
 }
 setLoading(false);
 }

 return (
 <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4 pb-28">
 {/* Back link */}
 <Link
 href="/portal/expenses"className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
 <svg className="h-4 w-4"fill="none"viewBox="0 0 24 24"stroke="currentColor"strokeWidth={2}>
 <path strokeLinecap="round"strokeLinejoin="round"d="M15 19l-7-7 7-7"/>
 </svg>
 Back
 </Link>

 {/* Draft indicator */}
 <div className="flex items-center gap-3 px-1 min-h-[20px]">
 {draftSaved && (
 <p className="text-xs text-amber-500 animate-pulse">Entwurf gespeichert</p>
 )}
 {draftLoaded && (
 <button
 type="button"onClick={discardDraft}
 className="text-xs text-neutral-400 hover:text-red-500 transition-colors">
 Entwurf verwerfen
 </button>
 )}
 </div>

 {/* Receipt Items */}
 <div className="space-y-3">
 <h3 className="text-base font-semibold text-neutral-900 px-1">
 Receipts
 </h3>

 {items.map((item, i) => (
 <div
 key={i}
 className="relative rounded-sm border border-neutral-200 bg-white p-4">
 {/* Remove button */}
 {items.length > 1 && (
 <button
 type="button"onClick={() => removeItem(i)}
 className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100"aria-label="Remove item">
 <svg className="h-4 w-4"fill="none"viewBox="0 0 24 24"stroke="currentColor"strokeWidth={2}>
 <path strokeLinecap="round"strokeLinejoin="round"d="M6 18L18 6M6 6l12 12"/>
 </svg>
 </button>
 )}

 <div className="space-y-3">
 {/* 1. Photo / Receipt Upload */}
 <div>
 <label className="block text-xs font-medium text-neutral-500 mb-1.5">
 Receipt Photo
 </label>
 {item.receiptPreview ? (
 <div className="relative inline-block">
 <Image
 src={item.receiptPreview}
 alt="Receipt preview"width={160}
 height={160}
 className="h-32 w-32 rounded-sm border border-neutral-200 object-cover"/>
 <button
 type="button"onClick={() => clearReceipt(i)}
 className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"aria-label="Remove photo">
 <svg className="h-3.5 w-3.5"fill="none"viewBox="0 0 24 24"stroke="currentColor"strokeWidth={2.5}>
 <path strokeLinecap="round"strokeLinejoin="round"d="M6 18L18 6M6 6l12 12"/>
 </svg>
 </button>
 </div>
 ) : (
 <button
 type="button"onClick={() => fileInputRefs.current[i]?.click()}
 className="flex w-full items-center justify-center gap-2 rounded-sm border-2 border-dashed border-amber-300 bg-amber-50/50 px-4 py-5 text-sm font-medium text-amber-700 transition-colors hover:border-amber-400 hover:bg-amber-50">
 <svg className="h-6 w-6"fill="none"viewBox="0 0 24 24"stroke="currentColor"strokeWidth={1.5}>
 <path strokeLinecap="round"strokeLinejoin="round"d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/>
 <path strokeLinecap="round"strokeLinejoin="round"d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"/>
 </svg>
 Take Photo / Upload
 </button>
 )}
 <input
 ref={(el) => { fileInputRefs.current[i] = el; }}
 type="file"accept="image/*"capture="environment"onChange={(e) => handleFileChange(i, e.target.files?.[0] || null)}
 className="hidden"/>
 </div>

 {/* 2. Category */}
 <div>
 <label className="block text-xs font-medium text-neutral-500 mb-1.5">
 Category *
 </label>
 <select
 value={item.category}
 onChange={(e) => updateItem(i,"category", e.target.value)}
 required
 className="w-full rounded-sm border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
 <option value="">Select category...</option>
 {CATEGORIES.map((cat) => (
 <option key={cat.value} value={cat.value}>
 {cat.label}
 </option>
 ))}
 </select>
 </div>

 {/* 3. Project */}
 <div>
 <label className="block text-xs font-medium text-neutral-500 mb-1.5">
 Project
 </label>
 <select
 value={item.work_order_id}
 onChange={(e) => updateItem(i,"work_order_id", e.target.value)}
 className="w-full rounded-sm border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
 <option value="">General / No project</option>
 {workOrders.map((wo) => (
 <option key={wo.id} value={wo.id}>
 {wo.project_name} — {wo.start_date}
 </option>
 ))}
 </select>
 </div>

 {/* 4. Description */}
 <div>
 <label className="block text-xs font-medium text-neutral-500 mb-1.5">
 Description *
 </label>
 <input
 value={item.description}
 onChange={(e) => updateItem(i,"description", e.target.value)}
 required
 className="w-full rounded-sm border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"placeholder="e.g. Train ticket Berlin → Halle"/>
 </div>

 {/* 5. Amount */}
 <div>
 <label className="block text-xs font-medium text-neutral-500 mb-1.5">
 Amount (EUR) *
 </label>
 <div className="relative">
 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium text-neutral-400">
 &euro;
 </span>
 <input
 type="number"step="0.01"min="0"inputMode="decimal"value={item.amount}
 onChange={(e) => updateItem(i,"amount", e.target.value)}
 required
 className="w-full rounded-sm border border-neutral-300 bg-white py-3 pl-9 pr-4 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"placeholder="0.00"/>
 </div>
 </div>
 </div>
 </div>
 ))}

 {/* Add Receipt button */}
 <button
 type="button"onClick={addItem}
 className="flex w-full items-center justify-center gap-2 rounded-sm border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-4 text-base font-semibold text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 active:bg-amber-200">
 <svg className="h-6 w-6"fill="none"viewBox="0 0 24 24"stroke="currentColor"strokeWidth={2}>
 <path strokeLinecap="round"strokeLinejoin="round"d="M12 4.5v15m7.5-7.5h-15"/>
 </svg>
 Add Receipt
 </button>
 </div>

 {/* Notes */}
 <div className="rounded-sm border border-neutral-200 bg-white p-4">
 <label className="block text-xs font-medium text-neutral-500 mb-1.5">
 Notes (optional)
 </label>
 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 rows={2}
 className="w-full rounded-sm border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"placeholder="Any extra info..."/>
 </div>

 {/* Sticky Total + Submit bar */}
 <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-200 bg-white/95 backdrop-blur-md sm:static sm:rounded-sm sm:border sm:border-amber-200 sm:backdrop-blur-none">
 <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3 sm:px-0">
 <div>
 <p className="text-xs font-medium text-neutral-500">Total</p>
 <p className="text-2xl font-bold text-amber-700">
 &euro;{total.toFixed(2)}
 </p>
 </div>
 <button
 type="submit"disabled={loading || total === 0}
 className="rounded-sm bg-amber-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 sm:px-8">
 {loading ?"Submitting...":"Submit Claim"}
 </button>
 </div>
 </div>
 </form>
 );
}
