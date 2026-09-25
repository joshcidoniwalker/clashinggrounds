'use client';

import { useEffect, useRef, useState } from 'react';
import { avatarColorFor } from '@/lib/avatarColor';
import type { ChatMessage } from '@/lib/gameApi';

const MAX_BODY_LENGTH = 500;

function formatTime(sentAt: string): string {
  return new Date(sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatPanel({
  messages,
  currentUserId,
  error,
  onSend,
  onHide,
}: {
  messages: ChatMessage[];
  currentUserId: string;
  error: string | null;
  onSend: (body: string) => void;
  onHide: () => void;
}) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    onSend(body);
    setDraft('');
  }

  return (
    <section
      aria-label="Chat"
      className="flex h-[340px] max-h-[calc(100vh-100px)] w-[min(320px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl bg-black/60 text-white backdrop-blur-md"
    >
      <header className="flex items-center justify-between border-b border-white/8 px-3.5 py-2.5">
        <span className="text-[13px] font-extrabold">Chat</span>
        <button
          type="button"
          onClick={onHide}
          className="cursor-pointer text-xs font-bold text-white/60 hover:text-white"
        >
          Hide
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3.5 py-2.5">
        {messages.length === 0 ? (
          <p className="text-[13px] text-white/50">No messages yet — say something.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((message, index) => (
              <p
                key={`${message.sent_at}-${index}`}
                className="text-[13px] leading-snug break-words"
              >
                <span
                  className="mr-1.5 font-extrabold"
                  style={{ color: avatarColorFor(message.sender_id) }}
                >
                  {message.sender_id === currentUserId ? 'You' : message.sender_username}
                </span>
                {message.body}
                <span className="ml-1.5 text-[10px] text-white/40">
                  {formatTime(message.sent_at)}
                </span>
              </p>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && <p className="px-3.5 pb-2 text-xs text-red-400">{error}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-white/8 p-2.5">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_BODY_LENGTH}
          placeholder="Say something…"
          className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/6 px-3.5 py-2 text-[13px] text-white outline-none placeholder:text-white/45 focus:border-accent focus:ring-3 focus:ring-accent/25"
        />
        <button
          type="submit"
          disabled={draft.trim().length === 0}
          className="cursor-pointer rounded-full bg-accent px-3.5 text-[13px] font-extrabold text-white disabled:cursor-default disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </section>
  );
}
