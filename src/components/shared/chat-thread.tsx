"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  // Group messages by date
  let lastDate = "";
  const initials = otherName.split(" ").map((n) => n[0]).join("").toUpperCase();

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900" style={{ height: "calc(100vh - 220px)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
        <Link href={backHref} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        {otherPhoto ? (
          <img src={otherPhoto} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {initials}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{otherName}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <svg className="h-10 w-10 text-zinc-200 dark:text-zinc-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            <p className="mt-3 text-sm text-zinc-400">No messages yet</p>
            <p className="text-xs text-zinc-400">Start the conversation below</p>
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
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800">
                      {formatDateHeader(msg.created_at)}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
                  <div className={`group max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? "rounded-br-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "rounded-bl-md bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  }`}>
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                    <div className={`mt-1 flex items-center gap-1 ${isMe ? "justify-end" : ""}`}>
                      <span className={`text-[10px] ${isMe ? "text-zinc-400" : "text-zinc-400"}`}>
                        {formatMessageTime(msg.created_at)}
                      </span>
                      {isMe && msg.read_at && (
                        <svg className="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
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
      <form onSubmit={handleSend} className="flex items-end gap-3 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <textarea
          ref={inputRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100"
          style={{ maxHeight: "120px" }}
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = "auto";
            t.style.height = Math.min(t.scrollHeight, 120) + "px";
          }}
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:opacity-30 dark:bg-zinc-100 dark:text-zinc-900"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </form>
    </div>
  );
}
