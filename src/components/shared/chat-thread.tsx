"use client";

import { useState, useRef, useEffect } from"react";
import { useRouter } from"next/navigation";
import Link from"next/link";

interface Message {
 id: string;
 from_user_id: string;
 to_user_id: string;
 body: string;
 created_at: string;
 read_at: string | null;
}

function formatMessageTime(dateStr: string): string {
 const d = new Date(dateStr);
 return d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit"});
}

function formatDateHeader(dateStr: string): string {
 const d = new Date(dateStr);
 const now = new Date();
 const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);

 if (diffDays === 0) return"Today";
 if (diffDays === 1) return"Yesterday";
 return d.toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long"});
}

export function ChatThread({
 messages,
 currentUserId,
 otherUserId,
 otherName,
 otherPhoto,
 backHref,
}: {
 messages: Message[];
 currentUserId: string;
 otherUserId: string;
 otherName: string;
 otherPhoto?: string | null;
 backHref: string;
}) {
 const [newMessage, setNewMessage] = useState("");
 const [sending, setSending] = useState(false);
 const router = useRouter();
 const bottomRef = useRef<HTMLDivElement>(null);
 const inputRef = useRef<HTMLTextAreaElement>(null);

 useEffect(() => {
 bottomRef.current?.scrollIntoView({ behavior:"smooth"});
 }, [messages]);

 useEffect(() => {
 inputRef.current?.focus();
 }, []);

 async function handleSend(e: React.FormEvent) {
 e.preventDefault();
 if (!newMessage.trim()) return;

 setSending(true);
 await fetch("/api/messages", {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({
 to_user_id: otherUserId,
 body: newMessage.trim(),
 }),
 });

 setNewMessage("");
 setSending(false);
 router.refresh();
 }

 function handleKeyDown(e: React.KeyboardEvent) {
 if (e.key ==="Enter"&& !e.shiftKey) {
 e.preventDefault();
 handleSend(e);
 }
 }

 // Group messages by date
 let lastDate ="";
 const initials = otherName.split("").map((n) => n[0]).join("").toUpperCase();

 return (
 <div className="flex flex-col overflow-hidden rounded-sm border border-neutral-200/80 bg-white"style={{ height:"calc(100vh - 220px)"}}>
 {/* Header */}
 <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-3.5">
 <Link href={backHref} className="rounded-sm p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
 <svg className="h-5 w-5"fill="none"viewBox="0 0 24 24"strokeWidth={2} stroke="currentColor">
 <path strokeLinecap="round"strokeLinejoin="round"d="M15.75 19.5L8.25 12l7.5-7.5"/>
 </svg>
 </Link>
 {otherPhoto ? (
 <img src={otherPhoto} alt=""className="h-9 w-9 rounded-full object-cover"/>
 ) : (
 <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
 {initials}
 </div>
 )}
 <div>
 <p className="text-sm font-semibold text-neutral-900">{otherName}</p>
 </div>
 </div>

 {/* Messages */}
 <div className="flex-1 overflow-y-auto px-5 py-4">
 {messages.length === 0 && (
 <div className="flex flex-col items-center justify-center h-full">
 <svg className="h-10 w-10 text-neutral-200"fill="none"viewBox="0 0 24 24"strokeWidth={1.5} stroke="currentColor">
 <path strokeLinecap="round"strokeLinejoin="round"d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
 </svg>
 <p className="mt-3 text-sm text-neutral-400">No messages yet</p>
 <p className="text-xs text-neutral-400">Start the conversation below</p>
 </div>
 )}
 <div className="space-y-1">
 {messages.map((msg) => {
 const isMe = msg.from_user_id === currentUserId;
 const msgDate = new Date(msg.created_at).toDateString();
 let showDate = false;
 if (msgDate !== lastDate) {
 showDate = true;
 lastDate = msgDate;
 }

 return (
 <div key={msg.id}>
 {showDate && (
 <div className="flex items-center justify-center py-3">
 <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-medium text-neutral-500">
 {formatDateHeader(msg.created_at)}
 </span>
 </div>
 )}
 <div className={`flex ${isMe ?"justify-end":"justify-start"} mb-1`}>
 <div className={`group max-w-[75%] rounded-sm px-4 py-2.5 ${
 isMe
 ?"rounded-br-md bg-neutral-900 text-white":"rounded-bl-md bg-neutral-100 text-neutral-900"}`}>
 <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.body}</p>
 <div className={`mt-1 flex items-center gap-1 ${isMe ?"justify-end":""}`}>
 <span className={`text-[10px] ${isMe ?"text-neutral-400":"text-neutral-400"}`}>
 {formatMessageTime(msg.created_at)}
 </span>
 {isMe && msg.read_at && (
 <svg className="h-3 w-3 text-blue-400"fill="none"viewBox="0 0 24 24"strokeWidth={2} stroke="currentColor">
 <path strokeLinecap="round"strokeLinejoin="round"d="M4.5 12.75l6 6 9-13.5"/>
 </svg>
 )}
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 <div ref={bottomRef} />
 </div>

 {/* Input */}
 <form onSubmit={handleSend} className="flex items-end gap-3 border-t border-neutral-100 px-5 py-4">
 <textarea
 ref={inputRef}
 value={newMessage}
 onChange={(e) => setNewMessage(e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder="Type a message..."rows={1}
 className="flex-1 resize-none rounded-sm border border-neutral-200 bg-white/50 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-400"style={{ maxHeight:"120px"}}
 onInput={(e) => {
 const t = e.currentTarget;
 t.style.height ="auto";
 t.style.height = Math.min(t.scrollHeight, 120) +"px";
 }}
 />
 <button
 type="submit"disabled={sending || !newMessage.trim()}
 className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-neutral-900 text-white transition-colors hover:bg-neutral-800 disabled:opacity-30">
 <svg className="h-4 w-4"fill="none"viewBox="0 0 24 24"strokeWidth={2} stroke="currentColor">
 <path strokeLinecap="round"strokeLinejoin="round"d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
 </svg>
 </button>
 </form>
 </div>
 );
}
