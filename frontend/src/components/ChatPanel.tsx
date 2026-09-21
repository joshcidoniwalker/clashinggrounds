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
}: {
  messages: ChatMessage[];
  currentUserId: string;
  error: string | null;
  onSend: (body: string) => void;
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
    <div className="flex h-[440px] flex-col rounded-2xl border border-[#2C2C34] bg-[#1B1B20]">
      <div className="flex-1 overflow-y-auto px-4.5 py-4">
        {messages.length === 0 ? (
          <p className="text-sm text-[#6E6E78]">No messages yet — say something.</p>
        ) : (
          <div className="flex flex-col gap-3.5">
            {messages.map((message, index) => (
              <div key={`${message.sent_at}-${index}`} className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ background: avatarColorFor(message.sender_id) }}
                >
                  <span className="font-display text-[11px] font-bold text-white">
                    {message.sender_username[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-bold text-foreground">
                      {message.sender_id === currentUserId ? 'You' : message.sender_username}
                    </span>
                    <span className="text-[11px] text-[#6E6E78]">
                      {formatTime(message.sent_at)}
                    </span>
                  </div>
                  <p className="text-sm break-words text-[#C9C9D1]">{message.body}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && <p className="px-4.5 pb-2 text-xs text-red-400">{error}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2.5 border-t border-[#2C2C34] p-3.5">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_BODY_LENGTH}
          placeholder="Message the room…"
          className="flex-1 rounded-xl border border-[#34343D] bg-[#232329] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-3 focus:ring-accent/25"
        />
        <button
          type="submit"
          disabled={draft.trim().length === 0}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
