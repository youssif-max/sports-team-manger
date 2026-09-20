"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { postChatMessage } from "@/lib/actions/community";

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; photoUrl: string | null };
};

export function ChatRoom({ teamId, currentUserId }: { teamId: string; currentUserId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/teams/${teamId}/chat`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setMessages(data.messages);
      } catch {
        // ignore transient network errors
      }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [teamId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    const formData = new FormData();
    formData.set("body", body);
    setDraft("");
    startTransition(async () => {
      await postChatMessage(teamId, formData);
      const res = await fetch(`/api/teams/${teamId}/chat`, { cache: "no-store" });
      const data = await res.json();
      setMessages(data.messages);
    });
  }

  return (
    <div className="flex h-[65vh] flex-col rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-neutral-400">
            No messages yet. Say hello 👋
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-end gap-2 ${
              m.author.id === currentUserId ? "flex-row-reverse" : ""
            }`}
          >
            <Avatar name={m.author.name} photoUrl={m.author.photoUrl} size={28} />
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                m.author.id === currentUserId
                  ? "rounded-br-sm bg-blue-600 text-white"
                  : "rounded-bl-sm bg-neutral-100 dark:bg-neutral-800"
              }`}
            >
              {m.author.id !== currentUserId && (
                <p className="mb-0.5 text-xs font-semibold opacity-70">{m.author.name}</p>
              )}
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message the team..."
          className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={isPending || !draft.trim()}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
