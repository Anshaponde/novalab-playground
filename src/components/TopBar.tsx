"use client";

import React from "react";
import {
  Activity,
  BookMarked,
  Columns2,
  MessageSquare,
  Moon,
  PanelLeft,
  ShieldAlert,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import type { ConnectionStatus, ViewMode } from "@/lib/types";
import { NovaLogo } from "./NovaLogo";

interface TopBarProps {
  activeView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  status: ConnectionStatus;
  apiConfigured: boolean | null;
  liveTps: number | null;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onToggleHistoryDrawer: () => void;
  onToggleSettingsDrawer: () => void;
}

const NAV_ITEMS: Array<{
  id: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "compare", label: "Compare", icon: Columns2 },
  { id: "analyzer", label: "Analyzer", icon: ShieldAlert },
  { id: "library", label: "Library", icon: BookMarked },
];

export function TopBar({
  activeView,
  onSelectView,
  status,
  apiConfigured,
  liveTps,
  theme,
  onToggleTheme,
  onToggleHistoryDrawer,
  onToggleSettingsDrawer,
}: TopBarProps) {
  const statusConfig = {
    connecting: {
      label: "Connecting",
      dotClass: "bg-amber-400",
      ringClass: "bg-amber-400",
      textClass: "text-amber-300",
    },
    ready: {
      label: "Ready",
      dotClass: "bg-[#22D3EE]",
      ringClass: "bg-[#22D3EE]",
      textClass: "text-[#22D3EE]",
    },
    working: {
      label: "Working",
      dotClass: "bg-[#EC4899]",
      ringClass: "bg-[#EC4899]",
      textClass: "text-[#EC4899]",
    },
    error: {
      label: "Attention",
      dotClass: "bg-rose-500",
      ringClass: "bg-rose-500",
      textClass: "text-rose-400",
    },
  }[status];

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--nl-border-subtle)] bg-[var(--nl-bg-elevated)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
        {/* Brand + Mobile Chat Drawers */}
        <div className="flex items-center gap-2.5">
          {activeView === "chat" && (
            <button
              type="button"
              onClick={onToggleHistoryDrawer}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-card)] text-[var(--nl-text-muted)] hover:border-[#8B5CF6]/50 hover:text-[var(--nl-text)] lg:hidden transition-colors"
              aria-label="Toggle chat history"
              title="Chat history"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <NovaLogo className="h-8 w-8 shrink-0" />
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#22D3EE] bg-clip-text text-transparent">
                  NovaLab
                </span>
                <span className="hidden text-sm font-medium text-[var(--nl-text-muted)] sm:inline">
                  Playground
                </span>
              </div>
              <p className="hidden text-[10px] font-mono uppercase tracking-widest text-[var(--nl-text-muted)] sm:block">
                Neon Inference Lab
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav
          aria-label="Primary Views"
          className="order-3 flex w-full items-center justify-between gap-1 rounded-2xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] p-1 sm:order-2 sm:w-auto sm:justify-center"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`relative flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-[#8B5CF6]/25 via-[#EC4899]/20 to-[#22D3EE]/20 text-[var(--nl-text)] shadow-[0_0_20px_-6px_rgba(139,92,246,0.7)] border border-[#8B5CF6]/45"
                    : "text-[var(--nl-text-muted)] hover:text-[var(--nl-text)] hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#22D3EE]" : ""}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Telemetry & Controls */}
        <div className="order-2 flex items-center gap-2 sm:order-3">
          {/* Live TPS Readout */}
          <div
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] px-2.5 py-1.5 font-mono text-xs"
            title="Live generation throughput (tokens per second)"
          >
            <Activity className="h-3.5 w-3.5 text-[#22D3EE]" />
            <span className="text-[var(--nl-text)] font-semibold">
              {liveTps !== null ? liveTps.toFixed(1) : "0.0"}
            </span>
            <span className="text-[var(--nl-text-muted)]">tok/s</span>
          </div>

          {/* Status Indicator */}
          <div
            className="flex items-center gap-2 rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-input)] px-2.5 py-1.5 text-xs font-medium"
            title={
              apiConfigured === false
                ? "Server is reachable, but GROQ_API_KEY is not set in environment."
                : `Engine status: ${statusConfig.label}`
            }
          >
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-pulse-ring ${statusConfig.ringClass}`}
              />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${statusConfig.dotClass}`} />
            </span>
            <span className={statusConfig.textClass}>{statusConfig.label}</span>
            {apiConfigured === false && (
              <span className="hidden md:inline rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-400 border border-amber-500/30">
                No Key
              </span>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-card)] text-[var(--nl-text-muted)] hover:border-[#EC4899]/50 hover:text-[var(--nl-text)] transition-colors"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-[#22D3EE]" />
            ) : (
              <Moon className="h-4 w-4 text-[#8B5CF6]" />
            )}
          </button>

          {activeView === "chat" && (
            <button
              type="button"
              onClick={onToggleSettingsDrawer}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--nl-border-subtle)] bg-[var(--nl-bg-card)] text-[var(--nl-text-muted)] hover:border-[#22D3EE]/50 hover:text-[var(--nl-text)] xl:hidden transition-colors"
              aria-label="Toggle run settings"
              title="Run settings"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
