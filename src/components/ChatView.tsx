"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  CornerDownLeft,
  Cpu,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { DEFAULT_SYSTEM_PROMPT, getModelInfo } from "@/lib/models";
import { streamChatCompletion } from "@/lib/stream";
import { estimateRequestInputTokens, estimateTextTokens } from "@/lib/tokens";
import type { ChatMessage, ChatSession, ConnectionStatus, RunSettings } from "@/lib/types";
import { ChatHistorySidebar } from "./ChatHistorySidebar";
import { MarkdownLite } from "./MarkdownLite";
import { RunSettingsPanel } from "./RunSettingsPanel";

interface ChatViewProps {
  chats: ChatSession[];
  activeChat: ChatSession;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onRenameChat: (id: string, title: string) => void;
  onDeleteChat: (id: string) => void;
  onUpdateChat: (id: string, updater: (chat: ChatSession) => ChatSession) => void;
  draftPrompt: string;
  onDraftPromptChange: (value: string) => void;
  onStatusChange: (status: ConnectionStatus) => void;
  onLiveTpsChange: (tps: number | null) => void;
  onSaveToLibrary: (systemPrompt: string, userPrompt: string) => void;
  historyDrawerOpen: boolean;
  onCloseHistoryDrawer: () => void;
  settingsDrawerOpen: boolean;
  onCloseSettingsDrawer: () => void;
}

const STARTER_PROMPTS = [
  "Design a zero-downtime Postgres migration strategy for adding a NOT NULL column to a 200M-row table.",
  "Write a TypeScript rate limiter using a sliding window algorithm with clean unit test cases.",
  "Explain how KV-cache quantization reduces LLM inference memory bandwidth.",
];

function extractThinkAndContent(raw: string, explicitReasoning?: string) {
  let reasoning = explicitReasoning || "";
  let content = raw;
  const thinkMatch = raw.match(/<think>([\s\S]*?)(<\/think>|$)/);
  if (thinkMatch) {
    reasoning = reasoning || thinkMatch[1].trim();
    content = raw.replace(/<think>[\s\S]*?(<\/think>|$)/, "").trim();
  }
  return { reasoning, content };
}

export function ChatView({
  chats,
  activeChat,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  onUpdateChat,
  draftPrompt,
  onDraftPromptChange,
  onStatusChange,
  onLiveTpsChange,
  onSaveToLibrary,
  historyDrawerOpen,
  onCloseHistoryDrawer,
  settingsDrawerOpen,
  onCloseSettingsDrawer,
}: ChatViewProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [systemExpanded, setSystemExpanded] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const [savedNotice, setSavedNotice] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const estimatedInputTokens = useMemo(
    () =>
      estimateRequestInputTokens(
        activeChat.systemPrompt,
        activeChat.messages,
        draftPrompt
      ),
    [activeChat.systemPrompt, activeChat.messages, draftPrompt]
  );

  const systemTokens = useMemo(
    () => estimateTextTokens(activeChat.systemPrompt),
    [activeChat.systemPrompt]
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat.messages.length, isStreaming]);

  // Global Escape key to stop generation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isStreaming) {
        e.preventDefault();
        abortRef.current?.abort();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isStreaming]);

  // Auto-resize composer textarea
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [draftPrompt]);

  const stopGeneration = () => {
    abortRef.current?.abort();
  };

  const handleSend = async (overrideText?: string) => {
    const promptText = (overrideText ?? draftPrompt).trim();
    if (!promptText || isStreaming) return;

    setErrorBanner(null);
    if (!overrideText) {
      onDraftPromptChange("");
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: "user",
      content: promptText,
      createdAt: Date.now(),
    };

    const assistantId = `msg-${Date.now()}-a`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      reasoning: "",
      createdAt: Date.now(),
      model: activeChat.settings.model,
    };

    const priorMessages = activeChat.messages;
    const chatId = activeChat.id;
    const nextTitle =
      activeChat.title === "Untitled Session" && priorMessages.length === 0
        ? promptText.slice(0, 42) + (promptText.length > 42 ? "…" : "")
        : activeChat.title;

    onUpdateChat(chatId, (chat) => ({
      ...chat,
      title: nextTitle,
      updatedAt: Date.now(),
      messages: [...chat.messages, userMessage, assistantPlaceholder],
    }));

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);
    onStatusChange("working");
    onLiveTpsChange(0);

    try {
      const apiMessages = [...priorMessages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const usage = await streamChatCompletion({
        messages: apiMessages,
        systemPrompt: activeChat.systemPrompt,
        settings: activeChat.settings,
        signal: controller.signal,
        onLiveTps: (tps) => onLiveTpsChange(tps),
        onDelta: ({ content, reasoning }) => {
          onUpdateChat(chatId, (chat) => ({
            ...chat,
            updatedAt: Date.now(),
            messages: chat.messages.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: m.content + content,
                    reasoning: (m.reasoning ?? "") + reasoning,
                  }
                : m
            ),
          }));
        },
      });

      onLiveTpsChange(usage.tokensPerSecond);
      onUpdateChat(chatId, (chat) => ({
        ...chat,
        updatedAt: Date.now(),
        messages: chat.messages.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                stats: usage,
              }
            : m
        ),
      }));
      onStatusChange("ready");
    } catch (err) {
      if (controller.signal.aborted) {
        onStatusChange("ready");
      } else {
        const message = err instanceof Error ? err.message : "Failed to stream response.";
        setErrorBanner(message);
        onStatusChange("error");
        // Remove empty placeholder if nothing was streamed
        onUpdateChat(chatId, (chat) => ({
          ...chat,
          messages: chat.messages.filter(
            (m) => m.id !== assistantId || m.content.trim().length > 0
          ),
        }));
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === "Escape" && isStreaming) {
      e.preventDefault();
      stopGeneration();
    }
  };

  const copyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  const handleSaveTemplate = () => {
    onSaveToLibrary(activeChat.systemPrompt, draftPrompt);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-64px)] max-w-[1680px] gap-3 p-3 sm:p-4 overflow-hidden">
      {/* Desktop History Sidebar */}
      <aside className="hidden lg:flex w-72 shrink-0 flex-col rounded-2xl glass-card overflow-hidden">
        <ChatHistorySidebar
          chats={chats}
          activeChatId={activeChat.id}
          onSelectChat={onSelectChat}
          onNewChat={onNewChat}
          onRenameChat={onRenameChat}
          onDeleteChat={onDeleteChat}
        />
      </aside>

      {/* Mobile History Drawer */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseHistoryDrawer}
          />
          <div className="relative z-10 flex h-full w-80 max-w-[85vw] flex-col glass-card border-r border-[#8B5CF6]/40">
            <div className="flex items-center justify-between border-b border-[var(--nl-border-subtle)] px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#22D3EE]">
                Chat History
              </span>
              <button
                type="button"
                onClick={onCloseHistoryDrawer}
                className="rounded-lg p-1 text-[var(--nl-text-muted)] hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatHistorySidebar
                chats={chats}
                activeChatId={activeChat.id}
                onSelectChat={(id) => {
                  onSelectChat(id);
                  onCloseHistoryDrawer();
                }}
                onNewChat={() => {
                  onNewChat();
                  onCloseHistoryDrawer();
                }}
                onRenameChat={onRenameChat}
                onDeleteChat={onDeleteChat}
              />
            </div>
          </div>
        </div>
      )}

      {/* Center Main Chat Canvas */}
      <section className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden">
        {/* Editable System Prompt Card */}
        <div className="neon-gradient-border rounded-2xl p-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSystemExpanded((prev) => !prev)}
              className="flex items-center gap-2 text-left"
            >
              <Sparkles className="h-4 w-4 text-[#8B5CF6]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--nl-text)]">
                System Prompt
              </span>
              <span className="rounded-md bg-[#8B5CF6]/15 px-1.5 py-0.5 font-mono text-[10px] text-[#22D3EE] border border-[#8B5CF6]/30">
                ~{systemTokens} tok
              </span>
              {systemExpanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-[var(--nl-text-muted)]" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-[var(--nl-text-muted)]" />
              )}
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--nl-border-subtle)] px-2 py-1 text-[11px] font-medium text-[var(--nl-text-muted)] hover:border-[#22D3EE]/50 hover:text-[#22D3EE] transition-colors"
                title="Save current system & user prompt to Library"
              >
                {savedNotice ? (
                  <>
                    <Check className="h-3 w-3 text-[#22D3EE]" />
                    Saved
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="h-3 w-3" />
                    <span className="hidden sm:inline">Save Template</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateChat(activeChat.id, (c) => ({
                    ...c,
                    systemPrompt: DEFAULT_SYSTEM_PROMPT,
                    updatedAt: Date.now(),
                  }))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--nl-border-subtle)] px-2 py-1 text-[11px] font-medium text-[var(--nl-text-muted)] hover:border-[#EC4899]/50 hover:text-[var(--nl-text)] transition-colors"
                title="Reset system prompt to default"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
              {activeChat.messages.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateChat(activeChat.id, (c) => ({
                      ...c,
                      messages: [],
                      updatedAt: Date.now(),
                    }))
                  }
                  disabled={isStreaming}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--nl-border-subtle)] px-2 py-1 text-[11px] font-medium text-[var(--nl-text-muted)] hover:border-rose-500/50 hover:text-rose-400 disabled:opacity-40 transition-colors"
                  title="Clear messages in this session"
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          </div>

          {systemExpanded && (
            <textarea
              value={activeChat.systemPrompt}
              onChange={(e) =>
                onUpdateChat(activeChat.id, (c) => ({
                  ...c,
                  systemPrompt: e.target.value,
                  updatedAt: Date.now(),
                }))
              }
              rows={2}
              placeholder="Define model persona, constraints, formatting rules, and boundaries..."
              className="neon-focus mt-2.5 w-full resize-y rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] p-2.5 font-mono text-xs leading-relaxed text-[var(--nl-text)] placeholder:text-[var(--nl-text-muted)]"
            />
          )}
        </div>

        {/* Messages Area */}
        <div className="glass-card relative flex-1 overflow-y-auto rounded-2xl p-4 sm:p-5">
          {errorBanner && (
            <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
              <span>{errorBanner}</span>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                className="rounded p-0.5 hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {activeChat.messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-8">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#8B5CF6]/40 bg-gradient-to-br from-[#8B5CF6]/20 via-[#EC4899]/15 to-[#22D3EE]/20 shadow-[0_0_30px_-8px_rgba(139,92,246,0.75)]">
                <Cpu className="h-6 w-6 text-[#22D3EE]" />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-[var(--nl-text)]">
                Ready for Prompt Execution
              </h2>
              <p className="mt-1 max-w-md text-xs text-[var(--nl-text-muted)]">
                Running{" "}
                <span className="font-mono text-[#22D3EE]">
                  {getModelInfo(activeChat.settings.model).name}
                </span>
                . Press <kbd className="rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> to send,{" "}
                <kbd className="rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px]">Shift+Enter</kbd> for newline,{" "}
                <kbd className="rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> to abort.
              </p>

              <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-3">
                {STARTER_PROMPTS.map((starter, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(starter)}
                    className="neon-focus group rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] p-3 text-left text-xs text-[var(--nl-text-muted)] hover:text-[var(--nl-text)]"
                  >
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[#EC4899] group-hover:text-[#22D3EE] transition-colors">
                      Prompt #{idx + 1}
                    </div>
                    <p className="line-clamp-3 leading-relaxed">{starter}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeChat.messages.map((msg) => {
                const isUser = msg.role === "user";
                const parsed = !isUser
                  ? extractThinkAndContent(msg.content, msg.reasoning)
                  : { reasoning: "", content: msg.content };

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`group relative max-w-[92%] sm:max-w-[82%] rounded-2xl px-4 py-3 ${
                        isUser
                          ? "border border-[#EC4899]/40 bg-gradient-to-br from-[#8B5CF6]/20 via-[#EC4899]/15 to-transparent text-[var(--nl-text)]"
                          : "neon-gradient-border text-[var(--nl-text)]"
                      }`}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-4 text-[10px] font-mono uppercase tracking-wider text-[var(--nl-text-muted)]">
                        <span className={isUser ? "text-[#EC4899]" : "text-[#22D3EE]"}>
                          {isUser ? "User" : getModelInfo(msg.model ?? activeChat.settings.model).name}
                        </span>

                        <div className="flex items-center gap-2">
                          {msg.stats && (
                            <span className="hidden sm:inline text-[10px] text-[var(--nl-text-muted)]">
                              {msg.stats.tokensPerSecond} tok/s ·{" "}
                              {(msg.stats.latencyMs! / 1000).toFixed(2)}s ·{" "}
                              {msg.stats.totalTokens} tok
                            </span>
                          )}
                          {msg.content && (
                            <button
                              type="button"
                              onClick={() => copyMessage(msg.id, msg.content)}
                              className="rounded p-1 hover:bg-white/10 hover:text-[var(--nl-text)] transition-colors"
                              aria-label="Copy message"
                            >
                              {copiedId === msg.id ? (
                                <Check className="h-3 w-3 text-[#22D3EE]" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {!isUser && parsed.reasoning && (
                        <div className="mb-2.5 rounded-xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-3 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedReasoning((prev) => ({
                                ...prev,
                                [msg.id]: !prev[msg.id],
                              }))
                            }
                            className="flex w-full items-center justify-between text-[11px] font-mono text-[#8B5CF6]"
                          >
                            <span>Reasoning Trace</span>
                            {expandedReasoning[msg.id] ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                          {expandedReasoning[msg.id] && (
                            <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[var(--nl-text-muted)]">
                              {parsed.reasoning}
                            </pre>
                          )}
                        </div>
                      )}

                      {isUser ? (
                        <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm leading-relaxed">
                          {msg.content}
                        </pre>
                      ) : parsed.content ? (
                        <MarkdownLite content={parsed.content} />
                      ) : (
                        <div className="flex items-center gap-2 py-1 text-xs font-mono text-[#22D3EE]">
                          <span className="h-2 w-2 animate-ping rounded-full bg-[#22D3EE]" />
                          Streaming tokens...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={scrollEndRef} />
            </div>
          )}
        </div>

        {/* User Prompt Composer */}
        <div className="neon-gradient-border rounded-2xl p-3">
          <div className="flex items-end gap-2.5">
            <textarea
              ref={composerRef}
              value={draftPrompt}
              onChange={(e) => onDraftPromptChange(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={2}
              placeholder="Write your prompt here... (Enter to send, Shift+Enter for new line, Esc to stop)"
              className="neon-focus max-h-56 min-h-[54px] flex-1 resize-none rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] px-3.5 py-2.5 font-mono text-xs sm:text-sm leading-relaxed text-[var(--nl-text)] placeholder:text-[var(--nl-text-muted)]"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={stopGeneration}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-rose-600 px-4 text-xs font-semibold text-white shadow-[0_0_24px_-4px_rgba(236,72,153,0.85)] hover:brightness-110 transition-all"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!draftPrompt.trim()}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#22D3EE] px-4 text-xs font-semibold text-white shadow-[0_0_24px_-4px_rgba(139,92,246,0.8)] hover:brightness-110 disabled:opacity-40 disabled:shadow-none transition-all"
              >
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[var(--nl-text-muted)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3 text-[#22D3EE]" /> Send
              </span>
              <span>Shift+Enter: Newline</span>
              <span>Esc: Stop</span>
            </div>
            <span>
              Draft: ~{estimateTextTokens(draftPrompt)} tok · Next req: ~
              {estimatedInputTokens.toLocaleString()} tok
            </span>
          </div>
        </div>
      </section>

      {/* Desktop Run Settings Panel */}
      <aside className="hidden xl:flex w-80 shrink-0 flex-col rounded-2xl glass-card overflow-hidden">
        <RunSettingsPanel
          settings={activeChat.settings}
          onChange={(nextSettings: RunSettings) =>
            onUpdateChat(activeChat.id, (c) => ({
              ...c,
              settings: nextSettings,
              updatedAt: Date.now(),
            }))
          }
          estimatedInputTokens={estimatedInputTokens}
        />
      </aside>

      {/* Mobile/Tablet Run Settings Drawer */}
      {settingsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end xl:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseSettingsDrawer}
          />
          <div className="relative z-10 flex h-full w-80 max-w-[88vw] flex-col glass-card border-l border-[#22D3EE]/40">
            <div className="flex items-center justify-between border-b border-[var(--nl-border-subtle)] px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#22D3EE]">
                Run Settings
              </span>
              <button
                type="button"
                onClick={onCloseSettingsDrawer}
                className="rounded-lg p-1 text-[var(--nl-text-muted)] hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <RunSettingsPanel
                settings={activeChat.settings}
                onChange={(nextSettings: RunSettings) =>
                  onUpdateChat(activeChat.id, (c) => ({
                    ...c,
                    settings: nextSettings,
                    updatedAt: Date.now(),
                  }))
                }
                estimatedInputTokens={estimatedInputTokens}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
