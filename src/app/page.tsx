"use client";

import React, { useEffect, useState } from "react";
import { AnalyzerView } from "@/components/AnalyzerView";
import { ChatView } from "@/components/ChatView";
import { CompareView } from "@/components/CompareView";
import { LibraryView } from "@/components/LibraryView";
import { TopBar } from "@/components/TopBar";
import {
  createNewChatSession,
  loadActiveChatId,
  loadChats,
  loadTemplates,
  loadThemePreference,
  saveActiveChatId,
  saveChats,
  saveTemplates,
  saveThemePreference,
} from "@/lib/storage";
import type { ChatSession, ConnectionStatus, PromptTemplate, ViewMode } from "@/lib/types";

export default function HomePage() {
  const [hydrated, setHydrated] = useState(false);
  const [activeView, setActiveView] = useState<ViewMode>("chat");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [apiConfigured, setApiConfigured] = useState<boolean | null>(null);
  const [liveTps, setLiveTps] = useState<number | null>(null);

  const [chats, setChats] = useState<ChatSession[]>(() => [createNewChatSession()]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [draftPrompt, setDraftPrompt] = useState<string>("");
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);

  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);

  // Hydrate client state from localStorage
  useEffect(() => {
    const storedTheme = loadThemePreference();
    setTheme(storedTheme);

    const storedChats = loadChats();
    if (storedChats.length > 0) {
      setChats(storedChats);
      const savedActiveId = loadActiveChatId();
      const exists = storedChats.some((c) => c.id === savedActiveId);
      setActiveChatId(exists && savedActiveId ? savedActiveId : storedChats[0].id);
    } else {
      const initial = createNewChatSession();
      setChats([initial]);
      setActiveChatId(initial.id);
      saveChats([initial]);
      saveActiveChatId(initial.id);
    }

    setTemplates(loadTemplates());
    setHydrated(true);
  }, []);

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    if (hydrated) {
      saveThemePreference(theme);
    }
  }, [theme, hydrated]);

  // Persist chats when modified
  useEffect(() => {
    if (!hydrated) return;
    saveChats(chats);
  }, [chats, hydrated]);

  useEffect(() => {
    if (!hydrated || !activeChatId) return;
    saveActiveChatId(activeChatId);
  }, [activeChatId, hydrated]);

  // Persist templates
  useEffect(() => {
    if (!hydrated) return;
    saveTemplates(templates);
  }, [templates, hydrated]);

  // Check server health & GROQ_API_KEY configuration
  useEffect(() => {
    let active = true;
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setApiConfigured(Boolean(data?.configured));
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setApiConfigured(false);
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const activeChat =
    chats.find((c) => c.id === activeChatId) ?? chats[0] ?? createNewChatSession();

  const handleNewChat = () => {
    const next = createNewChatSession({
      settings: { ...activeChat.settings },
    });
    setChats((prev) => [next, ...prev]);
    setActiveChatId(next.id);
    setDraftPrompt("");
  };

  const handleRenameChat = (id: string, title: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c))
    );
  };

  const handleDeleteChat = (id: string) => {
    setChats((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        const fallback = createNewChatSession();
        setActiveChatId(fallback.id);
        return [fallback];
      }
      if (activeChatId === id) {
        setActiveChatId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleUpdateChat = (
    id: string,
    updater: (chat: ChatSession) => ChatSession
  ) => {
    setChats((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  };

  const handleCreateTemplate = (
    tpl: Omit<PromptTemplate, "id" | "createdAt" | "updatedAt">
  ) => {
    const now = Date.now();
    const created: PromptTemplate = {
      ...tpl,
      id: `tpl-${now}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    setTemplates((prev) => [created, ...prev]);
  };

  const handleUpdateTemplate = (
    id: string,
    patch: Omit<PromptTemplate, "id" | "createdAt" | "updatedAt">
  ) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t))
    );
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveFromChat = (systemPrompt: string, userPrompt: string) => {
    handleCreateTemplate({
      title: activeChat.title !== "Untitled Session" ? activeChat.title : "Saved Chat Prompt",
      category: "Chat Export",
      description: "Saved directly from Chat Playground.",
      systemPrompt,
      userPrompt,
    });
  };

  const handleLoadIntoChat = (
    systemPrompt: string,
    userPrompt: string,
    title?: string
  ) => {
    const newSession = createNewChatSession({
      title: title || "Template Session",
      systemPrompt: systemPrompt || activeChat.systemPrompt,
      settings: { ...activeChat.settings },
    });
    setChats((prev) => [newSession, ...prev]);
    setActiveChatId(newSession.id);
    setDraftPrompt(userPrompt);
    setActiveView("chat");
  };

  return (
    <div className="cyber-backdrop min-h-dvh flex flex-col">
      <TopBar
        activeView={activeView}
        onSelectView={setActiveView}
        status={status}
        apiConfigured={apiConfigured}
        liveTps={liveTps}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
        onToggleHistoryDrawer={() => setHistoryDrawerOpen((p) => !p)}
        onToggleSettingsDrawer={() => setSettingsDrawerOpen((p) => !p)}
      />

      {apiConfigured === false && (
        <div className="mx-auto mt-2 w-full max-w-[1680px] px-3 sm:px-5">
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Server key missing:</strong> Set{" "}
              <code className="font-mono text-[#22D3EE]">GROQ_API_KEY</code> in{" "}
              <code className="font-mono text-[#22D3EE]">.env.local</code> to enable live streaming inference.
            </span>
          </div>
        </div>
      )}

      <main className="flex-1">
        {activeView === "chat" && (
          <ChatView
            chats={chats}
            activeChat={activeChat}
            onSelectChat={setActiveChatId}
            onNewChat={handleNewChat}
            onRenameChat={handleRenameChat}
            onDeleteChat={handleDeleteChat}
            onUpdateChat={handleUpdateChat}
            draftPrompt={draftPrompt}
            onDraftPromptChange={setDraftPrompt}
            onStatusChange={setStatus}
            onLiveTpsChange={setLiveTps}
            onSaveToLibrary={handleSaveFromChat}
            historyDrawerOpen={historyDrawerOpen}
            onCloseHistoryDrawer={() => setHistoryDrawerOpen(false)}
            settingsDrawerOpen={settingsDrawerOpen}
            onCloseSettingsDrawer={() => setSettingsDrawerOpen(false)}
          />
        )}

        {activeView === "compare" && (
          <CompareView
            onStatusChange={setStatus}
            onLiveTpsChange={setLiveTps}
          />
        )}

        {activeView === "analyzer" && (
          <AnalyzerView
            onStatusChange={setStatus}
            onLoadIntoChat={handleLoadIntoChat}
          />
        )}

        {activeView === "library" && (
          <LibraryView
            templates={templates}
            onCreateTemplate={handleCreateTemplate}
            onUpdateTemplate={handleUpdateTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onLoadIntoChat={handleLoadIntoChat}
          />
        )}
      </main>
    </div>
  );
}
