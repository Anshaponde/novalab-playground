"use client";

import React, { useState } from "react";
import { Check, MessageSquarePlus, Pencil, Search, Trash2, X } from "lucide-react";
import type { ChatSession } from "@/lib/types";

interface ChatHistorySidebarProps {
  chats: ChatSession[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onRenameChat: (id: string, title: string) => void;
  onDeleteChat: (id: string) => void;
}

export function ChatHistorySidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
}: ChatHistorySidebarProps) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const filtered = chats.filter((chat) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      chat.title.toLowerCase().includes(q) ||
      chat.systemPrompt.toLowerCase().includes(q) ||
      chat.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  const startEditing = (chat: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setDraftTitle(chat.title);
  };

  const commitRename = (id: string) => {
    const trimmed = draftTitle.trim();
    if (trimmed) {
      onRenameChat(id, trimmed);
    }
    setEditingId(null);
  };

  return (
    <div className="flex h-full flex-col gap-3 p-3.5">
      <button
        type="button"
        onClick={onNewChat}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#8B5CF6] bg-[length:200%_100%] px-3 py-2.5 text-xs font-semibold text-white shadow-[0_0_24px_-6px_rgba(236,72,153,0.7)] hover:brightness-110 transition-all"
      >
        <MessageSquarePlus className="h-4 w-4" />
        New Chat Session
      </button>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--nl-text-muted)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chat history..."
          className="neon-focus w-full rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] py-2 pl-8 pr-3 text-xs text-[var(--nl-text)] placeholder:text-[var(--nl-text-muted)]"
        />
      </div>

      {/* Chat List */}
      <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--nl-border-subtle)] p-4 text-center text-xs text-[var(--nl-text-muted)]">
            {query ? "No matching sessions." : "No chat sessions yet."}
          </div>
        ) : (
          filtered.map((chat) => {
            const isActive = chat.id === activeChatId;
            const isEditing = editingId === chat.id;

            return (
              <div
                key={chat.id}
                onClick={() => !isEditing && onSelectChat(chat.id)}
                className={`group flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-all ${
                  isActive
                    ? "border-[#8B5CF6]/55 bg-gradient-to-r from-[#8B5CF6]/20 to-[#EC4899]/10 shadow-[0_0_18px_-8px_rgba(139,92,246,0.75)]"
                    : "border-transparent hover:border-[var(--nl-border-subtle)] hover:bg-white/[0.04]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        autoFocus
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(chat.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-full rounded-md border border-[#22D3EE]/60 bg-[var(--nl-bg-input)] px-2 py-0.5 text-xs text-[var(--nl-text)] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => commitRename(chat.id)}
                        className="rounded p-1 text-[#22D3EE] hover:bg-white/10"
                        aria-label="Save title"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded p-1 text-[var(--nl-text-muted)] hover:bg-white/10"
                        aria-label="Cancel rename"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="truncate text-xs font-medium text-[var(--nl-text)]">
                        {chat.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-[var(--nl-text-muted)]">
                        <span>{chat.messages.length} msgs</span>
                        <span>•</span>
                        <span>
                          {new Date(chat.updatedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => startEditing(chat, e)}
                      className="rounded-lg p-1.5 text-[var(--nl-text-muted)] hover:bg-white/10 hover:text-[#22D3EE]"
                      title="Rename chat"
                      aria-label="Rename chat"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="rounded-lg p-1.5 text-[var(--nl-text-muted)] hover:bg-rose-500/15 hover:text-rose-400"
                      title="Delete chat"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
